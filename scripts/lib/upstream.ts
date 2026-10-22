import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DeployManifest } from "./manifest.ts";
import type { Project } from "./projects.ts";

export type ChangeReason =
	| { id: string; kind: "new"; sha: string }
	| { id: string; kind: "updated"; from: string; to: string }
	| { id: string; kind: "removed" };

export interface UpstreamDiff {
	changed: boolean;
	/** Why a rebuild is needed even with no per-project reason. */
	global: string | null;
	reasons: ChangeReason[];
}

/**
 * Pure: should the site be rebuilt? `deployed` is null when the live
 * manifest couldn't be fetched (first deploy, site down) — rebuilding is
 * the safe answer then. A fixture deploy always counts as stale.
 */
export function diffUpstream(
	current: ReadonlyMap<string, string>,
	deployed: DeployManifest | null,
): UpstreamDiff {
	if (!deployed) {
		return { changed: true, global: "no deployed manifest", reasons: [] };
	}
	if (deployed.fixture) {
		return {
			changed: true,
			global: "deployed site is a fixture build",
			reasons: [],
		};
	}
	const reasons: ChangeReason[] = [];
	const before = new Map(deployed.projects.map((p) => [p.id, p.sha]));
	for (const [id, sha] of current) {
		const old = before.get(id);
		if (old === undefined) reasons.push({ id, kind: "new", sha });
		else if (old !== sha)
			reasons.push({ id, kind: "updated", from: old, to: sha });
	}
	for (const id of before.keys()) {
		if (!current.has(id)) reasons.push({ id, kind: "removed" });
	}
	return { changed: reasons.length > 0, global: null, reasons };
}

const execFileP = promisify(execFile);

/**
 * `git ls-remote`, not the REST API: no rate limit for public repos and no
 * token needed. A private repo's token goes in through GIT_CONFIG_* env
 * vars, so it never appears in argv (visible to other processes) or a URL.
 */
export async function lsRemoteSha(
	project: Project,
	token: string | undefined,
): Promise<string> {
	const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
	if (token) {
		const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
		env.GIT_CONFIG_COUNT = "1";
		env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
		env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
	}
	const ref = `refs/heads/${project.ref}`;
	const { stdout } = await execFileP(
		"git",
		["ls-remote", `https://github.com/${project.repo}.git`, ref],
		{ env, timeout: 60_000 },
	);
	const line = stdout.split("\n").find((l) => l.endsWith(`\t${ref}`));
	const sha = line?.split("\t")[0];
	if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
		throw new Error(`[${project.id}] ${ref} not found on ${project.repo}`);
	}
	return sha;
}

export function describe(diff: UpstreamDiff): string {
	if (diff.global) return `rebuild: ${diff.global}`;
	if (!diff.changed) return "up to date";
	return diff.reasons
		.map((r) =>
			r.kind === "updated"
				? `${r.id}: ${r.from.slice(0, 7)} -> ${r.to.slice(0, 7)}`
				: r.kind === "new"
					? `${r.id}: new at ${r.sha.slice(0, 7)}`
					: `${r.id}: removed`,
		)
		.join("; ");
}
