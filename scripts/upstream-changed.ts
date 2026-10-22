#!/usr/bin/env node
// Has any enabled project's upstream moved past what the live site was
// built from? Prints a one-line summary and, under GitHub Actions, writes
// `changed=true|false` to $GITHUB_OUTPUT. Exit code: 0 on a decision either
// way, 1 when upstream couldn't be read (CI should fail loudly, not deploy).
//   DEPLOYED_MANIFEST_URL  default https://sebastianfrazier.com/worlds/manifest.json
//   GITHUB_TOKEN           only needed for private projects
import { appendFile } from "node:fs/promises";
import { type DeployManifest, parseDeployManifest } from "./lib/manifest.ts";
import { enabledProjects, loadProjects } from "./lib/projects.ts";
import { describe, diffUpstream, lsRemoteSha } from "./lib/upstream.ts";

const manifestUrl =
	process.env.DEPLOYED_MANIFEST_URL?.trim() ||
	"https://sebastianfrazier.com/worlds/manifest.json";
const token = process.env.GITHUB_TOKEN?.trim() || undefined;

async function fetchDeployed(): Promise<DeployManifest | null> {
	try {
		const res = await fetch(manifestUrl, {
			headers: { "cache-control": "no-cache" },
			signal: AbortSignal.timeout(20_000),
		});
		if (!res.ok) {
			console.warn(`deployed manifest: HTTP ${res.status} from ${manifestUrl}`);
			return null;
		}
		return parseDeployManifest(await res.json());
	} catch (err) {
		console.warn(`deployed manifest unreadable: ${(err as Error).message}`);
		return null;
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
const diff = diffUpstream(current, await fetchDeployed());
console.log(`${diff.changed ? "CHANGED" : "unchanged"}: ${describe(diff)}`);
if (process.env.GITHUB_OUTPUT) {
	await appendFile(process.env.GITHUB_OUTPUT, `changed=${diff.changed}\n`);
}
