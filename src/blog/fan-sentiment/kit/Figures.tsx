// The post's cast. Every figure's origin is the ground between its feet, so a
// scene places one with a single translate. Scenes never touch a figure's
// parts directly: they call swingTo and poseFielder, which turn the vector
// drawings' parts and flip the arcade sprites' frames.

import {
	BATTER_SPRITE,
	type CatchPose,
	FIELDER_SPRITE,
	PAINT_ORDER,
	SWING_POSES,
	swingFrame,
} from "./sprites.ts";

export const BATTER = {
	/** Shoulder the arms and bat swing around. */
	pivot: [2, -60] as const,
	/** Where the bat meets the ball, relative to the feet. */
	contact: [44, -56] as const,
	/** Bat angle before the swing; 0 is the follow-through drawn in markup. */
	cocked: -165,
};

export const FIELDER = {
	/** Pocket of the raised glove, relative to the feet. */
	glove: [-17, -92] as const,
};

export type FigureStyle = "arcade" | "simple" | "full";

/**
 * Which drawing of the players the post uses. "arcade" is a pixel sprite with
 * a few drawn frames per swing and catch; "simple" is a handful of rounded
 * strokes; "full" adds a shaped torso, shoes, a face and a proper mitt. All
 * share the same pivot, contact point and glove pocket, so scenes do not
 * change with the style.
 */
export const FIGURE_STYLE: FigureStyle = "arcade";

function Pixels({
	paths,
}: {
	paths: Record<string, string>;
}): React.ReactElement {
	return (
		<>
			{PAINT_ORDER.filter((k) => paths[k]).map((k) => (
				<path key={k} className={`fk-px fk-px-${k}`} d={paths[k]} />
			))}
		</>
	);
}

/** Sets a batter's swing: an angle from BATTER.cocked to 0 (contact). */
export function swingTo(batter: Element | null, angle: number): void {
	if (!batter) return;
	const frames = batter.querySelectorAll("[data-swing]");
	if (frames.length === 0) {
		batter
			.querySelector(".fk-swing")
			?.setAttribute(
				"transform",
				`rotate(${angle} ${BATTER.pivot[0]} ${BATTER.pivot[1]})`,
			);
		return;
	}
	const shown = String(swingFrame(angle));
	for (const f of frames) {
		f.setAttribute(
			"visibility",
			f.getAttribute("data-swing") === shown ? "visible" : "hidden",
		);
	}
}

/** Shows a fielder waiting with the glove low or reaching for the catch. */
export function poseFielder(fielder: Element | null, pose: CatchPose): void {
	for (const f of fielder?.querySelectorAll("[data-pose]") ?? []) {
		f.setAttribute(
			"visibility",
			f.getAttribute("data-pose") === pose ? "visible" : "hidden",
		);
	}
}

interface Placed {
	x: number;
	y: number;
	scale?: number;
	/** The arcade fielder's pose in the finished picture. */
	pose?: CatchPose;
	/** Overrides FIGURE_STYLE; the dev comparison page uses it. */
	variant?: FigureStyle;
}

export function Ball({
	x,
	y,
	r = 7,
	className = "fk-ball",
}: {
	x: number;
	y: number;
	r?: number;
	className?: string;
}): React.ReactElement {
	return (
		<g className={className} transform={`translate(${x} ${y})`}>
			<circle className="fk-ball-skin" r={r} />
			<path
				className="fk-ball-seam"
				d={`M${-r * 0.55} ${-r * 0.8} Q${-r * 0.1} 0 ${-r * 0.55} ${r * 0.8} M${
					r * 0.55
				} ${-r * 0.8} Q${r * 0.1} 0 ${r * 0.55} ${r * 0.8}`}
			/>
		</g>
	);
}

/**
 * A ball in flight, drawn at rest at `to` with its ground shadow; the ghosts
 * of its trail are invisible until flightDrawer moves them.
 */
