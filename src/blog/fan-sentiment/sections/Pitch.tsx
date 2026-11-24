import { scaleLinear } from "d3-scale";
import { useRef } from "react";
import { COPY } from "../copy.ts";
import { signed } from "../format.ts";
import {
	BATTER,
	Batter,
	FIELDER,
	Fielder,
	Flight,
	poseFielder,
	swingTo,
} from "../kit/Figures.tsx";
import { Ground } from "../kit/Ground.tsx";
import {
	countUp,
	driven,
	flightDrawer,
	flyControl,
	flyPath,
	gsap,
	type Point,
	useReveal,
} from "../kit/motion.ts";
import { DataTable, Stat } from "../kit/Scorebug.tsx";
import { SectionHead } from "../kit/SectionHead.tsx";
import type { PitchData } from "../snapshot.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const H = 330;
const G = 262;

/**
 * The pre-registered league test as one play: the batter hits, the ball
 * carries past the patch of grass where two teams' data had pointed, and the
 * fielder standing on zero catches it. Takes its data as a prop and knows
 * nothing about routes or the page around it.
 */
export function Pitch({ data }: { data: PitchData }): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const { result: c, called, calledLow, calledHigh } = data;

	const narrow = width < 600;
	const s = narrow ? 0.8 : 1.1;
	const batterX = narrow ? 20 : 34;
	const x = scaleLinear()
		.domain([-0.22, 0.05])
		.range([batterX + 78 * s, width - 26]);
	const ticks = narrow ? [-0.2, -0.1, 0] : [-0.2, -0.15, -0.1, -0.05, 0, 0.05];

	const fielderX = x(c.mu_mean) + 17 * s;
	const from: Point = [
		batterX + BATTER.contact[0] * s,
		G + BATTER.contact[1] * s,
	];
	const to: Point = [fielderX + FIELDER.glove[0] * s, G + FIELDER.glove[1] * s];
	const control = flyControl(from, to, narrow ? 120 : 150);

	useReveal(
		root,
		(scope) => {
			const batter = scope.querySelector(".fk-batter");
			const fielder = scope.querySelector(".fk-fielder");
			const fly = flightDrawer(scope.querySelector(".pt-flight"), {
				from,
				control,
				to,
				ground: G,
			});
			const draw = (s: { angle: number; t: number }): void => {
				swingTo(batter, s.angle);
				fly(s.t);
				poseFielder(fielder, s.t > 0.86 ? "catch" : "ready");
			};
			const state = driven({ angle: BATTER.cocked, t: 0 }, draw);
			draw(state);
			const tl = gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(".pt-zone-all", { opacity: 0, duration: 0.5 })
				.from(".pt-ring", {
					scale: 0,
					transformOrigin: "50% 50%",
					stagger: 0.08,
				})
				.to(state, {
					angle: 0,
					duration: 0.28,
					ease: "power3.in",
				})
				.to(state, { t: 1, duration: 1.6, ease: "power1.inOut" }, ">-0.05")
				.from(
					".fk-trace",
					{
						attr: { "stroke-dashoffset": 1 },
						duration: 1.6,
						ease: "power1.inOut",
					},
					"<",
				)
				.to(".fk-hop", { y: -14, duration: 0.16, yoyo: true, repeat: 1 })
				.to(
					".pt-flight .fk-squash",
					{
						scaleX: 1.3,
						scaleY: 0.74,
						transformOrigin: "50% 50%",
						duration: 0.08,
						yoyo: true,
						repeat: 1,
					},
					"<",
				)
				.from(".pt-interval", {
					scaleX: 0,
					transformOrigin: "50% 50%",
					duration: 0.5,
				})
				.from(".pt-label", { opacity: 0, y: 8, duration: 0.3 }, "<");
			return countUp(tl, scope, ">-0.1");
		},
		width,
		{ pin: ".pt-pin", distance: "+=140%" },
	);

	return (
		<section className="fk-section pt" ref={root} aria-labelledby="pt-title">
			<div className="fk-wrap">
				<SectionHead
					id="pt-title"
					numeral="6"
					inning={COPY.pitch.inning}
					title={COPY.pitch.title}
				>
					<p className="fk-copy">{COPY.pitch.body}</p>
				</SectionHead>
			</div>
			<div className="fk-bleed pt-pin">
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="pt-svg-title pt-svg-desc"
					>
						<title id="pt-svg-title">
							League fielding effect against the two-team signal
						</title>
						<desc id="pt-svg-desc">
							A batter hits a ball along an axis of effect size. Two teams' data
							had pointed between {signed(calledLow)} and {signed(calledHigh)}.
							The ball is caught at {signed(c.mu_mean)}, with a 95% interval
							from {signed(c.ci_low)} to {signed(c.ci_high)} that covers zero.
						</desc>

						<g className="pt-zone-all">
							<rect
								className="fk-zone"
								x={x(calledLow) - 14}
								y={G - 30}
								width={x(calledHigh) - x(calledLow) + 28}
								height={30}
								rx={4}
							/>
							<text className="fk-note" x={x(calledLow) - 14} y={G - 40}>
								{narrow ? COPY.pitch.zoneShort : COPY.pitch.zone}
							</text>
						</g>
						{called.map((r) => (
							<g
								key={`${r.metric}-${r.fanbase}`}
								transform={`translate(${x(r.mu_mean)} ${G - 15})`}
							>
								<circle className="fk-ring pt-ring" r={6.5} />
							</g>
						))}

						<ellipse
							className="fk-dirt"
							cx={batterX + 6}
							cy={G}
							rx={46 * s}
							ry={9}
						/>
						<line className="fk-zero" x1={x(0)} x2={x(0)} y1={G - 150} y2={G} />
						<Ground x={x} y={G} from={8} to={width - 8} ticks={ticks} />
						<line
							className="fk-interval pt-interval"
							x1={x(c.ci_low)}
							x2={x(c.ci_high)}
							y1={G}
							y2={G}
						/>
						{!narrow && (
							<text
								className="fk-note pt-label"
								x={x(0) - 12}
								y={G - 158}
								textAnchor="end"
							>
								{COPY.pitch.league} · {signed(c.mu_mean)}
							</text>
						)}

						<path
							className="fk-trace"
							d={flyPath(from, control, to)}
							pathLength={1}
							strokeDasharray={1}
							strokeDashoffset={0}
						/>
						<Batter x={batterX} y={G} scale={s} />
						<Fielder x={fielderX} y={G} scale={s} />
						<Flight className="pt-flight" to={to} ground={G} r={7 * s} />
					</svg>
				</div>

				<div className="fk-stats">
					<Stat
						label="Effect"
						value={signed(c.mu_mean)}
						count={{ to: c.mu_mean, digits: 3, signed: true }}
					/>
					<Stat
						label="95% interval"
						value={`${signed(c.ci_low)} to ${signed(c.ci_high)}`}
					/>
					<Stat
						label="One-sided p"
						value={c.perm_p_less.toFixed(3)}
						count={{ to: c.perm_p_less, digits: 3 }}
					/>
					<Stat
						className="fk-verdict"
						label="The call"
						value={c.confirmed ? "Confirmed" : "Not confirmed"}
					/>
				</div>
			</div>
			<div className="fk-wrap">
				<DataTable
					summary="The numbers in this play"
					head={["What", "Effect", "95% interval"]}
					rows={[
						[
							"Rest of league, fielding (pre-registered)",
							signed(c.mu_mean),
							`${signed(c.ci_low)} to ${signed(c.ci_high)}`,
						],
						...called.map((r) => [
							`Two teams, ${
								r.metric === "ERRORS" ? "errors" : "fielding %"
							}, r/${r.fanbase}`,
							signed(r.mu_mean),
							`${signed(r.ci_low)} to ${signed(r.ci_high)}`,
						]),
					]}
				/>
			</div>
		</section>
	);
}
