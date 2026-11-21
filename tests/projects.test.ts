import { describe, expect, it } from "vitest";
import { makeExcluder } from "../scripts/lib/excludes.ts";
import {
	enabledProjects,
	loadProjects,
	parseProjects,
} from "../scripts/lib/projects.ts";

const base = {
	id: "demo",
	name: "Demo",
	repo: "owner/demo",
	ref: "main",
	visibility: "public",
	enabled: true,
	description: "A demo.",
	links: [],
	excludes: [],
	history: false,
	hero: null,
	order: 1,
};
const file = (projects: unknown[]) => ({
	shelfName: "S",
	defaultExcludes: [],
	projects,
});

describe("projects.json", () => {
	it("parses the committed file with the eight worlds", async () => {
		const projects = await loadProjects();
		expect(projects.projects.map((p) => p.id)).toEqual([
			"savimae",
			"fansent",
			"cabn",
			"loosy-goose",
			"safeascent",
			"famgo",
			"skid",
			"blog",
		]);
		expect(projects.projects.every((p) => p.history === false)).toBe(true);
		expect(projects.shelfName).toBe("Sebastian Frazier");
	});

	it("keeps famgo private, unpublished and stripped of photos and seed data", async () => {
		const famgo = (await loadProjects()).projects.find((p) => p.id === "famgo");
		expect(famgo).toMatchObject({ visibility: "private", enabled: false });
		expect(famgo?.excludes).toEqual(
			expect.arrayContaining(["public/images/", "src/seed.js"]),
		);
		expect(
			enabledProjects(await loadProjects()).map((p) => p.id),
		).not.toContain("famgo");
	});

	it("builds the blog world from its posts only", async () => {
		const blog = enabledProjects(await loadProjects()).find(
			(p) => p.id === "blog",
		);
		expect(blog).toMatchObject({
			name: "Blog",
			repo: "SebastianFrazier26/blog",
			visibility: "public",
			hero: null,
		});
		const isExcluded = makeExcluder(blog?.excludes ?? []);
		for (const path of ["README.md", "CLAUDE.md", "LICENSE"]) {
			expect(isExcluded(path)).toBe(true);
		}
		expect(isExcluded("posts/2026-11-21-hello.md")).toBe(false);
		expect(isExcluded("posts/README.md")).toBe(false);
	});

	it("previews cabn through its hosted demo, which allows this site to frame it", async () => {
		const cabn = (await loadProjects()).projects.find((p) => p.id === "cabn");
		expect(cabn?.hero).toEqual({
			url: "https://cabn-demo-production.up.railway.app/",
			status: "live",
		});
	});

	it("orders enabled projects by `order`", () => {
		const parsed = parseProjects(
			file([
				{ ...base, id: "b", order: 2 },
				{ ...base, id: "a", order: 1 },
				{ ...base, id: "off", order: 0, enabled: false },
			]),
		);
		expect(enabledProjects(parsed).map((p) => p.id)).toEqual(["a", "b"]);
	});

	it.each([
		["history: true", { history: true }],
		["a non-https hero", { hero: { url: "http://x.dev/", status: "live" } }],
		["an exclude that climbs out", { excludes: ["../etc"] }],
		["a bare-slash exclude", { excludes: ["/"] }],
		["a tag-like ref path", { ref: "refs/tags/v1" }],
		["a SHA as ref", { ref: "a".repeat(40) }],
		["a ref with ..", { ref: "a..b" }],
		["a bad id", { id: "Has Spaces" }],
		["a path in the name", { name: "a/b" }],
		["an unknown field", { extra: 1 }],
	])("rejects %s", (_label, patch) => {
		expect(() => parseProjects(file([{ ...base, ...patch }]))).toThrow(
			/Invalid projects.json/,
		);
	});

	it("accepts a root-anchored exclude and a nested branch name", () => {
		expect(() =>
			parseProjects(
				file([{ ...base, excludes: ["/build"], ref: "release/v2" }]),
			),
		).not.toThrow();
	});

	it("rejects duplicate ids", () => {
		expect(() => parseProjects(file([base, base]))).toThrow(/duplicate/);
	});

	it("rejects a published private project with a hero", () => {
		expect(() =>
			parseProjects(
				file([
					{
						...base,
						visibility: "private",
						hero: { url: "https://x.dev/", status: "live" },
					},
				]),
			),
		).toThrow(/private project/);
	});
});
