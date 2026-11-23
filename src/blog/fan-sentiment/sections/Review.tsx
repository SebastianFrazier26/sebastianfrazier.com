import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import { Ground } from "../kit/Ground.tsx";
import { gsap, useReveal } from "../kit/motion.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const H = 190;
const G = 132;

/**
 * The permutation-null fix as a strike zone that was drawn off the plate:
 * the zone slides from where the first test put "no effect" to where the
 * rebuilt one does.
 */
export function Review({
	before,
	after,
}: {
	before: number;
	after: number;
}): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const narrow = width < 600;
	const x = scaleLinear()
		.domain([-0.06, 0.09])
		.range([24, width - 24]);
	const zoneW = narrow ? 56 : 84;
	const shift = x(before) - x(after);

	useReveal(
		root,
		() =>
			gsap
				.timeline({ defaults: { ease: "power2.inOut" } })
				.from(".rv-ghost", { opacity: 0, duration: 0.4 })
				.from(".rv-zone", { x: shift, duration: 1.1 }, ">0.3")
				.from(".rv-after", { opacity: 0, duration: 0.3 }),
		width,
	);

	return (
		<section className="fk-section rv" ref={root} aria-labelledby="rv-title">
			<div className="fk-wrap">
				<p className="fk-inning">{COPY.review.inning}</p>
				<h2 id="rv-title" className="fk-title">
					{COPY.review.title}
				</h2>
				<p className="fk-copy">{COPY.review.body}</p>
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label={`The test's idea of no effect sat near ${signed(
							before,
							2,
						)} in the first version and near ${signed(after, 3)} once rebuilt.`}
					>
						<g className="rv-ghost">
							<rect
								className="fk-zone rv-ghost-box"
								x={x(before) - zoneW / 2}
								y={G - 104}
								width={zoneW}
								height={104}
								rx={4}
							/>
							<text
								className="fk-note"
								x={x(before) + zoneW / 2 + 10}
								y={G - 86}
							>
								{COPY.review.before} · about {signed(before, 2)}
							</text>
						</g>
						<g className="rv-zone">
							<rect
								className="rv-box"
								x={x(after) - zoneW / 2}
								y={G - 104}
								width={zoneW}
								height={104}
								rx={4}
							/>
						</g>
						<text
							className="fk-note rv-after"
							x={x(after) - zoneW / 2 - 10}
							y={G - 86}
							textAnchor="end"
						>
							{COPY.review.after}
						</text>
						<Ground
							x={x}
							y={G}
							from={8}
							to={width - 8}
							ticks={narrow ? [0, 0.03] : [-0.03, 0, 0.03, 0.06]}
						/>
						<path
							className="rv-plate"
							transform={`translate(${x(0)} ${G - 16})`}
							d="M-13 0 H13 V8 L0 18 L-13 8 Z"
						/>
					</svg>
				</div>
			</div>
		</section>
	);
}
