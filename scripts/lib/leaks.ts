import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export interface LeakReport {
	errors: string[];
	warnings: string[];
}

async function listFiles(dir: string): Promise<string[]> {
	const out: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await listFiles(full)));
		else if (entry.isFile()) out.push(full);
	}
	return out;
}

function* strings(value: unknown): Generator<string> {
	if (typeof value === "string") yield value;
	else if (Array.isArray(value)) for (const v of value) yield* strings(v);
	else if (value && typeof value === "object")
		for (const [k, v] of Object.entries(value)) {
			yield k;
			yield* strings(v);
		}
}

const TEXT_EXT = /\.(json|txt|md|seyn)$/i;

/**
 * Checks one built world. `forbidden` are build-machine paths (the temp
 * extract, the checkout) that must never appear in any text the world
 * ships; `excluded` are repo paths that were filtered out and must not show
 * up as a path anywhere — not as a file, not as a JSON key or value.
 * `soft` paths (the home directory) only warn: a public repo may legitimately
 * mention its author's own home path in its content.
 */
export async function scanWorld(
	worldDir: string,
	opts: { forbidden: string[]; soft?: string[]; excluded: string[] },
): Promise<LeakReport> {
	const report: LeakReport = { errors: [], warnings: [] };
	const excluded = new Set(opts.excluded);
	for (const file of await listFiles(worldDir)) {
		const rel = relative(worldDir, file).split(sep).join("/");
		for (const path of excluded) {
			if (rel === path || rel.endsWith(`/${path}`)) {
				report.errors.push(`${rel}: excluded path shipped as a file`);
			}
		}
		if (!TEXT_EXT.test(file)) continue;
		const text = await readFile(file, "utf8");
		for (const bad of opts.forbidden) {
			if (bad && text.includes(bad))
				report.errors.push(`${rel}: contains build path ${bad}`);
		}
		for (const soft of opts.soft ?? []) {
			if (soft && text.includes(soft))
				report.warnings.push(`${rel}: mentions ${soft}`);
		}
		if (excluded.size === 0 || !rel.endsWith(".json")) continue;
		let json: unknown;
		try {
			json = JSON.parse(text);
		} catch {
			continue;
		}
		for (const s of strings(json)) {
			if (excluded.has(s)) {
				report.errors.push(`${rel}: references excluded path ${s}`);
				break;
			}
		}
	}
	return report;
}
