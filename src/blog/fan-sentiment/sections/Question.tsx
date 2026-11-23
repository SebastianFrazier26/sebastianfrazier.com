import { useRef } from "react";
import { COPY } from "../copy.ts";
import { Ball } from "../kit/Figures.tsx";
import {
	bezier,
	flyControl,
	flyPath,
	gsap,
	type Point,
	useReveal,
} from "../kit/motion.ts";
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
	const inset = narrow ? 70 : 150;
	const from: Point = [inset, BASE_Y - 16];
	const to: Point = [width - inset, BASE_Y - 16];
	const control = flyControl(from, to, 96);

	useReveal(
		root,
		(scope) => {
			const ball = scope.querySelector(".qn-ball");
			const state = { t: 0 };
			const draw = (): void => {
				const [bx, by] = bezier(state.t, from, control, to);
				ball?.setAttribute("transform", `translate(${bx} ${by})`);
			};
			draw();
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
				.to(state, { t: 1, duration: 1.3, ease: "none", onUpdate: draw })
				.from(
					".fk-trace",
					{ attr: { "stroke-dashoffset": 1 }, duration: 1.3, ease: "none" },
					"<",
				);
		},
		width,
	);

	return (
		<section className="fk-section qn" ref={root} aria-labelledby="qn-title">
			<div className="fk-wrap">
				<p className="fk-inning">{COPY.question.inning}</p>
				<h2 id="qn-title" className="fk-title">
					{COPY.question.title}
				</h2>
				<p className="fk-copy">{COPY.question.body}</p>
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
									className="fk-dirt qn-base"
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
						<Ball className="fk-ball qn-ball" x={to[0]} y={to[1]} r={8} />
					</svg>
				</div>
			</div>
		</section>
	);
}
