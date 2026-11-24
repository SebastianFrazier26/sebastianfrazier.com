import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import { Ground } from "../kit/Ground.tsx";
import { gsap, useReveal } from "../kit/motion.ts";
import { SectionHead } from "../kit/SectionHead.tsx";
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

	const focus = `${(x(before) + x(after)) / 2} ${G - 52}`;
	const frame = {
		x0: x(after) - zoneW / 2 - 10,
		x1: x(after) + zoneW / 2 + 10,
		y0: G - 114,
		y1: G + 8,
	};
	const corner = 12;

	// A replay booth: the camera pushes in on the zone, the tape rewinds it
	// (with ghost frames) from where the first test put it to where the rebuilt
	// one does, the booth frames the call, and the camera pulls back out.
	useReveal(
		root,
		() =>
			gsap
				.timeline({ defaults: { ease: "power2.inOut" } })
				.from(".rv-ghost", { opacity: 0, duration: 0.4 })
				.from(
					".rv-replay",
					{
						opacity: 0,
						scale: 0.6,
						transformOrigin: "0% 50%",
						duration: 0.45,
						ease: "back.out(2.6)",
					},
					"<0.1",
				)
				.to(
					".rv-stage",
					{ scale: narrow ? 1.12 : 1.2, svgOrigin: focus, duration: 0.8 },
					"<",
				)
				.fromTo(
					".rv-trail",
					{ x: shift, opacity: (i: number) => 0.32 - i * 0.08 },
					{
						x: 0,
						opacity: 0,
						duration: (i: number) => 1.25 + i * 0.12,
						ease: "power4.inOut",
					},
					">-0.1",
				)
				.from(
					".rv-zone",
					{ x: shift, duration: 1.2, ease: "power4.inOut" },
					"<",
				)
				.from(
					".rv-zone",
					{ skewX: shift > 0 ? 8 : -8, duration: 1.2, ease: "power2.out" },
					"<0.3",
				)
				.from(
					".rv-arrow",
					{
						opacity: 0.25,
						duration: 0.18,
						// An even number of plays, so the last one lands on full opacity.
						repeat: 4,
						yoyo: true,
						ease: "none",
					},
					"<-0.3",
				)
				.from(
					".rv-plate",
					{
						scale: 1.4,
						transformOrigin: "50% 50%",
						duration: 0.5,
						ease: "back.out(3)",
					},
					">-0.25",
				)
				.from(
					".rv-frame",
					{
						opacity: 0,
						scale: 1.25,
						svgOrigin: `${x(after)} ${G - 52}`,
						duration: 0.4,
						ease: "power3.out",
					},
					"<",
				)
				.to(".rv-stage", { scale: 1, svgOrigin: focus, duration: 0.8 }, ">0.2")
				.from(".rv-after", { opacity: 0, x: -10, duration: 0.3 }, "<0.3"),
		width,
		{ pin: ".rv-pin", distance: "+=140%" },
	);

	return (
		<section className="fk-section rv" ref={root} aria-labelledby="rv-title">
			<div className="fk-wrap">
				<SectionHead
					id="rv-title"
					numeral="R"
					inning={COPY.review.inning}
					title={COPY.review.title}
				>
					<p className="fk-copy">{COPY.review.body}</p>
				</SectionHead>
			</div>
			<div className="fk-bleed rv-pin">
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
						<g className="rv-stage">
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
									x={
										narrow ? x(before) + zoneW / 2 : x(before) + zoneW / 2 + 10
									}
									y={narrow ? G - 114 : G - 86}
									textAnchor={narrow ? "end" : "start"}
								>
									{COPY.review.before} · about {signed(before, 2)}
								</text>
							</g>
							{[0, 1, 2].map((i) => (
								<rect
									key={i}
									className="rv-box rv-trail"
									x={x(after) - zoneW / 2}
									y={G - 104}
									width={zoneW}
									height={104}
									rx={4}
									opacity={0}
								/>
							))}
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
							<g transform={`translate(${x(0)} ${G - 16})`}>
								<path className="rv-plate" d="M-13 0 H13 V8 L0 18 L-13 8 Z" />
							</g>
							<path
								className="rv-frame"
								d={`M${frame.x0} ${frame.y0 + corner}V${frame.y0}H${frame.x0 + corner}M${frame.x1 - corner} ${frame.y0}H${frame.x1}V${frame.y0 + corner}M${frame.x1} ${frame.y1 - corner}V${frame.y1}H${frame.x1 - corner}M${frame.x0 + corner} ${frame.y1}H${frame.x0}V${frame.y1 - corner}`}
							/>
						</g>
						<g
							transform={narrow ? `translate(10 ${H - 36})` : "translate(10 8)"}
						>
							{/* GSAP owns the inner group's transform; layout owns the outer one. */}
							<g className="rv-replay">
								<rect
									className="rv-replay-chip"
									width={108}
									height={26}
									rx={5}
								/>
								<path
									className="rv-arrow"
									d="M20 6 L11 13 L20 20 Z M29 6 L20 13 L29 20 Z"
								/>
								<text className="rv-replay-text" x={37} y={18}>
									{COPY.review.replay}
								</text>
							</g>
						</g>
					</svg>
				</div>
			</div>
		</section>
	);
}
