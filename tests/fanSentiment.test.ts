import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { signed } from "../src/blog/fan-sentiment/format.ts";
import { bezier, flyControl } from "../src/blog/fan-sentiment/kit/motion.ts";
import {
	firstInningRows,
	leagueData,
	leagueRows,
	pitchData,
	rowsFor,
	Snapshot,
} from "../src/blog/fan-sentiment/snapshot.ts";

const raw: unknown = JSON.parse(
	readFileSync(
		new URL("../src/blog/fan-sentiment/snapshot.json", import.meta.url),
		"utf8",
	),
);

function strings(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value && typeof value === "object")
		return Object.entries(value).flatMap(([k, v]) => [k, ...strings(v)]);
	return [];
}

describe("fan-sentiment snapshot", () => {
	it("is a valid aggregate-only snapshot with no free text", () => {
		const snap = Snapshot.parse(raw);
		expect(snap.status).toBe("final");
		expect(rowsFor(snap, "league").length).toBeGreaterThan(0);
		for (const s of strings(raw)) expect(s).toMatch(/^[A-Za-z0-9._-]+$/);
	});

	it.each([
		[
			"a comment",
			(s: Record<string, unknown>) => ({ ...s, note: "he is bad" }),
		],
		[
			"a player name as a fanbase",
			(s: { sections: { rows: object[] }[] }) => ({
				...s,
				sections: [
					{
						...s.sections[0],
						rows: [{ ...s.sections[0]?.rows[0], fanbase: "Seiya Suzuki" }],
					},
				],
			}),
		],
		[
			"an extra row field",
			(s: { sections: { rows: object[] }[] }) => ({
				...s,
				sections: [
					{
						...s.sections[0],
						rows: [{ ...s.sections[0]?.rows[0], text: "great game" }],
					},
				],
			}),
		],
	])("rejects a snapshot carrying %s", (_name, mutate) => {
		const bad = (mutate as (s: unknown) => unknown)(structuredClone(raw));
		expect(Snapshot.safeParse(bad).success).toBe(false);
	});
});

describe("pitch data", () => {
	it("pairs the registered result with the two-team fielding rows", () => {
		const d = pitchData(Snapshot.parse(raw));
		expect(d.result.metric).toBe("FLD_Z");
		expect(d.called).toHaveLength(4);
		expect(d.called.every((r) => r.mu_mean < 0)).toBe(true);
		expect(d.calledLow).toBe(d.called[0]?.mu_mean);
		expect(d.calledHigh).toBe(d.called[3]?.mu_mean);
		expect(d.calledHigh).toBeLessThan(d.result.ci_low);
	});
});

describe("section data", () => {
	const snap = Snapshot.parse(raw);

	it("gives the two-team fielding rows without the news fanbase", () => {
		const rows = firstInningRows(snap);
		expect(rows).toHaveLength(6);
		expect(rows.every((r) => r.fanbase !== "news")).toBe(true);
		expect(rows.every((r) => r.mu_mean < 0)).toBe(true);
	});

	it("returns league rows in the order asked", () => {
		expect(leagueRows(snap, ["OPS", "AVG"]).map((r) => r.metric)).toEqual([
			"OPS",
			"AVG",
		]);
	});

	it("counts every corrected fanbase test and the ones that clear", () => {
		const d = leagueData(snap);
		expect(d.cells).toHaveLength(217);
		expect(d.cells.every((r) => r.q_bh !== null)).toBe(true);
		expect(d.pooled.map((r) => r.metric)).toEqual(d.metrics);
		expect(d.clearing).toBe(0);
		expect(leagueData(snap, 1.01).clearing).toBe(217);
	});
});

describe("flight maths", () => {
	it("walks a quadratic Bézier from its start to its end", () => {
		expect(bezier(0, [1, 2], [5, 9], [7, 3])).toEqual([1, 2]);
		expect(bezier(1, [1, 2], [5, 9], [7, 3])).toEqual([7, 3]);
	});

	it("peaks a fly ball the asked height above its higher end", () => {
		const from = [0, 100] as const;
		const to = [200, 60] as const;
		const peak = bezier(0.5, from, flyControl(from, to, 80), to);
		expect(peak[0]).toBe(100);
		expect(peak[1]).toBeCloseTo(-20);
	});
});

describe("post helpers", () => {
	it("formats signed effects with a real minus and no signed zero", () => {
		expect(signed(-0.002259)).toBe("−0.002");
		expect(signed(0.017239)).toBe("+0.017");
		expect(signed(-0.0001)).toBe("0.000");
		expect(signed(-0.2, 2)).toBe("−0.20");
	});
});

describe("post stylesheet", () => {
	// The blog requires every selector of a post to sit under `.post-<folder>`.
	it("keeps every selector under the post's root class", () => {
		const dir = new URL("../src/blog/fan-sentiment/", import.meta.url);
		const sheets = readdirSync(dir, { recursive: true })
			.map(String)
			.filter((f) => f.endsWith(".css"));
		expect(sheets.length).toBeGreaterThan(0);
		for (const sheet of sheets) {
			const css = readFileSync(new URL(sheet, dir), "utf8")
				.replace(/\/\*[\s\S]*?\*\//g, "")
				.replace(/@font-face\s*\{[^}]*\}/g, "");
			const selectors = [...css.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)].flatMap(
				(match) => (match[1] ?? "").split(",").map((s) => s.trim()),
			);
			expect(selectors.length).toBeGreaterThan(20);
			for (const selector of selectors) {
				expect(selector, sheet).toMatch(/^\.post-fan-sentiment(?![\w-])/);
			}
		}
	});
});
