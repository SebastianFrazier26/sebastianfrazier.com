// The only module that talks to @cabn/cli and @cabn/world-schema. Everything
// version-dependent about the engine lives here: 0.2.0's config injection,
// world info, site portals and shelf metadata, with a 0.1.0 fallback that
// can be deleted once 0.1.0 is no longer worth supporting.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cli from "@cabn/cli";
import { runBuild, runShelf } from "@cabn/cli";
import * as worldSchema from "@cabn/world-schema";
import { installedCliVersion } from "./cabnVersion.ts";
import type { Project } from "./projects.ts";

export interface CabnCapabilities {
	/** cabn.json accepts `world` and `sites` (0.2.0+): title/description/links/order and web-portal heroes. */
	showcase: boolean;
	/** runBuild({ config }) injection and collectWorldEmbedOrigins (0.2.0+). */
	injection: boolean;
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
	// collectWorldEmbedOrigins shipped together with config injection; its
	// presence is the probe for the build API, as the schema is for config.
	const injection =
		probe.success &&
		typeof (cli as Record<string, unknown>).collectWorldEmbedOrigins ===
			"function";
	return {
		showcase: probe.success,
		injection,
		cliVersion: installedCliVersion(),
	};
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
 * The host config for cabn 0.2.0's injection (runBuild({ config })): world
 * info, the hero site and the COMPLETE embed allowlist. Under injection the
 * engine ignores a repo cabn.json's own allowedEmbedOrigins/world/sites
 * (warning about them) and merges the rest underneath; a repo url preview
 * outside this list fails that world's build, and with it the deploy.
 */
export function hostConfig(project: Project): RepoConfig {
	return toCabnConfig(project, null, { showcase: true }).config;
}

/**
 * Two paths, chosen by detectCapabilities():
 * - injection (0.2.0+): the repo's cabn.json is left untouched and the host
 *   config is passed in. Fail closed: any engine error (e.g. a repo url
 *   preview whose origin isn't allowed) rejects, naming the project.
 * - legacy (0.1.0): no injection API, so a sanitized cabn.json is written
 *   over the repo's in the extract (a temp dir this build owns), dropping
 *   off-list url previews with a warning — on 0.1.0 nothing at all can be
 *   allowed, so failing instead would make any url preview unbuildable.
 */
export async function buildWorld(input: BuildWorldInput): Promise<BuiltWorld> {
	const { project, sourceDir, outDir, caps } = input;
	let config: RepoConfig;
	const warnings: string[] = [];
	if (caps.injection) {
		config = hostConfig(project);
	} else {
		let repoConfig: RepoConfig | null = null;
		try {
			repoConfig = await readRepoConfig(sourceDir);
		} catch (err) {
			warnings.push(
				`repo cabn.json unreadable, ignored: ${(err as Error).message}`,
			);
		}
		const injected = toCabnConfig(project, repoConfig, caps);
		warnings.push(...injected.warnings);
		config = injected.config;
		try {
			validateConfig(config);
		} catch (err) {
			// The repo's remaining settings are what failed (ours are
			// schema-shaped by construction); build with ours alone.
			warnings.push(
				`repo cabn.json settings dropped: ${(err as Error).message.split("\n")[0]}`,
			);
			({ config } = toCabnConfig(project, null, caps));
			validateConfig(config);
		}
		await writeFile(
			join(sourceDir, "cabn.json"),
			`${JSON.stringify(config, null, 2)}\n`,
		);
	}

	// Built untyped and cast once: `config` is absent from 0.1.0's
	// BuildOptions and typed as the engine's own config input in 0.2.0, and
	// this file has to typecheck against both.
	const options: Record<string, unknown> = {
		outDir,
		history: false,
		offline: input.offline,
		...(caps.injection ? { config } : {}),
	};
	let summary: Awaited<ReturnType<typeof runBuild>>;
	try {
		summary = await runBuild(
			sourceDir,
			options as Parameters<typeof runBuild>[1],
		);
	} catch (err) {
		throw new Error(`cabn build failed: ${(err as Error).message}`);
	}
	warnings.push(...summary.warnings.map((w) => `engine: ${w}`));
	for (const w of warnings) console.warn(`[${project.id}] ${w}`);

	// 0.2.0 already names the world from world.title and writes a path-free
	// meta.source; 0.1.0 needs both rewritten.
	const allowedEmbedOrigins = caps.injection
		? await readAllowedOrigins(outDir)
		: await normalizeManifest(outDir, {
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
	if (caps.injection && config.sites && !showcaseWritten) {
		throw new Error(
			"host config has sites but the build wrote no showcase.json",
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

async function readAllowedOrigins(outDir: string): Promise<string[]> {
	const manifest = worldSchema.validateManifest(
		JSON.parse(await readFile(join(outDir, "world.json"), "utf8")),
	) as { allowedEmbedOrigins?: string[] };
	return manifest.allowedEmbedOrigins ?? [];
}

/** The site's own origin never belongs in frame-src (frame-ancestors 'none' anyway). */
export const SITE_ORIGIN = "https://sebastianfrazier.com";

/**
 * The CSP frame-src: on 0.2.0 the engine's own collectWorldEmbedOrigins over
 * the built bundles (it throws on a malformed entry, which fails the build —
 * intended); on 0.1.0 the union of what buildWorld returned.
 */
export async function worldEmbedOrigins(
	worldDirs: string[],
	legacyOrigins: { allowedEmbedOrigins: string[] }[],
	caps: CabnCapabilities,
): Promise<string[]> {
	if (caps.injection) {
		const collect = (cli as Record<string, unknown>)
			.collectWorldEmbedOrigins as (
			dirs: readonly string[],
			opts: { excludeOrigin?: string },
		) => Promise<string[]>;
		return collect(worldDirs, { excludeOrigin: SITE_ORIGIN });
	}
	return collectEmbedOrigins(legacyOrigins).filter((o) => o !== SITE_ORIGIN);
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
