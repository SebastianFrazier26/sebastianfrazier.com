// Arcade-style players as pixel sprites. The bodies are hand-drawn grids; the
// arms, bat and glove of each animation frame are rasterised onto the same
// grid from a few line segments, so every frame keeps the shoulder, contact
// point and glove pocket the scenes aim at.

export const PX = 4;

export type Point = readonly [number, number];

/** One filled grid cell: column, row and palette key. */
export interface Cell {
	c: number;
	r: number;
	k: string;
}

/** Back to front, so outlines sit under nothing they should cover. */
export const PAINT_ORDER = "ohcsejtpqbkwgldx".split("");

// Batter, facing right. Origin of the grid's top-left cell, in figure units
// (feet at y = 0). Keys: o outline, c cap/helmet, x its shine, s skin, e eye,
// h hair, j jersey, t jersey trim, p pants, q socks, b belt, k cleats.
const BATTER_OX = -22;
const OY = -96;

const HELMET = [
	"....ooooo.....",
	"...oxxcccoo...",
	"..occcccccco..",
	"..occcccccccco",
	"..occcssssooo.",
	"..occcsssesso.",
	"...occssssssso",
	"....ossssssoo.",
];

const CAP = [
	"....ooooo.....",
	"...oxccccoo...",
	"..occcccccco..",
	"..occcccccccco",
	"..ohsssssooo..",
	"..ohssssesso..",
	"..ossssssssso.",
	"...osssssoo...",
];

const BODY = [
	"..oojjjjjjoo..",
	"..ojjjjjjjjo..",
	"..ojjjjjtjjo..",
	"..ojjjjjtjjo..",
	"..ojjjjjtjjo..",
	"..obbbbbbbbo..",
	"..oppppppppo..",
	"..opppppppppo.",
	"..oppppopppo..",
	"..opppo.opppo.",
	".oppo...opppo.",
	".oqqo....oqqo.",
	".oqqo....oqqo.",
	"oqqo.....oqqo.",
	"okkkk....okkkk",
	"oooooo...ooooo",
];

export const BATTER_GRID = [...HELMET, ...BODY];
const FIELDER_SOURCE = [...CAP, ...BODY];
/** The fielder faces the batter, so his grid is the source mirrored. */
export const FIELDER_GRID = FIELDER_SOURCE.map((row) =>
	[...row].reverse().join(""),
);
const FIELDER_OX = -22;

export function gridCells(grid: readonly string[]): Cell[] {
	const cells: Cell[] = [];
	grid.forEach((row, r) => {
		[...row].forEach((k, c) => {
			if (k !== ".") cells.push({ c, r, k });
		});
	});
	return cells;
}

/** Path data per palette key, one subpath per horizontal run of cells. */
export function cellPaths(
	cells: readonly Cell[],
	ox: number,
	oy: number,
): Record<string, string> {
	const byKey = new Map<string, Map<number, number[]>>();
	for (const { c, r, k } of cells) {
		const rows = byKey.get(k) ?? new Map<number, number[]>();
		const cols = rows.get(r) ?? [];
		cols.push(c);
		rows.set(r, cols);
		byKey.set(k, rows);
	}
	const out: Record<string, string> = {};
	for (const [k, rows] of byKey) {
		let d = "";
		for (const [r, cols] of [...rows].sort((a, b) => a[0] - b[0])) {
			cols.sort((a, b) => a - b);
			let start = cols[0] ?? 0;
			for (let i = 1; i <= cols.length; i++) {
				const prev = cols[i - 1] ?? 0;
				if (cols[i] === prev + 1) continue;
				const w = (prev - start + 1) * PX;
				d += `M${ox + start * PX} ${oy + r * PX}h${w}v${PX}h${-w}z`;
				start = cols[i] ?? 0;
			}
		}
		out[k] = d;
	}
	return out;
}

/** A thick segment or a disc (from === to) painted with one key. */
export interface Stroke {
	from: Point;
	to: Point;
	radius: number;
	k: string;
}

function distance(p: Point, a: Point, b: Point): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len2 = dx * dx + dy * dy;
	const t =
		len2 === 0
			? 0
			: Math.max(
					0,
					Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2),
				);
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Rasterises strokes onto the grid (later strokes win a cell), then rings the
 * result with a one-cell outline the way an arcade sprite is inked.
 */
