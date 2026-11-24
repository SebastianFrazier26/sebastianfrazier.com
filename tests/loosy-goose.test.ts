import { describe, expect, it } from "vitest";
import { COPY } from "../src/blog/loosy-goose/copy.ts";
import { OPEN_WEIGHT, SET_D, SHOTS } from "../src/blog/loosy-goose/data.ts";
import { formatP, signed } from "../src/blog/loosy-goose/format.ts";
import { fates, rally, triangle } from "../src/blog/loosy-goose/kit/pong.ts";
import { levelAt } from "../src/blog/loosy-goose/sections/Paddle.tsx";
import { along } from "../src/blog/loosy-goose/sections/Rally.tsx";

describe("pong geometry", () => {
	it("bounces between 0 and 1", () => {
		expect(triangle(0)).toBe(0);
		expect(triangle(1)).toBe(1);
		expect(triangle(1.5)).toBe(0.5);
		expect(triangle(-0.25)).toBe(0.25);
	});

	// The markup draws the finished rally, so t = 1 must land on a paddle.
	it("ends a rally with an odd number of crossings at the right paddle", () => {
		expect(rally(1, 5, 3)[0]).toBe(1);
		expect(rally(0, 5, 3)[0]).toBe(0);
	});

	it("splits the token grid by share, the counts adding up, the same every time", () => {
		const plan = fates(96, 6422 / 19333, 0.248);
		const count = (f: string): number => plan.filter((p) => p === f).length;
		expect(count("kept")).toBe(32);
		expect(count("stale")).toBe(24);
		expect(count("kept") + count("stale") + count("dropped")).toBe(96);
		expect(fates(96, 6422 / 19333, 0.248)).toEqual(plan);
	});
});

describe("scrubbed scenes", () => {
	it("walks the paddle from light to heavy and holds heavy at the end", () => {
		expect(levelAt(0)).toEqual({ from: "light", to: "light", k: 0 });
		expect(levelAt(0.5).from).toBe("medium");
		expect(levelAt(1)).toEqual({ from: "heavy", to: "heavy", k: 0 });
	});

	it("reads a rally line at its measured checkpoints", () => {
		const v = OPEN_WEIGHT.byPosition.freeze;
		expect(along(v, 0.5)).toBe(v[0]);
		expect(along(v, 0.75)).toBe(v[1]);
		expect(along(v, 1)).toBe(v[2]);
	});
});

describe("the data the post shows", () => {
	it("keeps the summary ahead of loosy at every level on set D", () => {
		for (const level of ["light", "medium", "heavy"] as const) {
			expect(SET_D.summary[level].mean).toBeGreaterThan(
				SET_D.loosy[level].mean,
			);
			expect(SET_D.loosy[level].lo).toBeLessThan(SET_D.loosy[level].mean);
		}
	});

	it("names every trick shot", () => {
		for (const shot of SHOTS) {
			expect(COPY.shots.names).toHaveProperty(shot.id);
			expect(COPY.shots.vs).toHaveProperty(shot.id);
		}
	});

	it("formats like the result tables", () => {
		expect(signed(-0.004)).toBe("−0.004");
		expect(signed(0.113)).toBe("+0.113");
		expect(formatP(0)).toBe("p < 0.001");
		expect(formatP(0.021)).toBe("p = 0.021");
	});
});
