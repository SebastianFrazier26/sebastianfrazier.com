import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import { BATTER, Ball, Batter } from "../kit/Figures.tsx";
import { Ground } from "../kit/Ground.tsx";
import {
	bezier,
	flyControl,
	flyPath,
	gsap,
	type Point,
	useReveal,
} from "../kit/motion.ts";
import { DataTable } from "../kit/Scorebug.tsx";
import { METRIC_NAMES as NAMES, type SnapshotRow } from "../snapshot.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const H = 250;
const G = 190;

/**
 * A hitting stat as an at-bat: the batter swings and the ball's flight ends
 * where the effect is, on an axis whose middle is "no effect". One lane per
 * metric, played one after the other.
 */
export function Hitting({ rows }: { rows: SnapshotRow[] }): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);

	const narrow = width < 600;
	const s = narrow ? 0.72 : 0.9;
	const batterX = narrow ? 18 : 30;
	const x = scaleLinear()
		.domain([-0.05, 0.05])
		.range([batterX + 90 * s, width - 30]);
	const ticks = narrow ? [-0.04, 0, 0.04] : [-0.04, -0.02, 0, 0.02, 0.04];
	const from: Point = [
		batterX + BATTER.contact[0] * s,
		G + BATTER.contact[1] * s,
	];
	const lanes = rows.map((r, i) => {
		const to: Point = [x(r.mu_mean), G - 8 * s];
		return { r, to, control: flyControl(from, to, 96 + i * 18) };
	});
	const pivot = `${BATTER.pivot[0]} ${BATTER.pivot[1]}`;

	useReveal(
		root,
		(scope) => {
			const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
			scope.querySelectorAll<SVGSVGElement>(".ht-lane").forEach((lane, i) => {
				const spec = lanes[i];
				if (!spec) return;
				const swing = lane.querySelector(".fk-swing");
				const ball = lane.querySelector(".ht-ball");
				const state = { angle: BATTER.cocked, t: 0 };
				const draw = (): void => {
					swing?.setAttribute("transform", `rotate(${state.angle} ${pivot})`);
					const [bx, by] = bezier(state.t, from, spec.control, spec.to);
					ball?.setAttribute("transform", `translate(${bx} ${by})`);
				};
				draw();
				const q = gsap.utils.selector(lane);
				tl.to(state, {
					angle: 0,
					duration: 0.28,
					ease: "power3.in",
					onUpdate: draw,
				})
					.to(
						state,
						{ t: 1, duration: 1.2, ease: "none", onUpdate: draw },
						">-0.05",
					)
					.from(
						q(".fk-trace"),
						{ attr: { "stroke-dashoffset": 1 }, duration: 1.2, ease: "none" },
						"<",
					)
					.from(q(".ht-interval"), { opacity: 0, duration: 0.3 })
					.from(q(".ht-label"), { opacity: 0, y: 8, duration: 0.3 }, "<");
			});
			return tl;
		},
		width,
	);

	return (
		<section className="fk-section ht" ref={root} aria-labelledby="ht-title">
			<div className="fk-wrap">
				<p className="fk-inning">{COPY.hitting.inning}</p>
				<h2 id="ht-title" className="fk-title">
					{COPY.hitting.title}
				</h2>
				<p className="fk-copy">{COPY.hitting.body}</p>

				<div className="fk-scene" ref={box}>
					{lanes.map(({ r, to, control }, i) => (
						<svg
							className="ht-lane"
							key={r.metric}
							width={width}
							height={H}
							viewBox={`0 0 ${width} ${H}`}
							role="img"
							aria-label={`${NAMES[r.metric] ?? r.metric}: effect ${signed(
								r.mu_mean,
							)}, 95% interval ${signed(r.ci_low)} to ${signed(
								r.ci_high,
							)}, which covers zero.`}
						>
							<ellipse
								className="fk-dirt"
								cx={batterX + 6}
								cy={G}
								rx={42 * s}
								ry={8}
							/>
							<line
								className="fk-zero"
								x1={x(0)}
								x2={x(0)}
								y1={G - 150}
								y2={G}
							/>
							{i === 0 && (
								<text className="fk-note" x={x(0) + 10} y={G - 138}>
									{COPY.hitting.zero}
								</text>
							)}
							<Ground
								x={x}
								y={G}
								from={8}
								to={width - 8}
								ticks={i === lanes.length - 1 ? ticks : []}
							/>
							<line
								className="fk-interval ht-interval"
								x1={x(r.ci_low)}
								x2={x(r.ci_high)}
								y1={G}
								y2={G}
							/>
							<text
								className="fk-note ht-label"
								x={x(r.ci_high) + 16}
								y={G - 14}
							>
								{NAMES[r.metric] ?? r.metric} · {signed(r.mu_mean)}
							</text>
							<path
								className="fk-trace"
								d={flyPath(from, control, to)}
								pathLength={1}
								strokeDasharray={1}
								strokeDashoffset={0}
							/>
							<Batter x={batterX} y={G} scale={s} />
							<Ball className="fk-ball ht-ball" x={to[0]} y={to[1]} r={7 * s} />
						</svg>
					))}
				</div>

				<DataTable
					summary="The numbers in these at-bats"
					head={["Metric", "Effect", "95% interval", "q"]}
					rows={rows.map((r) => [
						NAMES[r.metric] ?? r.metric,
						signed(r.mu_mean),
						`${signed(r.ci_low)} to ${signed(r.ci_high)}`,
						r.q_bh === null ? "n/a" : r.q_bh.toFixed(2),
					])}
				/>
			</div>
		</section>
	);
}
