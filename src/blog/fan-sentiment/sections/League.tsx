import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import { Ground } from "../kit/Ground.tsx";
import { countUp, gsap, useReveal } from "../kit/motion.ts";
import { DataTable, Stat } from "../kit/Scorebug.tsx";
import { SectionHead } from "../kit/SectionHead.tsx";
import { type LeagueData, METRIC_NAMES } from "../snapshot.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const ROW = 50;
/** Seconds from the first ball dropping to the last one landing. */
const DROP_SPAN = 2.4;
const TOP = 30;

/** Spreads the balls of one row vertically without any randomness. */
function jitter(index: number): number {
	return ((index * 7) % 11) - 5;
}

/**
 * Every corrected (stat, fanbase) test as one small ball on its stat's row,
 * with the pooled league interval as thick chalk. A ball whose corrected q
 * clears the threshold would be drawn in clay.
 */
export function League({ data }: { data: LeagueData }): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const narrow = width < 600;
	const labelW = narrow ? 76 : 150;
	const G = TOP + data.metrics.length * ROW;
	const H = G + 50;
	const x = scaleLinear()
		.domain([-0.26, 0.26])
		.range([labelW + 14, width - 14]);
	const ticks = narrow ? [-0.2, 0, 0.2] : [-0.2, -0.1, 0, 0.1, 0.2];
	const short = (m: string): string =>
		narrow && m === "AVG" ? "AVG" : (METRIC_NAMES[m] ?? m);

	useReveal(
		root,
		// The scoreboard hangs over the field and counts each ball as it lands,
		// so its tally finishes with the last bounce.
		(scope) =>
			countUp(
				gsap.timeline({ defaults: { ease: "power2.out" } }),
				scope,
				0,
				DROP_SPAN,
				"none",
			)
				.from(
					".lg-cell",
					{
						y: -(H + 20),
						opacity: 0,
						duration: 0.9,
						ease: "bounce.out",
						stagger: {
							amount: DROP_SPAN - 0.9,
							from: "random",
						},
					},
					0.35,
				)
				.from(
					".lg-pooled",
					{
						scaleX: 0,
						transformOrigin: "50% 50%",
						duration: 0.6,
						stagger: 0.06,
					},
					">-0.3",
				),
		width,
		{ pin: ".lg-pin", distance: "+=140%" },
	);

	return (
		<section className="fk-section lg" ref={root} aria-labelledby="lg-title">
			<div className="fk-wrap">
				<SectionHead
					id="lg-title"
					numeral="8"
					inning={COPY.league.inning}
					title={COPY.league.title}
				>
					<p className="fk-copy">{COPY.league.body}</p>
				</SectionHead>
			</div>
			<div className="fk-bleed lg-pin">
				<div className="fk-stats lg-board">
					<Stat
						label="Fanbase tests"
						value={String(data.cells.length)}
						count={{ to: data.cells.length }}
					/>
					<Stat
						label={`Clearing q < ${data.threshold}`}
						value={String(data.clearing)}
						count={{ to: data.clearing }}
					/>
					<Stat
						label="League-wide stats that clear"
						value={`${
							data.pooled.filter((r) => (r.q_bh ?? 1) < 0.05).length
						} of ${data.pooled.length}`}
					/>
				</div>
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label={`${data.cells.length} tests, one per fanbase and stat, scattered around zero. ${data.clearing} have a corrected q below ${data.threshold}.`}
					>
						<line className="fk-zero" x1={x(0)} x2={x(0)} y1={6} y2={G} />
						{data.metrics.map((m, row) => {
							const y = TOP + row * ROW;
							const pooled = data.pooled.find((r) => r.metric === m);
							return (
								<g key={m}>
									<text
										className="fk-note"
										x={labelW}
										y={y + 5}
										textAnchor="end"
									>
										{short(m)}
									</text>
									{data.cells
										.filter((r) => r.metric === m)
										.map((r, i) => (
											<circle
												className={
													(r.q_bh ?? 1) < data.threshold
														? "lg-cell lg-hot"
														: "lg-cell"
												}
												key={r.fanbase}
												cx={x(r.mu_mean)}
												cy={y + jitter(i) * 2.4}
												r={narrow ? 3.4 : 4.4}
											/>
										))}
									{pooled && (
										<line
											className="fk-interval lg-pooled"
											x1={x(pooled.ci_low)}
											x2={x(pooled.ci_high)}
											y1={y + 19}
											y2={y + 19}
										/>
									)}
								</g>
							);
						})}
						<Ground
							x={x}
							y={G}
							from={labelW - 6}
							to={width - 8}
							ticks={ticks}
							digits={1}
						/>
					</svg>
				</div>
			</div>
			<div className="fk-wrap">
				<DataTable
					summary="League-wide numbers for each stat"
					head={["Stat", "Effect", "95% interval", "q"]}
					rows={data.pooled.map((r) => [
						METRIC_NAMES[r.metric] ?? r.metric,
						signed(r.mu_mean),
						`${signed(r.ci_low)} to ${signed(r.ci_high)}`,
						r.q_bh === null ? "n/a" : r.q_bh.toFixed(2),
					])}
				/>
			</div>
		</section>
	);
}
