import { useRef } from "react";
import { COPY } from "../copy.ts";
import { Flight } from "../kit/Figures.tsx";
import {
	driven,
	flightDrawer,
	flyControl,
	flyPath,
	gsap,
	type Point,
	useReveal,
} from "../kit/motion.ts";
import { SectionHead } from "../kit/SectionHead.tsx";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const H = 210;
const BASE_Y = 150;

/** The design in one throw: this week's talk, tossed to next week's play. */
export function Question(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const narrow = width < 600;
	const inset = narrow ? 96 : 150;
	const from: Point = [inset, BASE_Y - 16];
	const to: Point = [width - inset, BASE_Y - 16];
	const control = flyControl(from, to, 96);

	useReveal(
		root,
		(scope) => {
			const draw = flightDrawer(scope.querySelector(".qn-flight"), {
				from,
				control,
				to,
				ground: BASE_Y,
			});
			const state = driven({ t: 0 }, (s) => draw(s.t));
			draw(0);
			return gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(".qn-base", {
					scale: 0,
					transformOrigin: "50% 50%",
					stagger: 0.2,
				})
				.from(
					".qn-label",
					{ opacity: 0, y: 8, stagger: 0.2, duration: 0.3 },
					"<0.1",
				)
				.to(state, {
					t: 1,
					duration: 1.3,
					ease: "power1.inOut",
				})
				.from(
					".fk-trace",
					{
						attr: { "stroke-dashoffset": 1 },
						duration: 1.3,
						ease: "power1.inOut",
					},
					"<",
				)
				.to(".qn-flight .fk-squash", {
					scaleX: 1.3,
					scaleY: 0.72,
					transformOrigin: "50% 100%",
					duration: 0.08,
					yoyo: true,
					repeat: 1,
				})
				.to(
					".qn-base-to",
					{
						scale: 1.22,
						transformOrigin: "50% 50%",
						duration: 0.14,
						yoyo: true,
						repeat: 1,
					},
					"<",
				);
		},
		width,
	);

	return (
		<section className="fk-section qn" ref={root} aria-labelledby="qn-title">
			<div className="fk-wrap">
				<SectionHead
					id="qn-title"
					numeral="1"
					inning={COPY.question.inning}
					title={COPY.question.title}
				>
					<p className="fk-copy">{COPY.question.body}</p>
				</SectionHead>
			</div>
			<div className="fk-bleed">
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label="A ball thrown from this week, what fans say, to next week, how he plays."
					>
						{[from, to].map(([bx], i) => (
							<g key={bx} transform={`translate(${bx} ${BASE_Y})`}>
								<path
									className={`fk-dirt qn-base ${i === 1 ? "qn-base-to" : ""}`}
									d="M0 -20 L26 0 L0 20 L-26 0 Z"
								/>
								<text className="fk-note qn-label" y={48} textAnchor="middle">
									{i === 0 ? COPY.question.from : COPY.question.to}
								</text>
							</g>
						))}
						<path
							className="fk-trace"
							d={flyPath(from, control, to)}
							pathLength={1}
							strokeDasharray={1}
							strokeDashoffset={0}
						/>
						<Flight className="qn-flight" to={to} ground={BASE_Y} r={8} />
					</svg>
				</div>
			</div>
		</section>
	);
}
