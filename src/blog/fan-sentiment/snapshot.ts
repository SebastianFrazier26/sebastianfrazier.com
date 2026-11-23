import { z } from "zod";
import raw from "./snapshot.json" with { type: "json" };

// Mirrors fansent's own snapshot validator (mlb-fan-sentiment, site.py): every
// string is from a closed vocabulary or a short identifier, so a copied file
// carrying comment text or a player name fails the test that parses it.
const METRICS = [
	"COMPOSITE",
	"OPS",
	"AVG",
	"ERA",
	"WHIP",
	"FLD_PCT",
	"ERRORS",
	"OAA",
	"CS_PCT",
] as const;

const probability = z.number().min(0).max(1);

const Row = z.strictObject({
	family: z.enum(["COMPOSITE", "metrics", "OAA", "exploratory"]),
	exploratory: z.boolean(),
	metric: z.enum(METRICS),
	fanbase: z.string().regex(/^[A-Za-z0-9_]{2,32}$/),
	mu_mean: z.number(),
	ci_low: z.number(),
	ci_high: z.number(),
	p_pos: probability,
	perm_p: probability,
	rhat_max: z.number(),
	q_bh: probability.nullable(),
	p_holm: probability.nullable(),
	n_units: z.number().int().nonnegative(),
	n_obs: z.number().int().nonnegative(),
});

const Confirmatory = z.strictObject({
	metric: z.literal("FLD_Z"),
	confirmed: z.boolean(),
	mu_mean: z.number(),
	ci_low: z.number(),
	ci_high: z.number(),
	perm_p_less: probability,
	rhat_max: z.number(),
	n_units: z.number().int().nonnegative(),
	n_obs: z.number().int().nonnegative(),
});

export const Snapshot = z.strictObject({
	schema_version: z.literal(2),
	run_id: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
	created: z.iso.date(),
	season: z.number().int().positive(),
	ci_level: z.number().gt(0).lt(1),
	perm_b: z.number().int().positive(),
	alpha: z.number().gt(0).lt(1),
	correction: z.enum(["bh", "holm"]),
	status: z.enum(["preliminary", "final"]),
	null: z.enum(["freedman-lane", "shuffle"]),
	sections: z
		.array(
			z.strictObject({
				scope: z.enum(["league", "demo", "league_fanbases"]),
				rows: z.array(Row).min(1),
			}),
		)
		.min(1),
	confirmatory: Confirmatory,
});

export type Snapshot = z.infer<typeof Snapshot>;
export type SnapshotRow = z.infer<typeof Row>;

// Not parsed at runtime: tests/blogSnapshot.test.ts parses the same file in
// CI, and keeping zod out of the post's chunk keeps it small.
export const snapshot = raw as Snapshot;

export function rowsFor(
	snap: Snapshot,
	scope: "league" | "demo" | "league_fanbases",
): SnapshotRow[] {
	return snap.sections.find((s) => s.scope === scope)?.rows ?? [];
}

export interface PitchData {
	/** The pre-registered league result. */
	result: Snapshot["confirmatory"];
	/** The two-team fielding rows that prompted the test, most negative first. */
	called: SnapshotRow[];
	calledLow: number;
	calledHigh: number;
}

/** Everything the "pitch" section draws, derived from the snapshot alone. */
export function pitchData(snap: Snapshot): PitchData {
	const called = rowsFor(snap, "demo")
		.filter(
			(r) =>
				(r.metric === "ERRORS" || r.metric === "FLD_PCT") &&
				(r.fanbase === "CHICubs" || r.fanbase === "baseball"),
		)
		.sort((a, b) => a.mu_mean - b.mu_mean);
	const values = called.map((r) => r.mu_mean);
	return {
		result: snap.confirmatory,
		called,
		calledLow: Math.min(...values),
		calledHigh: Math.max(...values),
	};
}

/** League-wide pooled rows for the given metrics, in the order asked. */
export function leagueRows(snap: Snapshot, metrics: string[]): SnapshotRow[] {
	const rows = rowsFor(snap, "league");
	return metrics.flatMap((m) => rows.filter((r) => r.metric === m));
}

const FIELDING = ["ERRORS", "FLD_PCT"];

/** The two-team fielding rows, one per metric and fanbase, news left out. */
export function firstInningRows(snap: Snapshot): SnapshotRow[] {
	return rowsFor(snap, "demo")
		.filter((r) => FIELDING.includes(r.metric) && r.fanbase !== "news")
		.sort((a, b) => a.mu_mean - b.mu_mean);
}

export interface LeagueData {
	/** Metrics in display order. */
	metrics: string[];
	/** Every corrected (metric, fanbase) test. */
	cells: SnapshotRow[];
	/** The pooled league-wide row for each metric. */
	pooled: SnapshotRow[];
	/** Cells whose corrected q is below `threshold`. */
	clearing: number;
	threshold: number;
}

export function leagueData(snap: Snapshot, threshold = 0.1): LeagueData {
	const metrics = [
		"OPS",
		"AVG",
		"ERA",
		"WHIP",
		"FLD_PCT",
		"ERRORS",
		"COMPOSITE",
	];
	const cells = rowsFor(snap, "league_fanbases").filter(
		(r) => r.q_bh !== null && metrics.includes(r.metric),
	);
	return {
		metrics,
		cells,
		pooled: leagueRows(snap, metrics),
		clearing: cells.filter((r) => (r.q_bh ?? 1) < threshold).length,
		threshold,
	};
}

export const METRIC_NAMES: Record<string, string> = {
	OPS: "OPS",
	AVG: "Batting average",
	ERA: "ERA",
	WHIP: "WHIP",
	FLD_PCT: "Fielding %",
	ERRORS: "Errors",
	COMPOSITE: "Composite",
};

/**
 * Aggregates quoted in the post that the snapshot does not carry. Each is a
 * summary number from mlb-fan-sentiment's docs/results-2026-11.md or its
 * 2026-11-21 league run; none is per-player or per-comment.
 */
export const FACTS = {
	/** Where the original shuffle null sat for AVG, OPS, ERA and the composite ("near +0.03"). */
	shuffleNullCentre: 0.03,
	/** Mean of the corrected (Freedman-Lane) null centres for the same four metrics. */
	correctedNullCentre: 0.006,
	teamSubreddits: 30,
} as const;
