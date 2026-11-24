/** Fixed, repeatable "randomness" for the crowd: the same seats every render. */
function seat(i: number): number {
	return ((i * 2654435761) >>> 0) % 997;
}

const TONES = ["fk-fan-a", "fk-fan-b", "fk-fan-c", "fk-fan-d", "fk-fan-e"];

/**
 * The ballpark behind the opener: light towers, a crowd in the stands and the
 * outfield wall. Each layer carries a depth, so useParallax drifts the far
 * ones slower than the near ones.
 */
export function Stadium({
	width,
	height,
}: {
	width: number;
	height: number;
}): React.ReactElement {
	const wallTop = height - 46;
	const rows = 5;
	const gap = 13;
	const fans: { x: number; y: number; r: number; tone: string }[] = [];
	for (let row = 0; row < rows; row++) {
		const y = wallTop - 12 - row * gap;
		const step = 15 - row;
		for (let x = (row % 2) * 7; x < width + step; x += step) {
			const n = seat(row * 1000 + Math.round(x));
			if (n % 9 === 0) continue;
			fans.push({
				x: x + (n % 5) - 2,
				y: y + ((n >> 3) % 4) - 2,
				r: 5.2 - row * 0.35,
				tone: TONES[n % TONES.length] ?? "fk-fan-a",
			});
		}
	}
	const towerX = [width * 0.12, width * 0.88];
	return (
		<svg
			className="fk-stadium"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			aria-hidden="true"
		>
			<g className="fk-towers" data-depth="0.22">
				{towerX.map((tx) => (
					<g key={tx} transform={`translate(${tx} 0)`}>
						<rect
							className="fk-tower"
							x={-2.5}
							y={34}
							width={5}
							height={height}
						/>
						<rect
							className="fk-lamps"
							x={-30}
							y={10}
							width={60}
							height={26}
							rx={3}
						/>
						{[0, 1, 2, 3, 4].map((i) => (
							<circle
								key={i}
								className="fk-lamp"
								cx={-22 + i * 11}
								cy={23}
								r={3.4}
							/>
						))}
					</g>
				))}
			</g>
			<g className="fk-crowd" data-depth="0.12">
				<rect
					className="fk-stands"
					x={0}
					y={wallTop - rows * gap - 10}
					width={width}
					height={rows * gap + 12}
				/>
				{fans.map((f) => (
					<circle
						key={`${f.x}-${f.y}`}
						className={`fk-fan ${f.tone}`}
						cx={f.x}
						cy={f.y}
						r={f.r}
					/>
				))}
			</g>
			<g className="fk-wall">
				<rect
					className="fk-wall-face"
					x={0}
					y={wallTop}
					width={width}
					height={46}
				/>
				<line
					className="fk-wall-cap"
					x1={0}
					x2={width}
					y1={wallTop + 1.5}
					y2={wallTop + 1.5}
				/>
			</g>
		</svg>
	);
}
