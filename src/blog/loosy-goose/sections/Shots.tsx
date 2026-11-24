import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { SHOTS } from "../data.ts";
import { formatP, signed } from "../format.ts";
import { gsap, useScrub } from "../kit/motion.ts";
import { Clamp, DataTable, SectionHead } from "../kit/Parts.tsx";
import { useWidth } from "../kit/useWidth.ts";

/**
 * Each attempt to beat plain loosy as a serve. The dashed net is "no
 * change"; a ball left of it did worse. Scrolling serves each ball in from
 * the right and drops it where its paired difference landed.
 */
export function Shots(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1000);
	const narrow = width < 640;
	const labelW = narrow ? 0 : Math.min(300, width * 0.32);
	const rowH = narrow ? 62 : 50;
	const head = 34;
	const H = head + SHOTS.length * rowH + 30;
	const x = scaleLinear()
		.domain([-0.14, 0.04])
		.range([labelW + 16, width - 20]);
	const ball = narrow ? 11 : 13;
	const rowY = (i: number): number =>
		head + i * rowH + (narrow ? rowH - 18 : rowH / 2);
	const ticks = [-0.12, -0.08, -0.04, 0, 0.04];

	useScrub(
		root,
		(scope) => {
			const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
			tl.from(scope.querySelectorAll(".sh-axis"), {
				opacity: 0,
				duration: 0.2,
			});
			scope.querySelectorAll<SVGGElement>(".sh-row").forEach((row, i) => {
				const dx = Number(row.dataset.dx);
				tl.from(
					row.querySelector(".sh-label"),
					{ opacity: 0, x: -14, duration: 0.25 },
					i === 0 ? ">" : "<0.18",
				)
					.from(
						row.querySelector(".sh-ball"),
						{ x: dx, y: -46, opacity: 0, duration: 0.4, ease: "power1.in" },
						"<0.05",
					)
					.fromTo(
						row.querySelector(".sh-ball-squash"),
						{ scaleX: 1.4, scaleY: 0.6 },
						{
							scaleX: 1,
							scaleY: 1,
							transformOrigin: "50% 100%",
							duration: 0.2,
							ease: "back.out(3)",
							immediateRender: false,
						},
						">",
					)
					.from(
						row.querySelector(".sh-stem"),
						{ scaleX: 0, transformOrigin: "100% 50%", duration: 0.25 },
						"<",
					)
					.from(
						row.querySelector(".sh-value"),
						{ opacity: 0, duration: 0.2 },
						"<",
					);
			});
			return tl;
		},
		width,
		{ pin: ".sh-pin", distance: "+=140%" },
	);

	return (
		<section className="lg-section sh" ref={root} aria-labelledby="sh-title">
			<div className="lg-wrap">
				<SectionHead
					id="sh-title"
					score="1 : 2"
					kicker={COPY.shots.kicker}
					title={COPY.shots.title}
				>
					<Clamp>{COPY.shots.body}</Clamp>
				</SectionHead>
			</div>
			<div className="lg-bleed sh-pin">
				<div className="lg-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="sh-svg-title"
					>
						<title id="sh-svg-title">
							{`Change in probe accuracy for each attempt: ${SHOTS.map((s) => `${COPY.shots.names[s.id as keyof typeof COPY.shots.names]} ${signed(s.delta)}`).join(", ")}.`}
						</title>
						<g className="sh-axis">
							<text className="lg-tick-label" x={x(-0.13)} y={16}>
								← {COPY.shots.worse}
							</text>
							<text
								className="lg-tick-label"
								x={x(0.035)}
								y={16}
								textAnchor="end"
							>
								{COPY.shots.better} →
							</text>
							<line
								className="lg-net lg-net-tall"
								x1={x(0)}
								x2={x(0)}
								y1={head - 6}
								y2={H - 26}
							/>
							{ticks.map((t) => (
								<text
									key={t}
									className="lg-tick-label"
									x={x(t)}
									y={H - 6}
									textAnchor="middle"
								>
									{signed(t, 2)}
								</text>
							))}
						</g>
						{SHOTS.map((s, i) => {
							const id = s.id as keyof typeof COPY.shots.names;
							const y = rowY(i);
							const bx = x(s.delta);
							const significant = s.p < 0.05;
							return (
								<g key={s.id} className="sh-row" data-dx={width - bx}>
									<line
										className="lg-lane"
										x1={labelW + 8}
										x2={width - 12}
										y1={y}
										y2={y}
									/>
									<text
										className="sh-label"
										x={narrow ? 4 : labelW}
										y={narrow ? y - 22 : y + 5}
										textAnchor={narrow ? "start" : "end"}
									>
										{COPY.shots.names[id]}
										<tspan className="sh-vs">
											{` · ${COPY.shots.vs[id]}, ${s.set}`}
										</tspan>
									</text>
									<line
										className="sh-stem"
										x1={Math.min(bx, x(0))}
										x2={Math.max(bx, x(0))}
										y1={y}
										y2={y}
									/>
									<g transform={`translate(${bx - ball / 2} ${y - ball / 2})`}>
										<g className="sh-ball">
											<rect
												className={`sh-ball-squash lg-ball ${significant ? "" : "is-hollow"}`}
												width={ball}
												height={ball}
											/>
										</g>
									</g>
									<text
										className="sh-value"
										x={s.delta < 0 ? bx - ball : bx + ball}
										y={y + 5}
										textAnchor={s.delta < 0 ? "end" : "start"}
									>
										{signed(s.delta)}
									</text>
								</g>
							);
						})}
					</svg>
					<p className="lg-legend-inline">
						<span className="lg-swatch is-ball" /> {COPY.shots.filled}
						<span className="lg-swatch is-ball is-hollow" /> {COPY.shots.hollow}
					</p>
				</div>
			</div>
			<div className="lg-wrap">
				<DataTable
					summary="The numbers behind each shot"
					head={["Attempt", "Paired difference", "Sign test", "Set"]}
					rows={SHOTS.map((s) => {
						const id = s.id as keyof typeof COPY.shots.names;
						return [
							`${COPY.shots.names[id]} (${COPY.shots.vs[id]})`,
							signed(s.delta),
							formatP(s.p),
							s.set,
						];
					})}
					sources={[...new Set(SHOTS.map((s) => s.source))]}
				/>
			</div>
		</section>
	);
}
