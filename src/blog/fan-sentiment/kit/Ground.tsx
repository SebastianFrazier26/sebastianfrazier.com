import { signed } from "../format.ts";

/** The chalk baseline of a scene with its effect ticks underneath. */
export function Ground({
	x,
	y,
	from,
	to,
	ticks,
	digits = 2,
}: {
	x: (value: number) => number;
	y: number;
	from: number;
	to: number;
	ticks: number[];
	digits?: number;
}): React.ReactElement {
	return (
		<g>
			<line className="fk-ground" x1={from} x2={to} y1={y} y2={y} />
			{ticks.map((t) => (
				<g key={t} transform={`translate(${x(t)} ${y})`}>
					<line className="fk-tick" y1={6} y2={15} />
					<text className="fk-tick-label" y={36} textAnchor="middle">
						{t === 0 ? "0" : signed(t, digits)}
					</text>
				</g>
			))}
		</g>
	);
}
