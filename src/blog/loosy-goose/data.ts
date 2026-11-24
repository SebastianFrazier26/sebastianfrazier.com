// Every number the post shows, copied by hand from the loosy-goose repo's
// committed result tables (main @ e00959c, 2026-11-23). Each block names the
// file it came from, relative to that repo, so a reader can check it.

export const REPO = "https://github.com/SebastianFrazier26/loosy-goose";
export const DEMO = "https://sebastianfrazier26.github.io/loosy-goose/";
export const resultsUrl = (file: string): string =>
	`${REPO}/blob/main/docs/results/${file}`;

export type Level = "light" | "medium" | "heavy";
export const LEVELS: readonly Level[] = ["light", "medium", "heavy"];

/** An accuracy with its 95% bootstrap interval over transcripts. */
export interface Est {
	mean: number;
	lo: number;
	hi: number;
}
const est = (mean: number, lo: number, hi: number): Est => ({ mean, lo, hi });

/**
 * Set D: 20 held-out SWE-Gym transcripts, Haiku 5.5 answering, Sonnet 5.5
 * grading, probes by gpt-6-sol. Source: exp_slot_downstream_d.md.
 */
export const SET_D = {
	source: "exp_slot_downstream_d.md",
	transcripts: 20,
	keep: { light: 0.5, medium: 0.33, heavy: 0.25 } as Record<Level, number>,
	earlierTokens: 19333,
	keptTokens: { light: 9587, medium: 6422, heavy: 4870 } as Record<
		Level,
		number
	>,
	loosy: {
		light: est(0.863, 0.79, 0.93),
		medium: est(0.817, 0.76, 0.88),
		heavy: est(0.794, 0.73, 0.85),
	} as Record<Level, Est>,
	summary: {
		light: est(0.97, 0.95, 0.99),
		medium: est(0.936, 0.9, 0.96),
		heavy: est(0.935, 0.89, 0.97),
	} as Record<Level, Est>,
	/** Paired summary − loosy, sign-test p. */
	gap: {
		light: { delta: 0.106, p: 0.039 },
		medium: { delta: 0.118, p: 0.021 },
		heavy: { delta: 0.141, p: 0.021 },
	} as Record<Level, { delta: number; p: number }>,
	/** Local Qwen3 summaries at medium, and the share of their budget they used. */
	local: [
		{ model: "Qwen3-1.7B", acc: est(0.507, 0.43, 0.59), fidelity: 0.62 },
		{ model: "Qwen3-4B", acc: est(0.529, 0.46, 0.59), fidelity: 0.52 },
		{ model: "Qwen3-8B", acc: est(0.556, 0.48, 0.64), fidelity: 0.37 },
	],
	/** loosy-medium − lsum8b-medium. */
	loosyOver8b: { delta: 0.261, p: 0.004 },
} as const;

/**
 * Lossless supersession over the 1.50M-token Phase 1–2 corpus. Source:
 * exp_c_summary.txt; selection cost from exp_g_summary.txt.
 */
export const SUPERSEDE = {
	source: "exp_c_summary.txt",
	corpusTokens: 1503755,
	removedTokens: 373635,
	share: 0.248,
	secondsPer100k: 0.24,
} as const;

export interface Shot {
	id: string;
	delta: number;
	p: number;
	set: string;
	source: string;
}

/**
 * Attempts to beat plain loosy, each as a paired difference at the light
 * level unless noted. "hybrid" is measured against the summary alone, and
 * "decay" against plain continuous freeze.
 */
export const SHOTS: readonly Shot[] = [
	{
		id: "slot",
		delta: -0.117,
		p: 0.008,
		set: "set C",
		source: "exp_slot_downstream.md",
	},
	{
		id: "slm",
		delta: -0.048,
		p: 0.219,
		set: "set C",
		source: "exp_slot_downstream.md",
	},
	{
		id: "line",
		delta: -0.028,
		p: 0.146,
		set: "set D",
		source: "exp_slot_downstream_d.md",
	},
	{
		id: "gentle",
		delta: -0.02,
		p: 0.227,
		set: "set D",
		source: "exp_slot_downstream_d.md",
	},
	{
		id: "decay",
		delta: 0.003,
		p: 0.503,
		set: "set F",
		source: "exp_continuous_f.md",
	},
	{
		id: "hybrid",
		delta: 0.007,
		p: 1.0,
		set: "set D",
		source: "exp_slot_downstream_d.md",
	},
];

export type Arm = "full" | "freeze" | "tloosy" | "qthresh";

/**
 * Set F replayed with open-weight models only: Qwen3-8B answering,
 * Mistral-Nemo-12B writing and grading probes, 25 transcripts. Source:
 * exp_continuous_qwen.md.
 */
export const OPEN_WEIGHT = {
	source: "exp_continuous_qwen.md",
	transcripts: 25,
	checkpoints: 75,
	fullOverWindow: 15,
	/** Transcripts full context could be graded on at each checkpoint (it is refused over the window). */
	fullN: [25, 21, 14] as const,
	positions: [0.5, 0.75, 1] as const,
	byPosition: {
		full: [0.763, 0.706, 0.659],
		freeze: [0.774, 0.678, 0.68],
		tloosy: [0.76, 0.654, 0.615],
		qthresh: [0.735, 0.531, 0.529],
	} as Record<Arm, readonly [number, number, number]>,
	overall: {
		full: 0.717,
		freeze: 0.71,
		tloosy: 0.677,
		qthresh: 0.595,
	} as Record<Arm, number>,
	contextPerTurn: {
		full: 18827,
		freeze: 12355,
		tloosy: 12482,
		qthresh: 11788,
	} as Record<Arm, number>,
	freezeVsFull: { delta: -0.004, p: 0.648 },
	// The table prints p=0.000; formatP shows it as "< 0.001".
	freezeVsSelfSummary: { delta: 0.113, p: 0 },
	freezeVsThreshold: { delta: 0.034, p: 0.007 },
} as const;
