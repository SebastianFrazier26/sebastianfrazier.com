#!/usr/bin/env node
// Points the site at a local cabn checkout (e.g. an unreleased engine
// worktree) without touching package.json or pnpm-lock.yaml:
//   node scripts/engine-link.ts link [cabnDir]   (default: $CABN_ENGINE_DIR or ../cabn)
//   node scripts/engine-link.ts unlink           (back to the npm versions in the lockfile)
// The checkout must be built (`pnpm -r build` there) first. .pnpmfile.cjs
// does the rewrite, but pnpm only runs that hook while resolving and skips
// resolution when node_modules looks current, hence --force. That install
// also rewrites pnpm-lock.yaml, so the committed one is saved and put back:
// node_modules ends up linked, the lockfile on disk never changes.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const [mode, dirArg] = process.argv.slice(2);

function pnpm(args: string[], env: NodeJS.ProcessEnv = process.env): void {
	const result = spawnSync("pnpm", args, { stdio: "inherit", env });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

if (mode === "link") {
	const dir = resolve(dirArg ?? process.env.CABN_ENGINE_DIR ?? "../cabn");
	for (const pkg of ["engine", "cli", "world-schema"]) {
		if (!existsSync(resolve(dir, "packages", pkg, "dist"))) {
			console.error(
				`${dir}/packages/${pkg}/dist missing — run \`pnpm -r build\` in ${dir}`,
			);
			process.exit(1);
		}
	}
	copyFileSync("pnpm-lock.yaml", "pnpm-lock.yaml.unlinked");
	try {
		pnpm(["install", "--no-frozen-lockfile", "--force"], {
			...process.env,
			CABN_ENGINE_DIR: dir,
		});
	} finally {
		copyFileSync("pnpm-lock.yaml.unlinked", "pnpm-lock.yaml");
		rmSync("pnpm-lock.yaml.unlinked");
	}
	console.log(`linked @cabn/* to ${dir}; \`pnpm engine:unlink\` to undo`);
} else if (mode === "unlink") {
	const env = { ...process.env };
	delete env.CABN_ENGINE_DIR;
	pnpm(["install", "--frozen-lockfile", "--force"], env);
	console.log("@cabn/* back on the npm versions in pnpm-lock.yaml");
} else {
	console.error("usage: engine-link.ts link [cabnDir] | unlink");
	process.exit(2);
}