export function rasterise(
	strokes: readonly Stroke[],
	ox: number,
	oy: number,
): Cell[] {
	const fill = new Map<string, Cell>();
	for (const s of strokes) {
		const pad = s.radius + PX;
		const c0 = Math.floor((Math.min(s.from[0], s.to[0]) - pad - ox) / PX);
		const c1 = Math.ceil((Math.max(s.from[0], s.to[0]) + pad - ox) / PX);
		const r0 = Math.floor((Math.min(s.from[1], s.to[1]) - pad - oy) / PX);
		const r1 = Math.ceil((Math.max(s.from[1], s.to[1]) + pad - oy) / PX);
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				const centre: Point = [ox + (c + 0.5) * PX, oy + (r + 0.5) * PX];
				if (distance(centre, s.from, s.to) <= s.radius) {
					fill.set(`${c},${r}`, { c, r, k: s.k });
				}
			}
		}
	}
	const outline = new Map<string, Cell>();
	for (const { c, r } of fill.values()) {
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		] as const) {
			const key = `${c + dc},${r + dr}`;
			if (!fill.has(key)) outline.set(key, { c: c + dc, r: r + dr, k: "o" });
		}
	}
	return [...outline.values(), ...fill.values()];
}

function along(a: Point, b: Point, t: number): Point {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Shoulder both arms swing from; matches BATTER.pivot to within a cell. */
export const SHOULDER: Point = [4, -58];

export interface SwingPose {
	/** The scene's swing angle this frame stands for; 0 is contact. */
	angle: number;
	hands: Point;
	/** Direction the bat points from the hands (normalised here). */
	bat: Point;
	length: number;
}

export const SWING_POSES: readonly SwingPose[] = [
	{ angle: -165, hands: [-4, -68], bat: [-0.42, -0.91], length: 34 },
	{ angle: -110, hands: [2, -61], bat: [-0.95, -0.3], length: 34 },
	{ angle: -50, hands: [12, -57], bat: [0.55, -0.84], length: 32 },
	{ angle: 0, hands: [17, -55], bat: [35, -5], length: 36 },
];

export function swingStrokes(pose: SwingPose): Stroke[] {
	const n = Math.hypot(pose.bat[0], pose.bat[1]);
	const dir: Point = [pose.bat[0] / n, pose.bat[1] / n];
	const at = (d: number): Point => [
		pose.hands[0] + dir[0] * d,
		pose.hands[1] + dir[1] * d,
	];
	return [
		{ from: pose.hands, to: at(13), radius: 2.9, k: "w" },
		{ from: at(13), to: at(pose.length), radius: 4.7, k: "w" },
		{
			from: SHOULDER,
			to: along(SHOULDER, pose.hands, 0.4),
			radius: 4.6,
			k: "j",
		},
		{
			from: along(SHOULDER, pose.hands, 0.4),
			to: pose.hands,
			radius: 4.2,
			k: "s",
		},
		{ from: pose.hands, to: pose.hands, radius: 4.4, k: "g" },
	];
}

/** The tip of the bat in a pose, for tests and for aiming. */
export function batTip(pose: SwingPose): Point {
	const n = Math.hypot(pose.bat[0], pose.bat[1]);
	return [
		pose.hands[0] + (pose.bat[0] / n) * pose.length,
		pose.hands[1] + (pose.bat[1] / n) * pose.length,
	];
}

/** Nearest drawn frame to a swing angle the scene asks for. */
export function swingFrame(angle: number): number {
	let best = 0;
	SWING_POSES.forEach((p, i) => {
		const cur = SWING_POSES[best]?.angle ?? 0;
		if (Math.abs(p.angle - angle) < Math.abs(cur - angle)) best = i;
	});
	return best;
}

export const GLOVE_POCKET: Point = [-18, -92];
const FIELDER_SHOULDER: Point = [-8, -58];

export type CatchPose = "ready" | "catch";

/**
 * The catch arm bends out in front of the face (elbow ahead of the nose)
 * rather than running straight from shoulder to glove across it.
 */
export function catchStrokes(pose: CatchPose): Stroke[] {
	const glove: Point = pose === "catch" ? GLOVE_POCKET : [-24, -58];
	const elbow: Point = pose === "catch" ? [-28, -64] : [-16, -54];
	const hand: Point =
		pose === "catch" ? [glove[0] - 4, glove[1] + 8] : [glove[0] + 6, glove[1]];
	return [
		{ from: FIELDER_SHOULDER, to: elbow, radius: 4.6, k: "j" },
		{ from: elbow, to: hand, radius: 4.2, k: "s" },
		{ from: glove, to: glove, radius: 10.5, k: "l" },
		{ from: glove, to: glove, radius: 4.5, k: "d" },
	];
}

export const BATTER_SPRITE = {
	body: cellPaths(gridCells(BATTER_GRID), BATTER_OX, OY),
	frames: SWING_POSES.map((p) =>
		cellPaths(rasterise(swingStrokes(p), BATTER_OX, OY), BATTER_OX, OY),
	),
};

export const FIELDER_SPRITE = {
	body: cellPaths(gridCells(FIELDER_GRID), FIELDER_OX, OY),
	frames: {
		ready: cellPaths(
			rasterise(catchStrokes("ready"), FIELDER_OX, OY),
			FIELDER_OX,
			OY,
		),
		catch: cellPaths(
			rasterise(catchStrokes("catch"), FIELDER_OX, OY),
			FIELDER_OX,
			OY,
		),
	} satisfies Record<CatchPose, Record<string, string>>,
};
