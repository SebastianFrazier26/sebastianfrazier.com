import { useRef } from "react";
import { COPY } from "../copy.ts";
import { driver, gsap, useScrub } from "../kit/motion.ts";
import { Goose, poseGoose, SectionHead } from "../kit/Parts.tsx";
import { paddleFollow, rally } from "../kit/pong.ts";
import { useWidth } from "../kit/useWidth.ts";

const TRAIL = 6;
const CROSSINGS = 5;
const WALLS = 3;

/**
 * Title card over a pong court. Scrolling plays one rally: a square ball
 * (a token) crosses the court, leaving a short trail, the paddles track it,
 * and the goose at the net honks each time it flies past.
 */
export function Opener(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1200);
	const narrow = width < 600;
	const H = narrow ? 200 : 260;
	const pad = narrow ? 14 : 28;
	const paddleW = narrow ? 8 : 10;
	const half = narrow ? 24 : 32;
	const ball = narrow ? 10 : 13;
	const top = 10;
	const bottom = H - 10;
	const leftX = pad;
	const rightX = width - pad - paddleW;
	const minX = leftX + paddleW;
	const maxX = rightX - ball;
	const at = (t: number): [number, number] => {
		const [u, v] = rally(t, CROSSINGS, WALLS);
		return [minX + u * (maxX - minX), top + v * (bottom - top - ball)];
	};
	const [endX, endY] = at(1).map(Math.round) as [number, number];
	const leftEnd = paddleFollow(
		at(1 - 1 / CROSSINGS)[1] + ball / 2,
		half,
		top,
		bottom,
	);
	const rightEnd = paddleFollow(endY + ball / 2, half, top, bottom);
	const goosePx = 3;

	useScrub(
		root,
		(scope) => {
			const ballEl = scope.querySelector(".op-ball");
			const left = scope.querySelector(".op-paddle-l");
			const right = scope.querySelector(".op-paddle-r");
			const ghosts = [...scope.querySelectorAll(".op-ghost")];
			const goose = scope.querySelector(".op-goose");
			const draw = (t: number): void => {
				const [x, y] = at(t).map(Math.round) as [number, number];
				ballEl?.setAttribute("transform", `translate(${x} ${y})`);
				// Each paddle chases the ball only while it is on that side.
				const ly = paddleFollow(
					x < width / 2 ? y + ball / 2 : leftEnd,
					half,
					top,
					bottom,
				);
				const ry = paddleFollow(
					x >= width / 2 ? y + ball / 2 : rightEnd,
					half,
					top,
					bottom,
				);
				left?.setAttribute("y", String(Math.round(ly - half)));
				right?.setAttribute("y", String(Math.round(ry - half)));
				ghosts.forEach((g, i) => {
					const [gx, gy] = at(Math.max(0, t - (i + 1) * 0.012));
					g.setAttribute(
						"transform",
						`translate(${Math.round(gx)} ${Math.round(gy)})`,
					);
					const live = t > 0.01 && t < 0.99 ? 1 : 0;
					g.setAttribute("opacity", String(live * (0.5 - i * 0.07)));
				});
				const near = Math.max(0, 1 - Math.abs(x + ball / 2 - width / 2) / 90);
				poseGoose(goose, t < 1 && near > 0.35 ? "honk" : "idle");
			};
			const state = driver(draw);
			return gsap
				.timeline()
				.to(state, { t: 1, duration: 1, ease: "none" })
				.to(".lg-cue", { opacity: 0, duration: 0.15 }, 0);
		},
		width,
		{ start: "top top", end: "bottom top" },
	);

	return (
		<header className="lg-section op" ref={root}>
			<div className="lg-wrap">
				<SectionHead
					id="op-title"
					level={1}
					score="0 : 0"
					kicker={COPY.opener.kicker}
					title={COPY.opener.title}
				>
					<p className="lg-copy op-lede">{COPY.opener.lede}</p>
				</SectionHead>
			</div>
			<div className="lg-bleed">
				<div className="lg-scene" ref={box}>
					<svg
						className="lg-court"
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-label="A pong court. A square ball rallies between two paddles while a goose at the net honks as it flies past."
					>
						<rect
							className="lg-court-edge"
							x={1}
							y={1}
							width={width - 2}
							height={H - 2}
							rx={10}
						/>
						<line
							className="lg-net"
							x1={width / 2}
							x2={width / 2}
							y1={top}
							y2={bottom}
						/>
						{Array.from({ length: TRAIL }, (_, i) => (
							<rect
								// biome-ignore lint/suspicious/noArrayIndexKey: ghosts are positional.
								key={i}
								className="lg-ball op-ghost"
								width={ball}
								height={ball}
								opacity={0}
								transform={`translate(${endX} ${endY})`}
							/>
						))}
						<rect
							className="lg-paddle lg-paddle-goose op-paddle-l"
							x={leftX}
							y={Math.round(leftEnd - half)}
							width={paddleW}
							height={half * 2}
							rx={0}
						/>
						<rect
							className="lg-paddle op-paddle-r"
							x={rightX}
							y={Math.round(rightEnd - half)}
							width={paddleW}
							height={half * 2}
							rx={0}
						/>
						<rect
							className="lg-ball op-ball"
							width={ball}
							height={ball}
							transform={`translate(${endX} ${endY})`}
						/>
						<Goose
							className="op-goose"
							x={width / 2 - 4 * goosePx}
							y={bottom + 2}
							px={goosePx}
							honk={COPY.serve.honkDrop}
						/>
					</svg>
				</div>
				<p className="lg-cue" aria-hidden="true">
					{COPY.opener.cue}
				</p>
			</div>
		</header>
	);
}
