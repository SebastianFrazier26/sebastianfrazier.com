// Pure data for the landing map and the /play?world= deep link. Both read the
// public shelf.json the engine already serves, so the map can never list a
// world the shelf does not have, and a private project's repo name (absent
// from shelf.json) is never reachable from here.

export const SHELF_URL = "/worlds/shelf.json";
const SHELF_BASE = SHELF_URL.slice(0, SHELF_URL.lastIndexOf("/") + 1);

// Same slug rule as projects.json ids (scripts/lib/projects.ts).
const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

export interface MapProject {
	/** The project's id in projects.json: the first segment of its worldUrl, and the `?world=` value. */
	slug: string;
	name: string;
	description: string;
	order: number;
	/** Absolute site path of the world's world.json, as the engine's boot scene wants it. */
	worldUrl: string;
	/** Position in shelf.json's `worlds`; the engine uses it to place the player back at the cabin. */
	shelfIndex: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * shelf.json is same-origin but still external input: entries that are not
 * well-formed are dropped rather than trusted. Returns null when the file is
 * not a shelf at all, so the caller can tell "no worlds" from "no map".
 */
export function parseShelfProjects(json: unknown): MapProject[] | null {
	if (!isRecord(json) || !Array.isArray(json.worlds)) return null;
	const seen = new Set<string>();
	const projects: MapProject[] = [];
	for (const [shelfIndex, entry] of json.worlds.entries()) {
		if (!isRecord(entry)) continue;
		const { name, worldUrl, description, order } = entry;
		if (typeof name !== "string" || typeof worldUrl !== "string") continue;
		const slug = worldUrl.split("/")[0] ?? "";
		const file = worldUrl.split("/").slice(1).join("/");
		if (!SLUG.test(slug) || file !== "world.json" || seen.has(slug)) continue;
		seen.add(slug);
		projects.push({
			slug,
			name,
			description: typeof description === "string" ? description : "",
			order: typeof order === "number" ? order : Number.MAX_SAFE_INTEGER,
			worldUrl: `${SHELF_BASE}${worldUrl}`,
			shelfIndex,
		});
	}
	return projects.sort(
		(a, b) => a.order - b.order || a.name.localeCompare(b.name),
	);
}

/** `?world=` value to a project; anything unknown or malformed means the base world (null). */
export function resolveWorld(
	param: string | null,
	projects: readonly MapProject[],
): MapProject | null {
	if (param === null || !SLUG.test(param)) return null;
	return projects.find((p) => p.slug === param) ?? null;
}

export function playPath(slug?: string): string {
	return slug ? `/play?world=${encodeURIComponent(slug)}` : "/play";
}

export type MapShape = "wide" | "tall";

export interface MapPoint {
	/** Percent of the map's width and height. */
	x: number;
	y: number;
}

export interface MapLayout {
	/** Map height as a multiple of its width. */
	aspect: number;
	/** Height of the sky and hill band, percent of the map's height. */
	skyPercent: number;
	points: MapPoint[];
}

const WIDE_COLUMNS = 3;
const WIDE_X = [20, 50, 80];
// Rows sit below the sky and hill band, which takes the top SKY_* units of height
// (the map is 100 units wide).
const SKY_WIDE = 12;
const SKY_TALL = 20;

/**
 * Where each marker sits. Wide: rows of three walked in a serpentine (the
 * second row runs right to left) so the trail between consecutive projects
 * never crosses the map. Tall (phones): one column zigzagging left and right.
 */
export function layoutMarkers(count: number, shape: MapShape): MapLayout {
	if (count <= 0) return { aspect: 0.5, skyPercent: 30, points: [] };
	if (shape === "tall") {
		const rowUnits = 56;
		const height = SKY_TALL + rowUnits * count;
		return {
			aspect: height / 100,
			skyPercent: (SKY_TALL / height) * 100,
			points: Array.from({ length: count }, (_, i) => ({
				x: i % 2 === 0 ? 30 : 70,
				y: ((SKY_TALL + rowUnits * (i + 0.5)) / height) * 100,
			})),
		};
	}
	const rows = Math.ceil(count / WIDE_COLUMNS);
	const rowUnits = 26;
	const height = SKY_WIDE + rowUnits * rows;
	return {
		aspect: height / 100,
		skyPercent: (SKY_WIDE / height) * 100,
		points: Array.from({ length: count }, (_, i) => {
			const row = Math.floor(i / WIDE_COLUMNS);
			const col = i % WIDE_COLUMNS;
			const column = row % 2 === 0 ? col : WIDE_COLUMNS - 1 - col;
			return {
				x: WIDE_X[column] ?? 50,
				y: ((SKY_WIDE + rowUnits * (row + 0.5)) / height) * 100,
			};
		}),
	};
}

export type DecorKind = "edge" | "gap" | "side";

export interface DecorSlot extends MapPoint {
	kind: DecorKind;
}

/**
 * Open ground beside the markers, for scenery. Wide: the edges and the gaps
 * between columns of every row. Tall: the free side opposite each marker.
 * Anchors are bottom-centre of the sprite.
 */
export function decorSlots(count: number, shape: MapShape): DecorSlot[] {
	const { points } = layoutMarkers(count, shape);
	if (shape === "tall") {
		return points.map((p) => ({
			kind: "side",
			x: p.x < 50 ? 80 : 20,
			y: p.y + 4,
		}));
	}
	const rowYs = [...new Set(points.map((p) => p.y))];
	return rowYs.flatMap((y) => [
		{ kind: "edge" as const, x: 4.5, y: y + 9 },
		{ kind: "edge" as const, x: 95.5, y: y + 9 },
		{ kind: "gap" as const, x: 35, y: y + 13 },
		{ kind: "gap" as const, x: 65, y: y + 13 },
	]);
}
