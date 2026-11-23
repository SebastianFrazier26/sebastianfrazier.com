// The post's cast, drawn from a few rounded strokes each. Every figure's
// origin is the ground between its feet, so a scene places one with a single
// translate. Parts that move carry a class; scenes turn them by writing a
// `rotate(angle cx cy)` attribute in the figure's own coordinates.

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

export type FigureStyle = "simple" | "full";

/**
 * Which drawing of the players the post uses. "simple" is a handful of
 * rounded strokes; "full" adds a shaped torso, shoes, a face and a proper
 * mitt. Both share the same pivot, contact point and glove pocket, so scenes
 * do not change with the style.
 */
export const FIGURE_STYLE: FigureStyle = "simple";

interface Placed {
	x: number;
	y: number;
	scale?: number;
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

export function Batter({
	x,
	y,
	scale = 1,
	variant = FIGURE_STYLE,
}: Placed): React.ReactElement {
	const full = variant === "full";
	return (
		<g
			className="fk-figure fk-batter"
			transform={`translate(${x} ${y}) scale(${scale})`}
		>
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
	variant = FIGURE_STYLE,
}: Placed): React.ReactElement {
	const full = variant === "full";
	return (
		<g
			className="fk-figure fk-fielder"
			transform={`translate(${x} ${y}) scale(${scale})`}
		>
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