export function Flight({
	to,
	ground,
	r = 7,
	className = "",
}: {
	to: readonly [number, number];
	ground: number;
	r?: number;
	className?: string;
}): React.ReactElement {
	return (
		<g className={`fk-flight ${className}`}>
			<ellipse
				className="fk-shadow"
				rx={r * 1.4}
				ry={r * 0.4}
				transform={`translate(${to[0]} ${ground})`}
				opacity={0.45}
			/>
			{[0, 1, 2, 3].map((i) => (
				<circle
					key={i}
					className="fk-ghost"
					r={r * (0.86 - i * 0.14)}
					transform={`translate(${to[0]} ${to[1]})`}
					opacity={0}
				/>
			))}
			<g className="fk-flight-ball" transform={`translate(${to[0]} ${to[1]})`}>
				<g className="fk-squash">
					<Ball x={0} y={0} r={r} />
				</g>
			</g>
		</g>
	);
}

/** Dirt specks at a landing spot, invisible until puff() throws them. */
export function Puff({
	x,
	y,
	className = "",
}: {
	x: number;
	y: number;
	className?: string;
}): React.ReactElement {
	return (
		<g className={`fk-puff ${className}`} transform={`translate(${x} ${y})`}>
			{[0, 1, 2, 3, 4, 5].map((i) => (
				<circle
					key={i}
					className="fk-speck"
					r={2.2 + (i % 3) * 0.9}
					cy={-2}
					opacity={0}
				/>
			))}
		</g>
	);
}

export function Batter({
	x,
	y,
	scale = 1,
	variant = FIGURE_STYLE,
}: Placed): React.ReactElement {
	const place = `translate(${x} ${y}) scale(${scale})`;
	if (variant === "arcade") {
		const last = SWING_POSES.length - 1;
		return (
			<g className="fk-figure fk-batter fk-arcade" transform={place}>
				<Pixels paths={BATTER_SPRITE.body} />
				{BATTER_SPRITE.frames.map((paths, i) => (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: frames are fixed and positional.
						key={i}
						data-swing={i}
						visibility={i === last ? "visible" : "hidden"}
					>
						<Pixels paths={paths} />
					</g>
				))}
			</g>
		);
	}
	const full = variant === "full";
	return (
		<g className="fk-figure fk-batter" transform={place}>
			{full && (
				<>
					<ellipse className="fk-shoe" cx={-10} cy={-2.5} rx={8} ry={4} />
					<ellipse className="fk-shoe" cx={14} cy={-2.5} rx={8} ry={4} />
				</>
			)}
			<line className="fk-leg" x1={-2} y1={-34} x2={-11} y2={-4} />
			<line className="fk-leg" x1={3} y1={-34} x2={12} y2={-4} />
			{full ? (
				<>
					<path
						className="fk-torso fk-torso-clay"
						d="M-11 -35 Q-14 -62 -3 -67 Q6 -70 12 -64 Q15 -52 13 -35 Q1 -30 -11 -35 Z"
					/>
					<line className="fk-belt" x1={-10} y1={-36} x2={12} y2={-36} />
				</>
			) : (
				<line
					className="fk-jersey fk-jersey-clay"
					x1={0}
					y1={-38}
					x2={2}
					y2={-60}
				/>
			)}
			<circle className="fk-head" cx={4} cy={-80} r={full ? 12 : 11} />
			<path
				className="fk-cap"
				d={
					full
						? "M-9 -82 a13 13 0 0 1 26 0 z"
						: "M-7.5 -82 a11.5 11.5 0 0 1 23 0 z"
				}
			/>
			<line
				className="fk-brim"
				x1={14}
				y1={-82}
				x2={full ? 27 : 24}
				y2={-80.5}
			/>
			{full && (
				<>
					<circle className="fk-eye" cx={10} cy={-77} r={1.6} />
					<path className="fk-smile" d="M7 -72.5 q3.5 2.6 6.5 -0.4" />
				</>
			)}
			<g className="fk-swing">
				{full && (
					<line
						className="fk-sleeve fk-sleeve-clay"
						x1={2}
						y1={-60}
						x2={9}
						y2={-57.5}
					/>
				)}
				<line className="fk-arm" x1={2} y1={-60} x2={17} y2={-55} />
				{full ? (
					<>
						<line
							className="fk-bat fk-bat-handle"
							x1={15}
							y1={-54.7}
							x2={32}
							y2={-57.2}
						/>
						<line
							className="fk-bat fk-bat-barrel"
							x1={32}
							y1={-57.2}
							x2={54}
							y2={-60.4}
						/>
					</>
				) : (
					<line className="fk-bat" x1={17} y1={-55} x2={52} y2={-60} />
				)}
			</g>
		</g>
	);
}

