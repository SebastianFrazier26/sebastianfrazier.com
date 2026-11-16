import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

// A pattern scan instead of gitleaks: no binary to download and checksum in
// CI, runs offline in the tests, and reviewable in one screen. It covers the
// credential shapes these repos could plausibly hold plus generic
// password/secret assignments (the famgo seed-data risk); it will miss
// exotic token formats gitleaks knows. History is never shipped, so only the
// tree at the built commit matters.
export const SECRET_RULES: readonly { id: string; re: RegExp }[] = [
	{ id: "aws-access-key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
	{
		id: "github-token",
		re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/,
	},
	{ id: "llm-api-key", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}/ },
	{ id: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
	{ id: "slack-token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
	{ id: "stripe-live-key", re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{20,}/ },
	{ id: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
	{
		id: "url-credentials",
		re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:[^\s:/@'"]{3,}@[^\s'"]+/i,
	},
	{
		id: "password-assignment",
		re: /\b(?:password|passwd|pwd|secret|api[_-]?key|auth[_-]?token)\b["']?\s*[:=]\s*["'][^"'\s]{6,}["']/i,
	},
];

export interface SecretHit {
	file: string;
	line: number;
	rule: string;
}

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

async function* walk(dir: string): AsyncGenerator<string> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

/** Pure, for one file's text. Hits carry the rule and line only — never the matched value, which must not land in CI logs. */
export function scanText(file: string, text: string): SecretHit[] {
	const hits: SecretHit[] = [];
	const lines = text.split("\n");
	for (const [i, line] of lines.entries()) {
		for (const rule of SECRET_RULES) {
			if (rule.re.test(line)) hits.push({ file, line: i + 1, rule: rule.id });
		}
	}
	return hits;
}

export async function scanTree(root: string): Promise<SecretHit[]> {
	const hits: SecretHit[] = [];
	for await (const file of walk(root)) {
		if ((await stat(file)).size > MAX_SCAN_BYTES) continue;
		const buf = await readFile(file);
		if (buf.includes(0)) continue;
		const rel = relative(root, file).split(sep).join("/");
		hits.push(...scanText(rel, buf.toString("utf8")));
	}
	return hits;
}
