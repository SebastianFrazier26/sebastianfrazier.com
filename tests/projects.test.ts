import { describe, expect, it } from "vitest";
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
	it("parses the committed file with the seven worlds", async () => {
		const projects = await loadProjects();
		expect(projects.projects.map((p) => p.id)).toEqual([
			"savimae",
			"fansent",
			"cabn",
			"loosy-goose",
			"safeascent",
			"famgo",
			"skid",
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

	it("gives cabn no hero: its demo refuses framing", async () => {
		const cabn = (await loadProjects()).projects.find((p) => p.id === "cabn");
		expect(cabn?.hero).toBeNull();
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
		["an absolute exclude", { excludes: ["/etc/passwd"] }],
		["a bad id", { id: "Has Spaces" }],
		["a path in the name", { name: "a/b" }],
		["an unknown field", { extra: 1 }],
	])("rejects %s", (_label, patch) => {
		expect(() => parseProjects(file([{ ...base, ...patch }]))).toThrow(
			/Invalid projects.json/,
		);
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
