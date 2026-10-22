// The only module that talks to @cabn/cli and @cabn/world-schema. Everything
// version-dependent about the engine lives here, so moving from 0.1.0 to the
// 0.2.0 API (world info, site portals, shelf metadata, --name) is an edit to
// this file and nothing else.
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runBuild, runShelf } from "@cabn/cli";
import * as worldSchema from "@cabn/world-schema";
import type { Project } from "./projects.ts";

export interface CabnCapabilities {
	/** cabn.json accepts `world` and `sites` (0.2.0+): title/description/links/order and web-portal heroes. */
	showcase: boolean;
	/** The installed @cabn/cli version, for the deploy manifest. */
	cliVersion: string;
}

// Probing the schema rather than reading a version number: a linked engine
// worktree keeps reporting 0.1.0 until its release bumps it, but its schema
// already says what the converter will accept.
export function detectCapabilities(): CabnCapabilities {
	const probe = worldSchema.CabnConfigSchema.safeParse({
		cabnConfigVersion: 1,
		world: { title: "probe" },
		sites: [],
	});
	return { showcase: probe.success, cliVersion: cliVersion() };
}

function cliVersion(): string {
	// The package exports only its entry point, so package.json is found beside dist/.
	const pkgUrl = new URL("../package.json", import.meta.resolve("@cabn/cli"));
	return (JSON.parse(readFileSync(pkgUrl, "utf8")) as { version: string })
		.version;
}

export const HERO_SITE_ID = "live-site";

export function heroOrigin(project: Project): string | null {
	const hero = project.hero;
	if (hero?.status !== "live") return null;
	return new URL(hero.url).origin;
}

type RepoConfig = Record<string, unknown>;

/**
 * The cabn.json the build actually uses: the repo's own (if it has one) plus
 * what the portfolio injects. Pure, so the injected shape is unit-tested.
 * Without showcase support, `world`/`sites` are left out entirely — a 0.1.0
 * converter's strict schema would reject the whole world over them.
 */
export function toCabnConfig(
	project: Project,
	repoConfig: RepoConfig | null,
	caps: Pick<CabnCapabilities, "showcase">,
): RepoConfig {
	const base: RepoConfig = { ...(repoConfig ?? {}) };
	const repoOrigins = Array.isArray(base.allowedEmbedOrigins)
		? (base.allowedEmbedOrigins as string[])
		: [];
	// Without site portals nothing would frame the hero, so its origin would
	// only widen the CSP.
	const origin = caps.showcase ? heroOrigin(project) : null;
	const config: RepoConfig = {
		...base,
		cabnConfigVersion: 1,
		allowedEmbedOrigins: [
			...new Set([...repoOrigins, ...(origin ? [origin] : [])]),
		].sort(),
	};
	if (!caps.showcase) return config;

	config.world = {
		title: project.name,
		description: project.description,
		links: project.links,
		order: project.order,
	};
	const repoSites = Array.isArray(base.sites)
		? (base.sites as { id: string; hero?: boolean }[])
		: [];
	if (project.hero && origin) {
		config.sites = [
			{
				id: HERO_SITE_ID,
				title: `${project.name} — live site`,
				url: project.hero.url,
				hero: true,
			},
			// The portfolio's hero wins; a repo's own sites stay, demoted.
			...repoSites
				.filter((s) => s.id !== HERO_SITE_ID)
				.map(({ hero: _hero, ...rest }) => rest),
		];
	} else if (repoSites.length > 0) {
		config.sites = repoSites;
	}
	return config;
}

/** Validated at the boundary with the installed engine's own schema, so a bad merge fails here with a clear message rather than mid-conversion. */
export function validateConfig(config: RepoConfig): void {
	worldSchema.validateCabnConfig(config);
}

