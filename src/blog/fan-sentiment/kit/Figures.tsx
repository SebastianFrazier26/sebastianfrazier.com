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

interface Placed {
	x: number;
	y: number;
	scale?: number;
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

export function Batter({ x, y, scale = 1 }: Placed): React.ReactElement {
	return (
		<g
			className="fk-figure fk-batter"
			transform={`translate(${x} ${y}) scale(${scale})`}
		>
			<line className="fk-leg" x1={-2} y1={-34} x2={-11} y2={-4} />
			<line className="fk-leg" x1={3} y1={-34} x2={12} y2={-4} />
			<line
				className="fk-jersey fk-jersey-clay"
				x1={0}
				y1={-38}
				x2={2}
				y2={-60}
			/>
			<circle className="fk-head" cx={4} cy={-80} r={11} />
			<path className="fk-cap" d="M-7.5 -82 a11.5 11.5 0 0 1 23 0 z" />
			<line className="fk-brim" x1={14} y1={-82} x2={24} y2={-80.5} />
			<g className="fk-swing">
				<line className="fk-arm" x1={2} y1={-60} x2={17} y2={-55} />
				<line className="fk-bat" x1={17} y1={-55} x2={52} y2={-60} />
			</g>
		</g>
	);
}

export function Fielder({ x, y, scale = 1 }: Placed): React.ReactElement {
	return (
		<g
			className="fk-figure fk-fielder"
			transform={`translate(${x} ${y}) scale(${scale})`}
		>
			<g className="fk-hop">
				<line className="fk-leg" x1={-3} y1={-34} x2={-11} y2={-4} />
				<line className="fk-leg" x1={2} y1={-34} x2={11} y2={-4} />
				<line
					className="fk-jersey fk-jersey-chalk"
					x1={0}
					y1={-38}
					x2={-1}
					y2={-60}
				/>
				<circle className="fk-head" cx={-3} cy={-80} r={11} />
				<path className="fk-cap" d="M-14.5 -82 a11.5 11.5 0 0 1 23 0 z" />
				<line className="fk-brim" x1={-13} y1={-82} x2={-23} y2={-80.5} />
				<line className="fk-arm" x1={-1} y1={-60} x2={-14} y2={-84} />
				<circle className="fk-glove" cx={-17} cy={-92} r={10} />
			</g>
		</g>
	);
}
