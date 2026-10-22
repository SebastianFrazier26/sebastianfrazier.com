#!/usr/bin/env node
// Builds every enabled project into public/worlds/ (one cabn world each,
// plus shelf.json and manifest.json). Usage:
//   node scripts/build-worlds.ts [--only id,id] [--offline] [--keep-temp]
//   node scripts/build-worlds.ts --fixture   (offline, no GitHub: CI's build)
import {
	cp,
	mkdir,
	mkdtemp,
	readdir,
	realpath,
	rm,
	writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
	buildShelf,
	buildWorld,
	collectEmbedOrigins,
	detectCapabilities,
} from "./lib/cabnAdapter.ts";
import { makeExcluder } from "./lib/excludes.ts";
import { downloadAndExtract, resolveSha } from "./lib/github.ts";
import { scanWorld } from "./lib/leaks.ts";
import {
	DEPLOY_MANIFEST_VERSION,
	type DeployedProject,
	type DeployManifest,
} from "./lib/manifest.ts";
import {
	enabledProjects,
	loadProjects,
	type Project,
	parseProjects,
} from "./lib/projects.ts";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));
const publicWorlds = join(siteRoot, "public", "worlds");
const fixtureDir = join(siteRoot, "fixtures", "world-fixture");

const { values: args } = parseArgs({
	options: {
		only: { type: "string" },
		offline: { type: "boolean", default: false },
		fixture: { type: "boolean", default: false },
		"keep-temp": { type: "boolean", default: false },
	},
});

// The fixture stands in for a GitHub project so CI can build and serve a
// real world with no network and no token. Its excludes are exercised by
// fixtures/world-fixture/data/, which must never reach the output.
const FIXTURE_FILE = parseProjects({
	shelfName: "Sebastian Frazier",
	defaultExcludes: [],
	projects: [
		{
			id: "fixture",
			name: "Fixture world",
			repo: "local/world-fixture",
			ref: "main",
			visibility: "public",
			enabled: true,
			description: "An offline stand-in world for CI builds.",
			links: [],
			excludes: ["data/"],
			history: false,
			hero: {
				url: "https://sebastianfrazier26.github.io/skid-case-study/",
				status: "live",
			},
			order: 0,
		},
	],
});

async function listRel(dir: string): Promise<string[]> {
	const out: string[] = [];
	for (const e of await readdir(dir, {
		withFileTypes: true,
		recursive: true,
	})) {
		if (e.isFile())
			out.push(relative(dir, join(e.parentPath, e.name)).split(sep).join("/"));
	}
	return out;
}

async function stageFixture(
	dest: string,
	isExcluded: (p: string) => boolean,
): Promise<string[]> {
	const excluded = (await listRel(fixtureDir)).filter(isExcluded);
	await cp(fixtureDir, dest, {
		recursive: true,
		filter: (src) => {
			const rel = relative(fixtureDir, src).split(sep).join("/");
			return rel === "" || !isExcluded(rel);
		},
	});
	return excluded;
}

