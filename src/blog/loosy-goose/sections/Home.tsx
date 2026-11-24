import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { type Est, SET_D } from "../data.ts";
import { acc, formatP, percent, signed } from "../format.ts";
import { countUp, gsap, useScrub } from "../kit/motion.ts";
import {
	Clamp,
	DataTable,
	Goose,
	honker,
	SectionHead,
	walker,
} from "../kit/Parts.tsx";
import { useWidth } from "../kit/useWidth.ts";

interface Bar {
	id: string;
	name: string;
	acc: Est;
	fidelity?: number;
}

/**
 * No frontier model: accuracy at the medium budget as paddles laid flat,
 * Loosy-Goose against local Qwen3 summaries. The goose waddles out along its
 * own paddle as the bars grow with the scroll.
 */
export function Home(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1000);
	const narrow = width < 640;
	const bars: Bar[] = [
		{ id: "goose", name: COPY.home.goose, acc: SET_D.loosy.medium },
		...SET_D.local
			.slice()
			.reverse()
			.map((l) => ({
				id: l.model,
				name: l.model,
				acc: l.acc,
				fidelity: l.fidelity,
			})),
	];
	const labelW = narrow ? 0 : 150;
	const rowH = narrow ? 70 : 64;
	const head = 70;
	const H = head + bars.length * rowH + 26;
	const x = scaleLinear()
		.domain([0, 1])
		.range([labelW + 8, width - (narrow ? 56 : 90)]);
	const thick = narrow ? 12 : 14;
	const barY = (i: number): number => head + i * rowH + (narrow ? 26 : 18);
	const goosePx = narrow ? 2 : 3;

	useScrub(
		root,
		(scope) => {
			const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
			tl.from(scope.querySelectorAll(".hm-bar"), {
				scaleX: 0,
				transformOrigin: "0% 50%",
				duration: 0.6,
				stagger: 0.12,
			})
				.from(
					scope.querySelector(".hm-walker"),
					{ x: x(0) - x(SET_D.loosy.medium.mean), duration: 0.6 },
					0,
				)
				.to(
					walker(scope.querySelector(".hm-walker .lg-goose"), 6),
					{ t: 1, duration: 0.6, ease: "none" },
					0,
				)
				.from(
					scope.querySelectorAll(".hm-ci, .hm-used"),
					{ opacity: 0, duration: 0.2, stagger: 0.05 },
					">-0.1",
				)
				.to(
					honker(scope.querySelector(".hm-walker .lg-goose")),
					{ t: 1, duration: 0.3, ease: "none" },
					">",
				);
			return countUp(tl, scope, 0.1, 0.7);
		},
		width,
		{ pin: ".hm-pin", distance: "+=110%" },
	);

	const goose = SET_D.loosy.medium;
	return (
		<section className="lg-section hm" ref={root} aria-labelledby="hm-title">
			<div className="lg-wrap">
				<SectionHead
					id="hm-title"
					score="2 : 2"
					kicker={COPY.home.kicker}
					title={COPY.home.title}
				>
					<Clamp>{COPY.home.body}</Clamp>
				</SectionHead>
			</div>
			<div className="lg-bleed hm-pin">
				<div className="lg-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="hm-svg-title"
					>
						<title id="hm-svg-title">
							{`Probe accuracy at the medium budget, set D: ${bars.map((b) => `${b.name} ${acc(b.acc.mean)}`).join(", ")}.`}
						</title>
						{[0, 0.25, 0.5, 0.75, 1].map((t) => (
							<g key={t}>
								<line
									className="lg-grid"
									x1={x(t)}
									x2={x(t)}
									y1={head - 8}
									y2={H - 24}
								/>
								<text
									className="lg-tick-label"
									x={x(t)}
									y={H - 6}
									textAnchor="middle"
								>
									{t.toFixed(2)}
								</text>
							</g>
						))}
						{bars.map((b, i) => {
							const y = barY(i);
							const isGoose = b.id === "goose";
							return (
								<g key={b.id}>
									<text
										className={`hm-name${isGoose ? " is-goose" : ""}`}
										x={narrow ? x(0) : labelW - 6}
										y={narrow ? y - 10 : y + thick / 2 + 5}
										textAnchor={narrow ? "start" : "end"}
									>
										{b.name}
									</text>
									<line
										className="hm-ci"
										x1={x(b.acc.lo)}
										x2={x(b.acc.hi)}
										y1={y + thick / 2}
										y2={y + thick / 2}
									/>
									<rect
										className={`hm-bar lg-paddle${isGoose ? " lg-paddle-goose" : " is-local"}`}
										x={x(0)}
										y={y}
										width={x(b.acc.mean) - x(0)}
										height={thick}
										rx={0}
									/>
									<text
										className="hm-value"
										x={x(b.acc.hi) + 10}
										y={y + thick / 2 + 6}
										data-count={b.acc.mean}
										data-digits={3}
									>
										{acc(b.acc.mean)}
									</text>
									{b.fidelity !== undefined && (
										<text
											className="hm-used"
											x={x(b.acc.hi) + 10}
											y={y + thick + 18}
										>
											{`${percent(b.fidelity, 0)} ${COPY.home.used}`}
										</text>
									)}
								</g>
							);
						})}
						<g
							transform={`translate(${Math.round(x(goose.mean) - 6 * goosePx)} ${barY(0) - 2})`}
						>
							<g className="hm-walker">
								<Goose x={0} y={0} px={goosePx} honk={COPY.serve.honkDrop} />
							</g>
						</g>
					</svg>
					<p className="lg-legend-inline">
						<span className="lg-swatch is-band" /> {COPY.home.band}
					</p>
				</div>
			</div>
			<div className="lg-wrap">
				<DataTable
					summary="The numbers on this court"
					head={["Who compacts", "Accuracy [95% CI]", "Budget used"]}
					rows={bars.map((b) => [
						b.name,
						`${acc(b.acc.mean)} [${b.acc.lo.toFixed(2)}, ${b.acc.hi.toFixed(2)}]`,
						b.fidelity === undefined
							? COPY.home.onTarget
							: percent(b.fidelity, 0),
					])}
					sources={[SET_D.source]}
				/>
				<p className="lg-note">
					{`Loosy-Goose − Qwen3-8B: ${signed(SET_D.loosyOver8b.delta)}, ${formatP(SET_D.loosyOver8b.p)}, n = ${SET_D.transcripts}.`}
				</p>
			</div>
		</section>
	);
}
