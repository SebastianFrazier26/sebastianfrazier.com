import { describe, expect, it } from "vitest";
import {
	decorSlots,
	layoutMarkers,
	type MapProject,
	parseShelfProjects,
	playPath,
	resolveWorld,
} from "../src/mapData.ts";

const world = (id: string, extra: Record<string, unknown> = {}) => ({
	id: `${id}-shelf-id`,
	name: id.toUpperCase(),
	worldUrl: `${id}/world.json`,
	themeSeed: 1,
	fileCount: 1,
	totalBytes: 1,
	...extra,
});

describe("parseShelfProjects", () => {
	it("derives markers from the shelf, ordered by `order`, keyed by worldUrl dir", () => {
		const projects = parseShelfProjects({
			worlds: [
				world("b", { order: 20, description: "second" }),
				world("a", { order: 10 }),
				world("c"),
			],
		});
		expect(projects?.map((p) => p.slug)).toEqual(["a", "b", "c"]);
		expect(projects?.[1]).toEqual({
			slug: "b",
			name: "B",
			description: "second",
			order: 20,
			worldUrl: "/worlds/b/world.json",
			shelfIndex: 0,
		});
		expect(projects?.[0]?.shelfIndex).toBe(1);
		expect(projects?.[0]?.description).toBe("");
	});

	it("drops malformed, duplicate and path-escaping entries instead of trusting them", () => {
		const projects = parseShelfProjects({
			worlds: [
				world("ok"),
				world("ok"),
				{ ...world("x"), worldUrl: "../evil/world.json" },
				{ ...world("y"), worldUrl: "y/other.json" },
				{ ...world("z"), worldUrl: "Z_UP/world.json" },
				{ name: 3, worldUrl: "n/world.json" },
				null,
				"str",
			],
		});
		expect(projects?.map((p) => p.slug)).toEqual(["ok"]);
	});

	it("returns null when the document is not a shelf", () => {
		expect(parseShelfProjects(null)).toBeNull();
		expect(parseShelfProjects({ worlds: "x" })).toBeNull();
		expect(parseShelfProjects([])).toBeNull();
	});
});

describe("resolveWorld", () => {
	const projects = parseShelfProjects({
		worlds: [world("skid")],
	}) as MapProject[];

	it("finds a known project", () => {
		expect(resolveWorld("skid", projects)?.slug).toBe("skid");
	});
	it("falls back to the base world for unknown, malformed or absent ids", () => {
		for (const bad of ["nope", "SKID", "skid/", "../skid", "", null]) {
			expect(resolveWorld(bad, projects)).toBeNull();
		}
	});
});

describe("playPath", () => {
	it("links the base world or a project world", () => {
		expect(playPath()).toBe("/play");
		expect(playPath("skid")).toBe("/play?world=skid");
	});
});

describe("layoutMarkers", () => {
	it("walks the wide map in a serpentine", () => {
		const { points } = layoutMarkers(6, "wide");
		expect(points.map((p) => p.x)).toEqual([20, 50, 80, 80, 50, 20]);
		expect(points[2]?.y).toBe(points[0]?.y);
		expect((points[3]?.y ?? 0) > (points[0]?.y ?? 0)).toBe(true);
	});
	it("zigzags a single column on phones", () => {
		const { points, aspect } = layoutMarkers(4, "tall");
		expect(points.map((p) => p.x)).toEqual([30, 70, 30, 70]);
		const ys = points.map((p) => p.y);
		expect([...ys].sort((a, b) => a - b)).toEqual(ys);
		expect(aspect).toBeGreaterThan(2);
	});
	it("keeps every marker inside the map for any count", () => {
		for (const shape of ["wide", "tall"] as const) {
			for (const n of [1, 2, 5, 7, 12]) {
				const { points } = layoutMarkers(n, shape);
				expect(points).toHaveLength(n);
				for (const p of points) {
					expect(p.x).toBeGreaterThan(0);
					expect(p.x).toBeLessThan(100);
					expect(p.y).toBeGreaterThan(0);
					expect(p.y).toBeLessThan(100);
				}
			}
		}
	});
	it("handles no projects", () => {
		expect(layoutMarkers(0, "wide").points).toEqual([]);
	});
});

describe("decorSlots", () => {
	it("puts tall-map scenery on the side opposite each marker", () => {
		const markers = layoutMarkers(3, "tall").points;
		const slots = decorSlots(3, "tall");
		expect(slots).toHaveLength(3);
		slots.forEach((slot, i) => {
			expect(slot.x < 50 !== (markers[i]?.x ?? 0) < 50).toBe(true);
		});
	});
	it("gives each wide row edge and gap slots, none beyond the map", () => {
		const slots = decorSlots(6, "wide");
		expect(slots).toHaveLength(8);
		for (const slot of slots) expect(slot.y).toBeLessThan(100);
	});
});
