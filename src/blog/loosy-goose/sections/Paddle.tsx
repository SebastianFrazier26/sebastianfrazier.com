import { useRef } from "react";
import { COPY } from "../copy.ts";
import { LEVELS, type Level, SET_D } from "../data.ts";
import { acc, formatP, signed } from "../format.ts";
import { driver, gsap, useScrub } from "../kit/motion.ts";
import { Clamp, DataTable, Goose, SectionHead } from "../kit/Parts.tsx";
import { paddleFollow, rally } from "../kit/pong.ts";
import { useWidth } from "../kit/useWidth.ts";

/**
 * Scroll position to a level: hold light, slide to medium, hold, slide to
 * heavy, hold. Returns the two levels around t and how far between them.
 */
export function levelAt(t: number): { from: Level; to: Level; k: number } {
	const stops = [0.22, 0.42, 0.62, 0.82];
	const [a, b, c, d] = stops as [number, number, number, number];
	if (t < a) return { from: "light", to: "light", k: 0 };
	if (t < b) return { from: "light", to: "medium", k: (t - a) / (b - a) };
	if (t < c) return { from: "medium", to: "medium", k: 0 };
	if (t < d) return { from: "medium", to: "heavy", k: (t - c) / (d - c) };
	return { from: "heavy", to: "heavy", k: 0 };
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/**
 * The budget as a pong paddle. As the reader scrolls, both paddles shrink
 * from light to heavy while the rally goes on, and the scoreboard over the
 * court shows each side's probe accuracy at that budget.
 */
export function Paddle(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1000);
	const narrow = width < 600;
	const H = narrow ? 300 : 380;
	const top = narrow ? 86 : 104;
	const bottom = H - 12;
	const pad = narrow ? 14 : 34;
	const paddleW = narrow ? 9 : 12;
	const ball = narrow ? 10 : 13;
	const leftX = pad;
	const rightX = width - pad - paddleW;
	// light (keep 0.50) gets a paddle 60% of the court's height.
	const halfFor = (keep: number): number => (keep / 0.5) * 0.3 * (bottom - top);
	const crossings = 9;
	const at = (t: number): [number, number] => {
		const [u, v] = rally(t, crossings, 5);
		return [
			leftX + paddleW + u * (rightX - leftX - paddleW - ball),
			top + v * (bottom - top - ball),
		];
	};
	const final = at(1).map(Math.round) as [number, number];
	const heavyHalf = halfFor(SET_D.keep.heavy);
	const finalLeft = paddleFollow(
		at(1 - 1 / crossings)[1] + ball / 2,
		heavyHalf,
		top,
		bottom,
	);
	const finalRight = paddleFollow(final[1] + ball / 2, heavyHalf, top, bottom);
	const scoreY = narrow ? 52 : 66;

	useScrub(
		root,
		(scope) => {
			const q = (sel: string): Element | null => scope.querySelector(sel);
			const ballEl = q(".pd-ball");
			const left = q(".pd-paddle-l");
			const right = q(".pd-paddle-r");
			const scoreL = q(".pd-score-l");
			const scoreR = q(".pd-score-r");
			const level = q(".pd-level");
			const gap = q(".pd-gap");
			const draw = (t: number): void => {
				const { from, to, k } = levelAt(t);
				const keep = lerp(SET_D.keep[from], SET_D.keep[to], k);
				const half = halfFor(keep);
				const [x, y] = at(t).map(Math.round) as [number, number];
				ballEl?.setAttribute("transform", `translate(${x} ${y})`);
				const onLeft = x < width / 2;
				const ly = paddleFollow(
					onLeft ? y + ball / 2 : finalLeft,
					half,
					top,
					bottom,
				);
				const ry = paddleFollow(
					onLeft ? finalRight : y + ball / 2,
					half,
					top,
					bottom,
				);
				for (const [el, cy] of [
					[left, ly],
					[right, ry],
				] as const) {
					el?.setAttribute("y", String(Math.round(cy - half)));
					el?.setAttribute("height", String(Math.round(half * 2)));
				}
				// Scores snap between measured levels: an in-between value was never measured.
				const lv = k < 0.5 ? from : to;
				if (scoreL) scoreL.textContent = acc(SET_D.loosy[lv].mean);
				if (scoreR) scoreR.textContent = acc(SET_D.summary[lv].mean);
				if (level)
					level.textContent = `${COPY.paddle.levels[lv]} · ${COPY.paddle.paddleLabel} ${SET_D.keep[lv].toFixed(2)}`;
				if (gap)
					gap.textContent = `${COPY.paddle.gap} ${signed(SET_D.gap[lv].delta)} · ${formatP(SET_D.gap[lv].p)}`;
			};
			const state = driver(draw);
			return gsap
				.timeline()
				.from(".pd-board", { opacity: 0, y: -16, duration: 0.08 })
				.to(state, { t: 1, duration: 1, ease: "none" }, 0);
		},
		width,
		{ pin: ".pd-pin", distance: "+=160%" },
	);

	return (
		<section className="lg-section pd" ref={root} aria-labelledby="pd-title">
			<div className="lg-wrap">
				<SectionHead
					id="pd-title"
					score="1 : 1"
					kicker={COPY.paddle.kicker}
					title={COPY.paddle.title}
				>
					<Clamp>{COPY.paddle.body}</Clamp>
				</SectionHead>
			</div>
			<div className="lg-bleed pd-pin">
				<div className="lg-scene" ref={box}>
					<svg
						className="lg-court"
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="pd-svg-title"
					>
						<title id="pd-svg-title">
							{`Probe accuracy at equal budget on set D. Loosy-Goose ${LEVELS.map((l) => acc(SET_D.loosy[l].mean)).join(", ")}; Sonnet summary ${LEVELS.map((l) => acc(SET_D.summary[l].mean)).join(", ")}, at light, medium and heavy.`}
						</title>
						<rect
							className="lg-court-edge"
							x={1}
							y={top - 10}
							width={width - 2}
							height={H - top + 8}
							rx={10}
						/>
						<line
							className="lg-net"
							x1={width / 2}
							x2={width / 2}
							y1={top}
							y2={bottom}
						/>
						<g className="pd-board">
							<text
								className="pd-name"
								x={width / 2 - 24}
								y={18}
								textAnchor="end"
							>
								{COPY.paddle.left}
							</text>
							<text className="pd-name" x={width / 2 + 24} y={18}>
								{COPY.paddle.right}
							</text>
							<text
								className="pd-score pd-score-l"
								x={width / 2 - 24}
								y={scoreY}
								textAnchor="end"
							>
								{acc(SET_D.loosy.heavy.mean)}
							</text>
							<text
								className="pd-score pd-score-r"
								x={width / 2 + 24}
								y={scoreY}
							>
								{acc(SET_D.summary.heavy.mean)}
							</text>
						</g>
						<rect
							className="lg-paddle lg-paddle-goose pd-paddle-l"
							x={leftX}
							y={Math.round(finalLeft - heavyHalf)}
							width={paddleW}
							height={Math.round(heavyHalf * 2)}
							rx={0}
						/>
						<rect
							className="lg-paddle pd-paddle-r"
							x={rightX}
							y={Math.round(finalRight - heavyHalf)}
							width={paddleW}
							height={Math.round(heavyHalf * 2)}
							rx={0}
						/>
						<rect
							className="lg-ball pd-ball"
							width={ball}
							height={ball}
							transform={`translate(${final[0]} ${final[1]})`}
						/>
						{!narrow && <Goose x={leftX + 60} y={top - 12} px={2} />}
					</svg>
					<p className="pd-caption">
						<span className="pd-level">
							{`${COPY.paddle.levels.heavy} · ${COPY.paddle.paddleLabel} ${SET_D.keep.heavy.toFixed(2)}`}
						</span>
						<span className="pd-gap">
							{`${COPY.paddle.gap} ${signed(SET_D.gap.heavy.delta)} · ${formatP(SET_D.gap.heavy.p)}`}
						</span>
					</p>
				</div>
			</div>
			<div className="lg-wrap">
				<DataTable
					summary="The numbers in this rally"
					head={["Level", "Loosy-Goose", "Sonnet summary", "Summary − goose"]}
					rows={LEVELS.map((l) => [
						`${COPY.paddle.levels[l]} (keep ${SET_D.keep[l].toFixed(2)})`,
						`${acc(SET_D.loosy[l].mean)} [${SET_D.loosy[l].lo.toFixed(2)}, ${SET_D.loosy[l].hi.toFixed(2)}]`,
						`${acc(SET_D.summary[l].mean)} [${SET_D.summary[l].lo.toFixed(2)}, ${SET_D.summary[l].hi.toFixed(2)}]`,
						`${signed(SET_D.gap[l].delta)}, ${formatP(SET_D.gap[l].p)}`,
					])}
					sources={[SET_D.source]}
				/>
			</div>
		</section>
	);
}
