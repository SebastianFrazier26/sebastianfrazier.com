// The goose as a pixel sprite: hand-drawn grids, one per frame, facing right
// with its feet on the bottom row. Keys: o outline, w feathers, g wing shade,
// p cheek, e eye, b beak, f legs and feet.

export const GOOSE_COLS = 20;
export const GOOSE_ROWS = 20;
/** Grid column under the body's centre: the sprite's x origin. */
export const GOOSE_OX = 8;

const BODY = [
	"..........owwwwo....",
	"...........owwo.....",
	"...........owwo.....",
	"...........owwo.....",
	"..........owwwo.....",
	".oo......owwwwo.....",
	".owwooooowwwwwwo....",
	".owwwwwwwwwwwwwwo...",
	"..owggggggwwwwwwo...",
	"..owwggggwwwwwwo....",
	"...owwwwwwwwwwo.....",
	"....oowwwwwwoo......",
];

const STAND = [
	".......f....f.......",
	".......f....f.......",
	".......ff...ff......",
];

const STEP = [
	".......f.....f......",
	"......f......f......",
	".....ff......ff.....",
];

const HEAD = [
	"...........oooo.....",
	"..........owwwwo....",
	"..........owwweo....",
	"..........owwwwbbbo.",
	"..........owpwwbbo..",
];

const HEAD_HONK = [
	"...........oooo.....",
	"..........owwwwo.bo.",
	"..........owwweo.bo.",
	"..........owwwwbbo..",
	"..........owpwwo....",
];

/** The neck's first row under an open beak carries the lower bill. */
const BODY_HONK = ["..........owwwwobo..", ...BODY.slice(1)];

export type GooseFrame = "idle" | "honk" | "step";

export const GOOSE_FRAMES: Record<GooseFrame, readonly string[]> = {
	idle: [...HEAD, ...BODY, ...STAND],
	honk: [...HEAD_HONK, ...BODY_HONK, ...STAND],
	step: [...HEAD, ...BODY, ...STEP],
};

/** Paint order, back to front. */
export const GOOSE_KEYS = ["o", "w", "g", "p", "e", "b", "f"] as const;

/**
 * Path data per palette key for a grid drawn at `px` pixels a cell, one
 * subpath per horizontal run of same-key cells, so a frame is a handful of
 * paths rather than hundreds of rects.
 */
export function gridPaths(
	grid: readonly string[],
	px: number,
	ox: number,
	oy: number,
): Record<string, string> {
	const out: Record<string, string> = {};
	grid.forEach((row, r) => {
		let c = 0;
		while (c < row.length) {
			const k = row[c] as string;
			let end = c + 1;
			while (end < row.length && row[end] === k) end++;
			if (k !== ".") {
				const w = (end - c) * px;
				out[k] =
					`${out[k] ?? ""}M${ox + c * px} ${oy + r * px}h${w}v${px}h${-w}z`;
			}
			c = end;
		}
	});
	return out;
}