async function main(): Promise<void> {
	const file = args.fixture ? FIXTURE_FILE : await loadProjects();
	let projects = enabledProjects(file);
	if (args.only) {
		const wanted = new Set(args.only.split(","));
		projects = projects.filter((p) => wanted.has(p.id));
		const missing = [...wanted].filter(
			(id) => !projects.some((p) => p.id === id),
		);
		if (missing.length)
			throw new Error(`--only: unknown or disabled ${missing}`);
	}
	const offline = args.offline || args.fixture;
	const caps = detectCapabilities();
	console.log(
		`cabn ${caps.cliVersion} (showcase: ${caps.showcase ? "yes" : "no — world info and hero sites skipped"})`,
	);

	const tempRoot = await realpath(await mkdtemp(join(tmpdir(), "sf-worlds-")));
	const outRoot = join(tempRoot, "out");
	// Both spellings: macOS's tmpdir is a symlink into /private.
	const forbidden = [
		...new Set([
			tempRoot,
			join(tmpdir(), basename(tempRoot)),
			siteRoot.replace(/\/$/, ""),
		]),
	];
	const deployed: DeployedProject[] = [];
	const origins: { allowedEmbedOrigins: string[] }[] = [];
	const worldDirs: string[] = [];
	let failed = false;

	try {
		for (const project of projects) {
			const result = await buildOne(project, {
				file,
				tempRoot,
				outRoot,
				offline,
				caps,
				forbidden,
				fixture: args.fixture,
			});
			if (!result) {
				failed = true;
				continue;
			}
			deployed.push(result.deployed);
			origins.push({ allowedEmbedOrigins: result.origins });
			worldDirs.push(join(outRoot, project.id));
		}
		if (failed) throw new Error("one or more worlds failed; nothing published");

		await buildShelf(worldDirs, { outDir: outRoot, name: file.shelfName });
		const manifest: DeployManifest = {
			manifestVersion: DEPLOY_MANIFEST_VERSION,
			generatedAt: new Date().toISOString(),
			fixture: args.fixture,
			engine: { cliVersion: caps.cliVersion, showcase: caps.showcase },
			embedOrigins: collectEmbedOrigins(origins),
			projects: deployed,
		};
		await writeFile(
			join(outRoot, "manifest.json"),
			`${JSON.stringify(manifest, null, 2)}\n`,
		);
		const shelfScan = await scanWorld(outRoot, { forbidden, excluded: [] });
		if (shelfScan.errors.length) {
			throw new Error(`leak check failed:\n${shelfScan.errors.join("\n")}`);
		}

		await rm(publicWorlds, { recursive: true, force: true });
		await mkdir(join(siteRoot, "public"), { recursive: true });
		await cp(outRoot, publicWorlds, { recursive: true });
		console.log(
			`wrote ${deployed.length} world(s) to public/worlds; frame-src: ${manifest.embedOrigins.join(" ") || "(none)"}`,
		);
	} finally {
		if (args["keep-temp"]) console.log(`kept ${tempRoot}`);
		else await rm(tempRoot, { recursive: true, force: true });
	}
}

async function buildOne(
	project: Project,
	ctx: {
		file: { defaultExcludes: string[] };
		tempRoot: string;
		outRoot: string;
		offline: boolean;
		caps: ReturnType<typeof detectCapabilities>;
		forbidden: string[];
		fixture: boolean;
	},
): Promise<{ deployed: DeployedProject; origins: string[] } | null> {
	const isExcluded = makeExcluder([
		...ctx.file.defaultExcludes,
		...project.excludes,
	]);
	// Named by id, not by the display name: 0.1.0 derives meta.name from this
	// directory, and normalizeManifest rewrites it anyway.
	const sourceDir = join(ctx.tempRoot, "src", project.id);
	const outDir = join(ctx.outRoot, project.id);
	try {
		let sha: string;
		let excluded: string[];
		if (ctx.fixture) {
			sha = "0".repeat(40);
			excluded = await stageFixture(sourceDir, isExcluded);
		} else {
			sha = await resolveSha(project);
			const extract = await downloadAndExtract(
				project,
				sha,
				sourceDir,
				isExcluded,
			);
			excluded = extract.excluded;
			console.log(
				`[${project.id}] ${project.repo}@${sha.slice(0, 7)}: ${extract.files} files, ${excluded.length} excluded, ${extract.skippedLinks.length} links skipped`,
			);
		}
		const built = await buildWorld({
			project,
			sha,
			sourceDir,
			outDir,
			offline: ctx.offline,
			caps: ctx.caps,
		});
		const scan = await scanWorld(outDir, {
			forbidden: ctx.forbidden,
			soft: [homedir()],
			excluded,
		});
		for (const w of scan.warnings.slice(0, 5))
			console.warn(`[${project.id}] warning: ${w}`);
		if (scan.errors.length) {
			console.error(
				`[${project.id}] leak check failed:\n  ${scan.errors.slice(0, 20).join("\n  ")}`,
			);
			return null;
		}
		console.log(
			`[${project.id}] built: ${built.summary.portals} portals, ${built.summary.monsters} monsters, ${(built.summary.bytes / 1024).toFixed(0)} KiB, showcase.json ${built.showcaseWritten ? "yes" : "no"}`,
		);
		return {
			deployed: {
				id: project.id,
				repo: project.repo,
				ref: project.ref,
				sha,
				worldDir: `worlds/${project.id}`,
			},
			origins: built.allowedEmbedOrigins,
		};
	} catch (err) {
		console.error(`[${project.id}] ${(err as Error).message}`);
		return null;
	}
}

await main();
