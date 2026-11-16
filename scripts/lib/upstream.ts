import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DeployManifest } from "./manifest.ts";
import type { Project } from "./projects.ts";

export type ChangeReason =
	| { id: string; kind: "new"; sha: string }
	| { id: string; kind: "updated"; from: string; to: string }
	| { id: string; kind: "removed" };

/** What fetching the live manifest produced. */
export type DeployedState =
	| { kind: "ok"; manifest: DeployManifest }
	/** HTTP 404: nothing deployed yet. */
	| { kind: "missing" }
	/** Network error, 5xx, or a body that doesn't parse. */
	| { kind: "unreadable"; reason: string };

export interface CurrentState {
	projects: ReadonlyMap<string, string>;
	/** This site repo's commit; "unknown" skips the comparison. */
	siteSha: string;
	cliVersion: string;
}

export interface UpstreamDiff {
	changed: boolean;
	/** Why a rebuild is needed (or skipped) with no per-project reason. */
	global: string | null;
	/** Set when the decision is "don't deploy" only because the live site couldn't be read. */
	warning: string | null;
	reasons: ChangeReason[];
}

/**
 * Pure: should the scheduled run rebuild? Only a missing (404) or fixture
 * manifest forces it; an unreadable one skips with a warning, so a blip at
 * the host doesn't turn every 30-minute run into a full rebuild. A site
 * commit or engine version that differs from what's live also counts: a
 * push deploy that never finished must not read as "up to date".
 */
export function diffUpstream(
	current: CurrentState,
	deployed: DeployedState,
): UpstreamDiff {
	const none = { warning: null, reasons: [] };
	if (deployed.kind === "missing") {
		return { changed: true, global: "nothing deployed yet", ...none };
	}
	if (deployed.kind === "unreadable") {
		return {
			changed: false,
			global: null,
			warning: `live manifest unreadable (${deployed.reason}); skipping this run`,
			reasons: [],
		};
	}
	const live = deployed.manifest;
	if (live.fixture) {
		return {
			changed: true,
			global: "deployed site is a fixture build",
			...none,
		};
	}
	if (current.siteSha !== "unknown" && live.siteSha !== current.siteSha) {
		return {
			changed: true,
			global: `site ${live.siteSha.slice(0, 7)} is live, main is ${current.siteSha.slice(0, 7)}`,
			...none,
		};
	}
	if (live.engine.cliVersion !== current.cliVersion) {
		return {
			changed: true,
			global: `cabn ${live.engine.cliVersion} is live, ${current.cliVersion} is installed`,
			...none,
		};
	}
	const reasons: ChangeReason[] = [];
	const before = new Map(live.projects.map((p) => [p.id, p.sha]));
	for (const [id, sha] of current.projects) {
		const old = before.get(id);
		if (old === undefined) reasons.push({ id, kind: "new", sha });
		else if (old !== sha)
			reasons.push({ id, kind: "updated", from: old, to: sha });
	}
	for (const id of before.keys()) {
		if (!current.projects.has(id)) reasons.push({ id, kind: "removed" });
	}
	return { changed: reasons.length > 0, global: null, warning: null, reasons };
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
	let stdout: string;
	try {
		({ stdout } = await execFileP(
			"git",
			["ls-remote", `https://github.com/${project.repo}.git`, ref],
			{ env, timeout: 60_000 },
		));
	} catch (err) {
		// execFile's message embeds the command line, i.e. the repo URL; a
		// private repo's name must not reach a public CI log.
		const code = (err as { code?: unknown }).code;
		throw new Error(`[${project.id}] git ls-remote failed (${String(code)})`);
	}
	const line = stdout.split("\n").find((l) => l.endsWith(`\t${ref}`));
	const sha = line?.split("\t")[0];
	if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
		throw new Error(`[${project.id}] ${ref} not found upstream`);
	}
	return sha;
}

export function describe(diff: UpstreamDiff): string {
	if (diff.warning) return diff.warning;
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
