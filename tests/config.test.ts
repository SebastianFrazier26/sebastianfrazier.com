import { describe, expect, it } from "vitest";
import {
	HERO_SITE_ID,
	heroOrigin,
	toCabnConfig,
	validateConfig,
} from "../scripts/lib/cabnAdapter.ts";
import { makeExcluder } from "../scripts/lib/excludes.ts";
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
		const config = toCabnConfig(project, null, SHOWCASE);
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
		const pending = {
			...project,
			hero: {
				url: "https://sebastianfrazier26.github.io/skid-case-study/",
				status: "pending" as const,
			},
		};
		const config = toCabnConfig(pending, null, SHOWCASE);
		expect(config.sites).toBeUndefined();
		expect(config.allowedEmbedOrigins).toEqual([]);
		expect(heroOrigin(pending)).toBeNull();
	});

	it("merges with the repo's own cabn.json: origins unioned, its sites demoted", () => {
		const config = toCabnConfig(
			project,
			{
				cabnConfigVersion: 1,
				guide: false,
				allowedEmbedOrigins: [
					"https://example.com",
					"https://sebastianfrazier26.github.io",
				],
				sites: [
					{
						id: "docs",
						title: "Docs",
						url: "https://example.com/",
						hero: true,
					},
				],
			},
			SHOWCASE,
		);
		expect(config.guide).toBe(false);
		expect(config.allowedEmbedOrigins).toEqual([
			"https://example.com",
			"https://sebastianfrazier26.github.io",
		]);
		expect(config.sites).toEqual([
			expect.objectContaining({ id: HERO_SITE_ID, hero: true }),
			{ id: "docs", title: "Docs", url: "https://example.com/" },
		]);
	});
});

describe("toCabnConfig without showcase support (0.1.0)", () => {
	it("emits only fields a 0.1.0 converter accepts, and no hero origin", () => {
		const config = toCabnConfig(project, null, LEGACY);
		expect(config).toEqual({ cabnConfigVersion: 1, allowedEmbedOrigins: [] });
		expect(() => validateConfig(config)).not.toThrow();
	});

	it("keeps a repo's own embed origins", () => {
		const config = toCabnConfig(
			project,
			{ cabnConfigVersion: 1, allowedEmbedOrigins: ["https://threejs.org"] },
			LEGACY,
		);
		expect(config.allowedEmbedOrigins).toEqual(["https://threejs.org"]);
	});
});

describe("excludes", () => {
	const isExcluded = makeExcluder([
		"data/",
		"experiments/output/",
		"pretrain_list*.txt",
		"**/uv.lock",
		"src/seed.js",
	]);
	it.each([
		"data",
		"data/raw/2024.parquet",
		"experiments/output/run.log",
		"pretrain_list_ucf101_full.txt",
		"uv.lock",
		"backend/uv.lock",
		"src/seed.js",
	])("excludes %s", (path) => expect(isExcluded(path)).toBe(true));
	it.each([
		"database.py",
		"src/data/loader.py",
		"experiments/exp.py",
		"docs/pretrain_list.md",
		"src/seed.json",
	])("keeps %s", (path) => expect(isExcluded(path)).toBe(false));
});

describe("tarball paths", () => {
	it("drops GitHub's top-level directory", () => {
		expect(stripTopDir("Owner-repo-abc123/src/a.ts")).toBe("src/a.ts");
		expect(stripTopDir("Owner-repo-abc123/")).toBe("");
		expect(stripTopDir("pax_global_header")).toBe("");
	});
});
