// The only module that talks to @cabn/cli and @cabn/world-schema. Everything
// version-dependent about the engine lives here, so moving from 0.1.0 to the
// 0.2.0 API (world info, site portals, shelf metadata, --name) is an edit to
// this file and nothing else.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runBuild, runShelf } from "@cabn/cli";
import * as worldSchema from "@cabn/world-schema";
import { installedCliVersion } from "./cabnVersion.ts";
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
	return { showcase: probe.success, cliVersion: installedCliVersion() };
}

export const HERO_SITE_ID = "live-site";

export function heroOrigin(project: Project): string | null {
	const hero = project.hero;
	if (hero?.status !== "live") return null;
	return new URL(hero.url).origin;
}

type RepoConfig = Record<string, unknown>;

/** Fields the portfolio owns outright: a repo's own values are discarded, so an upstream repo can never widen what the site frames. Same policy cabn 0.2.0 applies to an injected config. */
const OWNED_FIELDS = ["allowedEmbedOrigins", "world", "sites"] as const;

export interface InjectedConfig {
	config: RepoConfig;
	warnings: string[];
}

/**
 * The cabn.json the build actually uses. Pure, so it is unit-tested.
 * - allowedEmbedOrigins, world and sites come only from projects.json;
 * - the repo's other settings (guide, media caps, non-url previews...) stay;
 * - a repo url preview whose origin the portfolio doesn't allow is dropped
 *   with a warning rather than failing the build, so an upstream commit
 *   can't take the whole site down.
 * Without showcase support (0.1.0) there are no site portals, so no origin
 * is allowed at all and `world`/`sites` are left out: 0.1.0's strict schema
 * would reject the whole world over them.
 */
export function toCabnConfig(
	project: Project,
	repoConfig: RepoConfig | null,
	caps: Pick<CabnCapabilities, "showcase">,
): InjectedConfig {
	const warnings: string[] = [];
	const base: RepoConfig = { ...(repoConfig ?? {}) };
	for (const field of OWNED_FIELDS) {
		if (field in base) {
			warnings.push(
				`repo cabn.json \`${field}\` ignored (owned by projects.json)`,
			);
			delete base[field];
		}
	}
	const origin = caps.showcase ? heroOrigin(project) : null;
	const allowed = origin ? [origin] : [];

	if (base.previews && typeof base.previews === "object") {
		const kept: Record<string, unknown> = {};
		for (const [path, preview] of Object.entries(base.previews)) {
			const p = preview as { kind?: unknown; url?: unknown };
			if (p?.kind === "url") {
				let previewOrigin: string | null = null;
				try {
					previewOrigin = new URL(String(p.url)).origin;
				} catch {
					previewOrigin = null;
				}
				if (!previewOrigin || !allowed.includes(previewOrigin)) {
					warnings.push(
						`url preview for ${path} dropped: ${String(p.url)} is not an allowed origin`,
					);
					continue;
				}
			}
			kept[path] = preview;
		}
		base.previews = kept;
	}

	const config: RepoConfig = {
		...base,
		cabnConfigVersion: 1,
		allowedEmbedOrigins: allowed,
	};
	if (!caps.showcase) return { config, warnings };

	config.world = {
		title: project.name,
		description: project.description,
		links: project.links,
		order: project.order,
	};
	if (project.hero && origin) {
		config.sites = [
			{
				id: HERO_SITE_ID,
				title: `${project.name} — live site`,
				url: project.hero.url,
				hero: true,
			},
		];
	}
	return { config, warnings };
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
 * Injects the config by overwriting cabn.json in the extract (a temp dir this
 * build owns). TODO(cabn 0.2.0): pass it as runBuild({ config }) instead once
 * that API is final; the effect is the same since the merge happened above.
 */
export async function buildWorld(input: BuildWorldInput): Promise<BuiltWorld> {
	const { project, sourceDir, outDir, caps } = input;
	let repoConfig: RepoConfig | null = null;
	try {
		repoConfig = await readRepoConfig(sourceDir);
	} catch (err) {
		console.warn(
			`[${project.id}] repo cabn.json unreadable, ignored: ${(err as Error).message}`,
		);
	}
	const injected = toCabnConfig(project, repoConfig, caps);
	const warnings = injected.warnings;
	let config = injected.config;
	try {
		validateConfig(config);
	} catch (err) {
		// The repo's remaining settings are what failed (ours are schema-shaped
		// by construction); build with the portfolio's config alone.
		warnings.push(
			`repo cabn.json settings dropped: ${(err as Error).message.split("\n")[0]}`,
		);
		({ config } = toCabnConfig(project, null, caps));
		validateConfig(config);
	}
	for (const w of warnings) console.warn(`[${project.id}] ${w}`);
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
		// A private repo's name stays out of anything published.
		source:
			project.visibility === "public"
				? `github:${project.repo}@${input.sha}`
				: `project:${project.id}@${input.sha}`,
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