export function Fielder({
	x,
	y,
	scale = 1,
	pose: shown = "catch",
	variant = FIGURE_STYLE,
}: Placed): React.ReactElement {
	const place = `translate(${x} ${y}) scale(${scale})`;
	if (variant === "arcade") {
		return (
			<g className="fk-figure fk-fielder fk-arcade" transform={place}>
				<g className="fk-hop">
					<Pixels paths={FIELDER_SPRITE.body} />
					{(["ready", "catch"] as const).map((pose) => (
						<g
							key={pose}
							data-pose={pose}
							visibility={pose === shown ? "visible" : "hidden"}
						>
							<Pixels paths={FIELDER_SPRITE.frames[pose]} />
						</g>
					))}
				</g>
			</g>
		);
	}
	const full = variant === "full";
	return (
		<g className="fk-figure fk-fielder" transform={place}>
			<g className="fk-hop">
				{full && (
					<>
						<ellipse className="fk-shoe" cx={-13} cy={-2.5} rx={8} ry={4} />
						<ellipse className="fk-shoe" cx={10} cy={-2.5} rx={8} ry={4} />
					</>
				)}
				<line className="fk-leg" x1={-3} y1={-34} x2={-11} y2={-4} />
				<line className="fk-leg" x1={2} y1={-34} x2={11} y2={-4} />
				{full ? (
					<>
						<path
							className="fk-torso fk-torso-chalk"
							d="M11 -35 Q14 -62 3 -67 Q-6 -70 -12 -64 Q-15 -52 -13 -35 Q-1 -30 11 -35 Z"
						/>
						<line className="fk-belt" x1={-12} y1={-36} x2={10} y2={-36} />
						<line className="fk-stripe" x1={-1} y1={-62} x2={-1} y2={-40} />
					</>
				) : (
					<line
						className="fk-jersey fk-jersey-chalk"
						x1={0}
						y1={-38}
						x2={-1}
						y2={-60}
					/>
				)}
				{full && <line className="fk-arm" x1={-1} y1={-60} x2={-14} y2={-84} />}
				<circle className="fk-head" cx={-3} cy={-80} r={full ? 12 : 11} />
				<path
					className="fk-cap"
					d={
						full
							? "M-16 -82 a13 13 0 0 1 26 0 z"
							: "M-14.5 -82 a11.5 11.5 0 0 1 23 0 z"
					}
				/>
				<line
					className="fk-brim"
					x1={-13}
					y1={-82}
					x2={full ? -26 : -23}
					y2={-80.5}
				/>
				{full && (
					<>
						<circle className="fk-eye" cx={-9} cy={-77} r={1.6} />
						<path className="fk-smile" d="M-12.5 -72.9 q3 2.6 6.5 0.4" />
					</>
				)}
				{!full && (
					<line className="fk-arm" x1={-1} y1={-60} x2={-14} y2={-84} />
				)}
				{full ? (
					<>
						<circle className="fk-glove" cx={-17} cy={-92} r={10.5} />
						<circle className="fk-glove" cx={-9} cy={-86} r={5} />
						<path className="fk-glove-web" d="M-23 -97 q6 4 12 0" />
					</>
				) : (
					<circle className="fk-glove" cx={-17} cy={-92} r={10} />
				)}
			</g>
		</g>
	);
}
