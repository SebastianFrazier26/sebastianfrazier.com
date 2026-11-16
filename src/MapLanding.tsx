import { useSyncExternalStore } from "react";
import {
	type DecorKind,
	decorSlots,
	layoutMarkers,
	type MapProject,
	type MapShape,
	playPath,
} from "./mapData.ts";
import type { ShelfState } from "./useShelf.ts";

const SPRITES = "/assets/placeholders/";
const CABIN = `${SPRITES}prop_shelf_cabin_soft.png`;

// width is the sprite's native pixel width at the 1100px-wide design size,
// expressed as container-relative units so the scenery scales with the map.
const DESIGN_WIDTH = 1100;
const SCENERY: Record<DecorKind, { file: string; width: number }[]> = {
	edge: [
		{ file: "prop_tree_large_soft.png", width: 136 },
		{ file: "scenery_pine_soft.png", width: 84 },
		{ file: "scenery_blossom_oak_soft.png", width: 120 },
		{ file: "scenery_oak_soft.png", width: 120 },
	],
	gap: [
		{ file: "scenery_flower_patch_soft.png", width: 84 },
		{ file: "scenery_shrub_soft.png", width: 78 },
		{ file: "scenery_berry_shrub_soft.png", width: 78 },
		{ file: "scenery_mushroom_soft.png", width: 30 },
		{ file: "scenery_boulder_soft.png", width: 90 },
	],
	side: [
		{ file: "scenery_oak_soft.png", width: 150 },
		{ file: "scenery_pond_soft.png", width: 260 },
		{ file: "scenery_pine_soft.png", width: 110 },
		{ file: "scenery_windmill_soft.png", width: 130 },
		{ file: "scenery_blossom_oak_soft.png", width: 150 },
		{ file: "prop_well_soft.png", width: 110 },
	],
};

const WIDE_QUERY = "(min-width: 720px)";

function subscribeWide(notify: () => void): () => void {
	const query = window.matchMedia(WIDE_QUERY);
	query.addEventListener("change", notify);
	return () => query.removeEventListener("change", notify);
}

function useShape(): MapShape {
	const wide = useSyncExternalStore(
		subscribeWide,
		() => window.matchMedia(WIDE_QUERY).matches,
		() => true,
	);
	return wide ? "wide" : "tall";
}

function Trail({
	points,
}: {
	points: { x: number; y: number }[];
}): React.ReactElement | null {
	if (points.length < 2) return null;
	const d = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
	return (
		<svg
			className="map-trail"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path className="map-trail-edge" d={d} />
			<path className="map-trail-bed" d={d} />
		</svg>
	);
}

function MapBody({
	projects,
	onNavigate,
}: {
	projects: MapProject[];
	onNavigate: (path: string) => void;
}): React.ReactElement {
	const shape = useShape();
	const layout = layoutMarkers(projects.length, shape);
	const slots = decorSlots(projects.length, shape);
	const counters: Record<DecorKind, number> = { edge: 0, gap: 0, side: 0 };

	return (
		<div
			className={`map-world map-${shape}`}
			style={{ aspectRatio: `1 / ${layout.aspect}` }}
		>
			<div className="map-sky" style={{ height: `${layout.skyPercent}%` }}>
				<div className="map-hills" />
			</div>
			<Trail points={layout.points} />
			{slots.map((slot) => {
				const pool = SCENERY[slot.kind];
				const sprite = pool[counters[slot.kind]++ % pool.length];
				if (!sprite) return null;
				return (
					<img
						key={`${slot.kind}-${slot.x}-${slot.y}`}
						className="map-scenery"
						src={`${SPRITES}${sprite.file}`}
						alt=""
						style={{
							left: `${slot.x}%`,
							top: `${slot.y}%`,
							width: `${(sprite.width / DESIGN_WIDTH) * 100}cqw`,
						}}
					/>
				);
			})}
			<ul className="map-markers">
				{projects.map((project, i) => {
					const point = layout.points[i];
					if (!point) return null;
					const href = playPath(project.slug);
					return (
						<li
							key={project.slug}
							style={{ left: `${point.x}%`, top: `${point.y}%` }}
						>
							<a
								className="map-marker"
								href={href}
								onClick={(event) => {
									if (
										event.metaKey ||
										event.ctrlKey ||
										event.shiftKey ||
										event.button !== 0
									)
										return;
									event.preventDefault();
									onNavigate(href);
								}}
							>
								<img className="map-cabin" src={CABIN} alt="" />
								<span className="map-plate">
									<span className="map-plate-name">{project.name}</span>
									{project.description && (
										<span className="map-plate-desc">
											{project.description}
										</span>
									)}
								</span>
							</a>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export function MapLanding({
	shelf,
	onNavigate,
}: {
	shelf: ShelfState;
	onNavigate: (path: string) => void;
}): React.ReactElement {
	const enter = (event: React.MouseEvent<HTMLAnchorElement>): void => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
			return;
		event.preventDefault();
		onNavigate(playPath());
	};

	return (
		<main className="map-page">
			<header className="map-head">
				<h1>Sebastian Frazier</h1>
				<p>
					A map of the base world. Pick a place to walk into, or take the main
					road.
				</p>
				<a className="map-enter" href={playPath()} onClick={enter}>
					Enter the worlds
				</a>
			</header>
			<nav className="map-frame" aria-label="Projects">
				{shelf.status === "ready" && shelf.projects.length > 0 ? (
					<MapBody projects={shelf.projects} onNavigate={onNavigate} />
				) : (
					<p className="map-note" role="status">
						{shelf.status === "loading"
							? "Unrolling the map…"
							: "The map couldn't be unrolled. The worlds are still open."}
					</p>
				)}
			</nav>
			<footer className="map-foot">
				<a href="https://github.com/SebastianFrazier26">GitHub</a>
			</footer>
		</main>
	);
}
