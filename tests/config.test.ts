import { describe, expect, it } from "vitest";
import {
	HERO_SITE_ID,
	heroOrigin,
	toCabnConfig,
	validateConfig,
} from "../scripts/lib/cabnAdapter.ts";
import { compilePattern, makeExcluder } from "../scripts/lib/excludes.ts";
import { stripTopDir } from "../scripts/lib/github.ts";
import type { Project } from "../scripts/lib/projects.ts";

const project: Project = {
	id: "skid",
	name: "skID case study",
	repo: "SebastianFrazier26/skid-case-study",
	ref: "main",
	visibility: "public",
	enabled: true,
	description: "A case study.",
	links: [
		{
			label: "Source",
			url: "https://github.com/SebastianFrazier26/skid-case-study",
		},
	],
	excludes: [],
	history: false,
	hero: {
		url: "https://sebastianfrazier26.github.io/skid-case-study/",
		status: "live",
	},
	order: 70,
};
const SHOWCASE = { showcase: true };
const LEGACY = { showcase: false };

describe("toCabnConfig with showcase support (0.2.0)", () => {
	it("injects world info and the hero as a site portal whose origin is allowed", () => {
		const { config, warnings } = toCabnConfig(project, null, SHOWCASE);
		expect(warnings).toEqual([]);
		expect(config).toMatchObject({
			cabnConfigVersion: 1,
			allowedEmbedOrigins: ["https://sebastianfrazier26.github.io"],
			world: {
				title: "skID case study",
				description: "A case study.",
				links: project.links,
				order: 70,
			},
			sites: [
				{
					id: HERO_SITE_ID,
					url: "https://sebastianfrazier26.github.io/skid-case-study/",
					hero: true,
				},
			],
		});
	});

	it("leaves a pending hero out entirely", () => {
		const pending: Project = {
			...project,
			hero: {
				url: "https://sebastianfrazier26.github.io/skid-case-study/",
				status: "pending",
			},
		};
		const { config } = toCabnConfig(pending, null, SHOWCASE);
		expect(config.sites).toBeUndefined();
		expect(config.allowedEmbedOrigins).toEqual([]);
		expect(heroOrigin(pending)).toBeNull();
	});

	it("never lets a repo's cabn.json widen origins, world or sites", () => {
		const { config, warnings } = toCabnConfig(
			project,
			{
				cabnConfigVersion: 1,
				guide: false,
				allowedEmbedOrigins: ["https://evil.example"],
				world: { title: "Not this" },
				sites: [{ id: "x", title: "X", url: "https://evil.example/" }],
			},
			SHOWCASE,
		);
		expect(config.guide).toBe(false);
		expect(config.allowedEmbedOrigins).toEqual([
			"https://sebastianfrazier26.github.io",
		]);
		expect(config.world).toMatchObject({ title: "skID case study" });
		expect(config.sites).toEqual([
			expect.objectContaining({ id: HERO_SITE_ID }),
		]);
		expect(warnings).toHaveLength(3);
	});

	it("drops repo url previews outside the allowed origins, keeps the rest", () => {
		const { config, warnings } = toCabnConfig(
			project,
			{
				cabnConfigVersion: 1,
				previews: {
					"a.md": { kind: "url", url: "https://evil.example/" },
					"b.md": {
						kind: "url",
						url: "https://sebastianfrazier26.github.io/skid-case-study/x",
					},
					"c.md": { kind: "markdown", src: "docs/c.md" },
				},
			},
			SHOWCASE,
		);
		expect(Object.keys(config.previews as object)).toEqual(["b.md", "c.md"]);
		expect(warnings).toEqual([expect.stringContaining("a.md dropped")]);
	});
});

describe("toCabnConfig without showcase support (0.1.0)", () => {
	it("emits only fields a 0.1.0 converter accepts, and no origin at all", () => {
		const { config } = toCabnConfig(project, null, LEGACY);
		expect(config).toEqual({ cabnConfigVersion: 1, allowedEmbedOrigins: [] });
		expect(() => validateConfig(config)).not.toThrow();
	});

	it("drops a repo's own embed origins and url previews", () => {
		const { config } = toCabnConfig(
			project,
			{
				cabnConfigVersion: 1,
				allowedEmbedOrigins: ["https://threejs.org"],
				previews: { "a.md": { kind: "url", url: "https://threejs.org/" } },
			},
			LEGACY,
		);
		expect(config.allowedEmbedOrigins).toEqual([]);
		expect(config.previews).toEqual({});
		expect(() => validateConfig(config)).not.toThrow();
	});
});

describe("excludes (gitignore-style)", () => {
	const isExcluded = makeExcluder([
		"data/",
		"experiments/output/",
		"pretrain_list*.txt",
		"**/uv.lock",
		"src/seed.js",
		"/build",
	]);
	it.each([
		"data",
		"data/raw/2024.parquet",
		"src/data/loader.py",
		"experiments/output/run.log",
		"pretrain_list_ucf101_full.txt",
		"nested/pretrain_list.txt",
		"uv.lock",
		"backend/uv.lock",
		"src/seed.js",
		"build/out.js",
	])("excludes %s", (path) => expect(isExcluded(path)).toBe(true));
	it.each([
		"database.py",
		"pkg/experiments/output/run.log",
		"experiments/exp.py",
		"docs/pretrain_list.md",
		"src/seed.json",
		"lib/src/seed.js",
		"src/build/x.js",
	])("keeps %s", (path) => expect(isExcluded(path)).toBe(false));

	it("compiles patterns the gitignore way", () => {
		expect(compilePattern("data/")).toBe("**/data");
		expect(compilePattern("*.log")).toBe("**/*.log");
		expect(compilePattern("/build")).toBe("build");
		expect(compilePattern("a/b")).toBe("a/b");
	});

	it("refuses negation", () => {
		expect(() => makeExcluder(["!keep.txt"])).toThrow(/negated/);
	});
});

describe("tarball paths", () => {
	it("drops GitHub's top-level directory", () => {
		expect(stripTopDir("Owner-repo-abc123/src/a.ts")).toBe("src/a.ts");
		expect(stripTopDir("Owner-repo-abc123/")).toBe("");
		expect(stripTopDir("pax_global_header")).toBe("");
	});
});