export async function readRepoConfig(
	sourceDir: string,
): Promise<RepoConfig | null> {
	let raw: string;
	try {
		raw = await readFile(join(sourceDir, "cabn.json"), "utf8");
	} catch {
		return null;
	}
	const parsed: unknown = JSON.parse(raw);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("repo cabn.json is not a JSON object");
	}
	return parsed as RepoConfig;
}

export interface BuildWorldInput {
	project: Project;
	sha: string;
	sourceDir: string;
	outDir: string;
	offline: boolean;
	caps: CabnCapabilities;
}

export interface BuiltWorld {
	outDir: string;
	allowedEmbedOrigins: string[];
	showcaseWritten: boolean;
	summary: { portals: number; bytes: number; monsters: number };
}

/**
 * Injects the config by writing cabn.json into the extract (a temp dir this
 * build owns) rather than through 0.2.0's ConvertOptions.config: identical
 * effect on both engine versions, and no dependence on how the new option
 * merges with a repo's own file — that merge already happened above.
 */
export async function buildWorld(input: BuildWorldInput): Promise<BuiltWorld> {
	const { project, sourceDir, outDir, caps } = input;
	const config = toCabnConfig(project, await readRepoConfig(sourceDir), caps);
	validateConfig(config);
	await writeFile(
		join(sourceDir, "cabn.json"),
		`${JSON.stringify(config, null, 2)}\n`,
	);

	const options: Parameters<typeof runBuild>[1] & { name?: string } = {
		outDir,
		history: false,
		offline: input.offline,
		// 0.2.0's --name; 0.1.0 ignores it and normalizeManifest covers it.
		...(caps.showcase ? { name: project.name } : {}),
	};
	const summary = await runBuild(sourceDir, options);
	const allowedEmbedOrigins = await normalizeManifest(outDir, {
		name: project.name,
		source: `github:${project.repo}@${input.sha}`,
	});

	let showcaseWritten = false;
	try {
		await readFile(join(outDir, "showcase.json"));
		showcaseWritten = true;
	} catch {
		showcaseWritten = false;
	}
	if (caps.showcase && config.sites && !showcaseWritten) {
		console.warn(
			`[${project.id}] engine schema accepts sites but the build wrote no showcase.json — is the linked converter built?`,
		);
	}
	return {
		outDir,
		allowedEmbedOrigins,
		showcaseWritten,
		summary: {
			portals: summary.portals,
			bytes: summary.bytes,
			monsters: summary.monsters,
		},
	};
}

/**
 * 0.1.0 names a world after its source directory and records that
 * directory's absolute path as meta.source; both are rewritten so the
 * published world shows the project's name and leaks no build-machine path.
 */
export async function normalizeManifest(
	outDir: string,
	meta: { name: string; source: string },
): Promise<string[]> {
	const path = join(outDir, "world.json");
	const manifest = JSON.parse(await readFile(path, "utf8")) as {
		meta: { name: string; source: string };
		allowedEmbedOrigins?: string[];
	};
	manifest.meta.name = meta.name;
	manifest.meta.source = meta.source;
	worldSchema.validateManifest(manifest);
	await writeFile(path, JSON.stringify(manifest));
	return manifest.allowedEmbedOrigins ?? [];
}

export async function buildShelf(
	worldDirs: string[],
	opts: { outDir: string; name: string },
): Promise<void> {
	await runShelf(worldDirs, opts);
}

/** Every world's allowedEmbedOrigins, deduplicated and sorted: the site's CSP frame-src. Prefers the engine's own helper (0.2.0+). */
export function collectEmbedOrigins(
	sources: Iterable<{ allowedEmbedOrigins?: readonly string[] | undefined }>,
): string[] {
	const engineHelper = (worldSchema as Record<string, unknown>)
		.collectEmbedOrigins as ((s: typeof sources) => string[]) | undefined;
	if (typeof engineHelper === "function") return engineHelper(sources);
	const out = new Set<string>();
	for (const source of sources) {
		for (const origin of source.allowedEmbedOrigins ?? []) out.add(origin);
	}
	return [...out].sort();
}
