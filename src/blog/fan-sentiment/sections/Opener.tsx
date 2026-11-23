import { useRef } from "react";
import { COPY } from "../copy.ts";
import { Ball, Batter, Fielder } from "../kit/Figures.tsx";
import { gsap, useReveal } from "../kit/motion.ts";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const H = 150;
const G = 118;

/** Title card: the question, and a ball rolling from the batter to the fielder. */
export function Opener(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 900);
	const s = width < 600 ? 0.8 : 1;
	const start = 70 * s;
	const stop = width - 62 * s;

	useReveal(
		root,
		(scope) => {
			const ball = scope.querySelector(".op-ball");
			const state = { x: start };
			const draw = (): void => {
				ball?.setAttribute(
					"transform",
					`translate(${state.x} ${G - 8}) rotate(${state.x * 4})`,
				);
			};
			draw();
			return gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(".op-word", {
					yPercent: 60,
					opacity: 0,
					stagger: 0.09,
					duration: 0.5,
				})
				.from(".op-lede", { opacity: 0, y: 10, duration: 0.4 }, "<0.3")
				.to(
					state,
					{ x: stop, duration: 2.2, ease: "power1.out", onUpdate: draw },
					"<",
				);
		},
		width,
	);

	return (
		<header className="fk-section op" ref={root}>
			<div className="fk-wrap">
				<p className="fk-inning">{COPY.opener.kicker}</p>
				<h1 className="fk-title op-title">
					{COPY.opener.title.split(" ").map((word) => (
						<span className="op-word" key={word}>
							{word}{" "}
						</span>
					))}
				</h1>
				<p className="fk-copy op-lede">{COPY.opener.lede}</p>
				<div className="fk-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label="A batter and a fielder on a chalk line, a ball rolling between them."
					>
						<ellipse
							className="fk-dirt"
							cx={36 * s}
							cy={G}
							rx={46 * s}
							ry={9}
						/>
						<line className="fk-ground" x1={8} x2={width - 8} y1={G} y2={G} />
						<Batter x={30 * s} y={G} scale={s} />
						<Fielder x={width - 30 * s} y={G} scale={s} />
						<Ball className="fk-ball op-ball" x={stop} y={G - 8} r={7 * s} />
					</svg>
				</div>
			</div>
		</header>
	);
}
