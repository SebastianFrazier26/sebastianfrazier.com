import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import { Ball, Fielder } from "../kit/Figures.tsx";
import { Ground } from "../kit/Ground.tsx";
import { gsap, useReveal } from "../kit/motion.ts";
import { DataTable } from "../kit/Scorebug.tsx";
import { Clamp, SectionHead } from "../kit/SectionHead.tsx";
import { METRIC_NAMES, type SnapshotRow } from "../snapshot.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const ROW = 34;
const TOP = 26;

/**
 * The two-team fielding result: each (stat, fanbase) effect is a ball hung
 * at its value with its interval in chalk, all of them falling on the far
 * side of the fielder who stands on zero.
 */
export function FirstInning({
	rows,
}: {
	rows: SnapshotRow[];
}): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const narrow = width < 600;
	const s = narrow ? 0.8 : 1;
	const labelW = narrow ? 0 : 190;
	const G = TOP + rows.length * ROW + 92;
	const H = G + 54;
	const x = scaleLinear()
		.domain([-0.42, 0.27])
		.range([labelW + 14, width - 18]);
	const ticks = narrow
		? [-0.4, -0.2, 0, 0.2]
		: [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2];
	const name = (r: SnapshotRow): string =>
		`${METRIC_NAMES[r.metric] ?? r.metric}, r/${r.fanbase}`;

	useReveal(
		root,
		() =>
			gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(".fi-ball", {
					y: -(G + 40),
					duration: 0.8,
					ease: "bounce.out",
					stagger: 0.1,
				})
				.from(
					".fi-ball .fk-ball > *",
					{
						scaleY: 1.35,
						scaleX: 0.8,
						transformOrigin: "50% 50%",
						duration: 0.8,
						ease: "elastic.out(1.2, 0.35)",
						stagger: 0.1,
					},
					"<",
				)
				.from(
					".fi-interval",
					{ opacity: 0, duration: 0.3, stagger: 0.12 },
					"<0.5",
				)
				.from(".fi-name", { opacity: 0, duration: 0.3, stagger: 0.12 }, "<")
				.from(".fi-caveat", { opacity: 0, y: 10, duration: 0.4 }),
		width,
	);

	return (
		<section className="fk-section fi" ref={root} aria-labelledby="fi-title">
			<div className="fk-wrap">
				<SectionHead
					id="fi-title"
					numeral="2"
					inning={COPY.firstInning.inning}
					title={COPY.firstInning.title}
				>
					<Clamp>{COPY.firstInning.body}</Clamp>
				</SectionHead>
			</div>
			<div className="fk-bleed">
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label={`Fielding effects in the two-team data, from ${signed(
							rows[0]?.mu_mean ?? 0,
						)} to ${signed(rows.at(-1)?.mu_mean ?? 0)}; every one is below zero.`}
					>
						<line className="fk-zero" x1={x(0)} x2={x(0)} y1={4} y2={G} />
						{rows.map((r, i) => {
							const y = TOP + i * ROW;
							return (
								<g key={`${r.metric}-${r.fanbase}`}>
									{!narrow && (
										<text
											className="fk-note fi-name"
											x={labelW}
											y={y + 5}
											textAnchor="end"
										>
											{name(r)}
										</text>
									)}
									<line
										className="fk-interval fi-interval fi-thin"
										x1={x(r.ci_low)}
										x2={x(r.ci_high)}
										y1={y}
										y2={y}
									/>
									<g className="fi-ball">
										<Ball x={x(r.mu_mean)} y={y} r={8} />
									</g>
								</g>
							);
						})}
						<Ground
							x={x}
							y={G}
							from={labelW > 0 ? labelW - 6 : 8}
							to={width - 8}
							ticks={ticks}
							digits={1}
						/>
						<Fielder x={x(0) + 34 * s} y={G} scale={s * 0.9} />
					</svg>
				</div>
			</div>
			<div className="fk-wrap">
				<Clamp className="fi-caveat">{COPY.firstInning.caveat}</Clamp>
				<DataTable
					summary="The numbers behind these"
					head={["Stat, fanbase", "Effect", "95% interval", "q"]}
					rows={rows.map((r) => [
						name(r),
						signed(r.mu_mean),
						`${signed(r.ci_low)} to ${signed(r.ci_high)}`,
						r.q_bh === null ? "n/a" : r.q_bh.toFixed(2),
					])}
				/>
			</div>
		</section>
	);
}
