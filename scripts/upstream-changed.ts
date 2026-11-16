#!/usr/bin/env node
// Has anything moved past what the live site was built from — a project's
// upstream branch, this repo's own commit, or the cabn version? Prints a
// one-line summary and, under GitHub Actions, writes `changed=true|false`
// to $GITHUB_OUTPUT. Exit code: 0 on a decision either way (an unreadable
// live manifest is "don't deploy" plus a ::warning::), 1 when an upstream
// repo couldn't be read.
//   DEPLOYED_MANIFEST_URL  default https://sebastianfrazier.com/worlds/manifest.json
//   GITHUB_TOKEN           only needed for private projects
import { appendFile } from "node:fs/promises";
import { installedCliVersion } from "./lib/cabnVersion.ts";
import { parseDeployManifest } from "./lib/manifest.ts";
import { enabledProjects, loadProjects } from "./lib/projects.ts";
import { siteSha } from "./lib/siteSha.ts";
import {
	type DeployedState,
	describe,
	diffUpstream,
	lsRemoteSha,
} from "./lib/upstream.ts";

const manifestUrl =
	process.env.DEPLOYED_MANIFEST_URL?.trim() ||
	"https://sebastianfrazier.com/worlds/manifest.json";
const token = process.env.GITHUB_TOKEN?.trim() || undefined;

async function fetchDeployed(): Promise<DeployedState> {
	let res: Response;
	try {
		res = await fetch(manifestUrl, {
			headers: { "cache-control": "no-cache" },
			signal: AbortSignal.timeout(20_000),
		});
	} catch (err) {
		return { kind: "unreadable", reason: (err as Error).message };
	}
	if (res.status === 404) return { kind: "missing" };
	if (!res.ok) return { kind: "unreadable", reason: `HTTP ${res.status}` };
	try {
		return { kind: "ok", manifest: parseDeployManifest(await res.json()) };
	} catch (err) {
		return {
			kind: "unreadable",
			reason: `bad manifest: ${(err as Error).message.split("\n")[0]}`,
		};
	}
}

const projects = enabledProjects(await loadProjects());
const current = new Map<string, string>();
try {
	for (const p of projects) current.set(p.id, await lsRemoteSha(p, token));
} catch (err) {
	console.error((err as Error).message);
	process.exit(1);
}
const diff = diffUpstream(
	{
		projects: current,
		siteSha: await siteSha(),
		cliVersion: installedCliVersion(),
	},
	await fetchDeployed(),
);
if (diff.warning && process.env.GITHUB_ACTIONS) {
	console.log(`::warning::${diff.warning}`);
}
console.log(`${diff.changed ? "CHANGED" : "unchanged"}: ${describe(diff)}`);
if (process.env.GITHUB_OUTPUT) {
	await appendFile(process.env.GITHUB_OUTPUT, `changed=${diff.changed}\n`);
}
