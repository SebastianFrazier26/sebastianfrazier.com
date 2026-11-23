import { describe, expect, it } from "vitest";
import { BATTER, FIELDER } from "../src/blog/fan-sentiment/kit/Figures.tsx";
import {
	bezier,
	bezierVelocity,
	formatCount,
	stretchFor,
} from "../src/blog/fan-sentiment/kit/motion.ts";
import {
	BATTER_GRID,
	batTip,
	catchStrokes,
	cellPaths,
	FIELDER_GRID,
	GLOVE_POCKET,
	PX,
	rasterise,
	SHOULDER,
	SWING_POSES,
	swingFrame,
	swingStrokes,
} from "../src/blog/fan-sentiment/kit/sprites.ts";

function distanceToSegment(
	p: readonly [number, number],
	a: readonly [number, number],
	b: readonly [number, number],
): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const t = Math.max(
		0,
		Math.min(
			1,
			((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
		),
	);
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

describe("arcade sprites", () => {
	it("draws both players on one rectangular grid standing on y = 0", () => {
		for (const grid of [BATTER_GRID, FIELDER_GRID]) {
			expect(grid).toHaveLength(24);
			expect(new Set(grid.map((row) => row.length))).toEqual(new Set([14]));
			expect(grid.at(-1)).toMatch(/o/);
		}
		expect(-96 + BATTER_GRID.length * PX).toBe(0);
	});

	it("swings the arms from the scenes' pivot", () => {
		expect(
			Math.hypot(SHOULDER[0] - BATTER.pivot[0], SHOULDER[1] - BATTER.pivot[1]),
		).toBeLessThanOrEqual(PX);
		for (const pose of SWING_POSES) {
			const arm = swingStrokes(pose).find((s) => s.k === "j");
			expect(arm?.from).toEqual(SHOULDER);
		}
	});

	it("meets the ball at the scenes' contact point in the contact frame", () => {
		const contact = SWING_POSES.at(-1);
		if (!contact) throw new Error("no contact frame");
		expect(contact.angle).toBe(0);
		const reach = distanceToSegment(
			BATTER.contact,
			contact.hands,
			batTip(contact),
		);
		expect(reach).toBeLessThan(4.7);
	});

	it("picks the frame nearest the scene's swing angle", () => {
		expect(swingFrame(BATTER.cocked)).toBe(0);
		expect(swingFrame(0)).toBe(SWING_POSES.length - 1);
		expect(swingFrame(-100)).toBe(1);
	});

	it("catches with the glove pocket where the scenes aim the ball", () => {
		expect(
			Math.hypot(
				GLOVE_POCKET[0] - FIELDER.glove[0],
				GLOVE_POCKET[1] - FIELDER.glove[1],
			),
		).toBeLessThanOrEqual(1.5);
		const glove = catchStrokes("catch").find((s) => s.k === "l");
		expect(glove?.from).toEqual(GLOVE_POCKET);
	});

	it("inks every rasterised shape with an outline", () => {
		const cells = rasterise(
			[{ from: [0, 0], to: [0, 0], radius: 2, k: "w" }],
			-6,
			-6,
		);
		expect(cells.filter((c) => c.k === "w")).toHaveLength(1);
		expect(cells.filter((c) => c.k === "o")).toHaveLength(4);
	});

	it("merges a row's neighbouring cells into one rectangle", () => {
		const paths = cellPaths(
			[
				{ c: 0, r: 0, k: "o" },
				{ c: 1, r: 0, k: "o" },
				{ c: 3, r: 0, k: "o" },
			],
			0,
			0,
		);
		expect(paths.o).toBe("M0 0h8v4h-8zM12 0h4v4h-4z");
	});
});

describe("ball motion", () => {
	it("gives the curve's true velocity", () => {
		const p0 = [0, 0] as const;
		const p1 = [50, -80] as const;
		const p2 = [100, 0] as const;
		const h = 1e-5;
		const [ax, ay] = bezier(0.3, p0, p1, p2);
		const [bx, by] = bezier(0.3 + h, p0, p1, p2);
		const [vx, vy] = bezierVelocity(0.3, p0, p1, p2);
		expect(vx).toBeCloseTo((bx - ax) / h, 2);
		expect(vy).toBeCloseTo((by - ay) / h, 2);
	});

	it("stretches faster balls more, up to a limit", () => {
		expect(stretchFor(0)).toBe(0);
		expect(stretchFor(600)).toBeLessThan(stretchFor(1200));
		expect(stretchFor(1e6)).toBe(0.32);
	});

	it("counts in the post's number format", () => {
		expect(formatCount(-0.0019, 3, true)).toBe("−0.002");
		expect(formatCount(0, 3, true)).toBe("0.000");
		expect(formatCount(216.6, 0, false)).toBe("217");
	});
});
