import { scaleLinear } from "d3-scale";
import { useId, useRef } from "react";
import { COPY } from "../copy.ts";
import { type Arm, OPEN_WEIGHT } from "../data.ts";
import { acc, formatP, signed, tokens } from "../format.ts";
import { driver, gsap, useScrub } from "../kit/motion.ts";
import { Clamp, DataTable, SectionHead, Stat, Stats } from "../kit/Parts.tsx";
import { useWidth } from "../kit/useWidth.ts";

const ARMS: readonly Arm[] = ["full", "freeze", "tloosy", "qthresh"];
const P = OPEN_WEIGHT.positions;

/** y on a polyline through the three checkpoints, at position p in [0.5, 1]. */
export function along(values: readonly number[], p: number): number {
	const i = p <= P[1] ? 0 : 1;
	const a = P[i] as number;
	const b = P[i + 1] as number;
	const k = Math.min(1, Math.max(0, (p - a) / (b - a)));
	return (
		(values[i] as number) +
		((values[i + 1] as number) - (values[i] as number)) * k
	);
}

/**
 * The open-weight replay as four rallies drawn across the court: accuracy at
 * the 50%, 75% and 100% checkpoints of each session. Scrolling draws each
 * line left to right behind its own square ball.
 */
export function Rally(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const clip = useId().replace(/:/g, "");
	const width = useWidth(box, 1000);
	const narrow = width < 640;
	const H = narrow ? 300 : 360;
	const left = narrow ? 42 : 56;
	const right = narrow ? 18 : 190;
	const top = 18;
	const bottom = H - 40;
	const x = scaleLinear()
		.domain([0.5, 1])
		.range([left, width - right]);
	const y = scaleLinear().domain([0.5, 0.8]).range([bottom, top]);
	const ball = narrow ? 9 : 11;
	const path = (arm: Arm): string =>
		OPEN_WEIGHT.byPosition[arm]
			.map((v, i) => `${i === 0 ? "M" : "L"}${x(P[i] as number)} ${y(v)}`)
			.join(" ");

	useScrub(
		root,
		(scope) => {
			const rect = scope.querySelector(".rl-clip-rect");
			const heads = ARMS.map((arm) => scope.querySelector(`.rl-head-${arm}`));
			const draw = (t: number): void => {
				const p = 0.5 + 0.5 * t;
				rect?.setAttribute("width", String(Math.max(0, x(p) - left + ball)));
				ARMS.forEach((arm, i) => {
					const v = along(OPEN_WEIGHT.byPosition[arm], p);
					heads[i]?.setAttribute(
						"transform",
						`translate(${x(p) - ball / 2} ${y(v) - ball / 2})`,
					);
				});
			};
			const state = driver(draw);
			const tl = gsap
				.timeline()
				.from(".rl-axis", { opacity: 0, duration: 0.1 })
				.to(state, { t: 1, duration: 1, ease: "none" }, 0.05);
			const labels = scope.querySelectorAll(".rl-end");
			if (labels.length > 0) {
				tl.from(
					labels,
					{ opacity: 0, x: -8, duration: 0.12, stagger: 0.03 },
					">-0.05",
				);
			}
			return tl.from(".lg-stats", { opacity: 0, y: 12, duration: 0.15 }, "<");
		},
		width,
		{ pin: ".rl-pin", distance: "+=130%" },
	);

	const ends = ARMS.map((arm) => ({
		arm,
		y: y(OPEN_WEIGHT.byPosition[arm][2]),
	}));
	// Full and freeze finish within a hundredth of each other; nudge their
	// labels apart so both stay readable.
	ends.sort((a, b) => a.y - b.y);
	for (let i = 1; i < ends.length; i++) {
		const prev = ends[i - 1];
		const cur = ends[i];
		if (prev && cur && cur.y - prev.y < 18) cur.y = prev.y + 18;
	}

	return (
		<section className="lg-section rl" ref={root} aria-labelledby="rl-title">
			<div className="lg-wrap">
				<SectionHead
					id="rl-title"
					score="3 : 2"
					kicker={COPY.rally.kicker}
					title={COPY.rally.title}
				>
					<Clamp>{COPY.rally.body}</Clamp>
				</SectionHead>
			</div>
			<div className="lg-bleed rl-pin">
				<div className="lg-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="rl-svg-title"
					>
						<title id="rl-svg-title">
							{`Open-weight replay, accuracy at 50%, 75% and 100% of each session: ${ARMS.map((a) => `${COPY.rally.names[a]} ${OPEN_WEIGHT.byPosition[a].map(acc).join(", ")}`).join("; ")}.`}
						</title>
						<defs>
							<clipPath id={`rl-clip-${clip}`}>
								<rect
									className="rl-clip-rect"
									x={left - ball}
									y={0}
									width={width - right - left + 2 * ball}
									height={H}
								/>
							</clipPath>
						</defs>
						<g className="rl-axis">
							{[0.5, 0.6, 0.7, 0.8].map((v) => (
								<g key={v}>
									<line
										className="lg-grid"
										x1={left}
										x2={width - right}
										y1={y(v)}
										y2={y(v)}
									/>
									<text
										className="lg-tick-label"
										x={left - 8}
										y={y(v) + 5}
										textAnchor="end"
									>
										{v.toFixed(1)}
									</text>
								</g>
							))}
							{P.map((p) => (
								<text
									key={p}
									className="lg-tick-label"
									x={x(p)}
									y={bottom + 22}
									textAnchor="middle"
								>
									{`${p * 100}%`}
								</text>
							))}
							<text
								className="lg-note-svg"
								x={x(0.75)}
								y={H - 2}
								textAnchor="middle"
							>
								{COPY.rally.axis}
							</text>
						</g>
						<g clipPath={`url(#rl-clip-${clip})`}>
							{ARMS.map((arm) => (
								<path key={arm} className={`rl-line is-${arm}`} d={path(arm)} />
							))}
						</g>
						{ARMS.map((arm) => (
							<rect
								key={arm}
								className={`rl-head rl-head-${arm} lg-ball is-${arm}`}
								width={ball}
								height={ball}
								transform={`translate(${x(1) - ball / 2} ${y(OPEN_WEIGHT.byPosition[arm][2]) - ball / 2})`}
							/>
						))}
						{!narrow &&
							ends.map((e) => (
								<text
									key={e.arm}
									className={`rl-end is-${e.arm}`}
									x={x(1) + 16}
									y={e.y + 5}
								>
									{`${COPY.rally.names[e.arm]} ${acc(OPEN_WEIGHT.byPosition[e.arm][2])}`}
								</text>
							))}
					</svg>
					{narrow && (
						<ul className="lg-legend">
							{ARMS.map((arm) => (
								<li key={arm}>
									<span className={`lg-swatch is-line is-${arm}`} />
									{COPY.rally.names[arm]}
								</li>
							))}
						</ul>
					)}
				</div>
				<Stats>
					<Stat
						label={COPY.rally.stats.vsFull}
						value={signed(OPEN_WEIGHT.freezeVsFull.delta)}
						accent
					/>
					<Stat
						label={COPY.rally.stats.vsSelf}
						value={signed(OPEN_WEIGHT.freezeVsSelfSummary.delta)}
						accent
					/>
					<Stat
						label={COPY.rally.stats.overflow}
						value={`${OPEN_WEIGHT.fullOverWindow} / ${OPEN_WEIGHT.checkpoints}`}
					/>
				</Stats>
			</div>
			<div className="lg-wrap">
				<DataTable
					summary="The numbers in this rally"
					head={["Policy", "50%", "75%", "100%", "Overall", "Context per turn"]}
					rows={ARMS.map((arm) => [
						COPY.rally.names[arm],
						...OPEN_WEIGHT.byPosition[arm].map(acc),
						acc(OPEN_WEIGHT.overall[arm]),
						tokens(OPEN_WEIGHT.contextPerTurn[arm]),
					])}
					sources={[OPEN_WEIGHT.source]}
				/>
				<p className="lg-note">
					{`Paired, per checkpoint: continuous − full ${signed(OPEN_WEIGHT.freezeVsFull.delta)} (${formatP(OPEN_WEIGHT.freezeVsFull.p)}); continuous − self-summary ${signed(OPEN_WEIGHT.freezeVsSelfSummary.delta)} (${formatP(OPEN_WEIGHT.freezeVsSelfSummary.p)}); continuous − once-full ${signed(OPEN_WEIGHT.freezeVsThreshold.delta)} (${formatP(OPEN_WEIGHT.freezeVsThreshold.p)}). ${OPEN_WEIGHT.transcripts} transcripts. ${COPY.rally.fullNote} ${OPEN_WEIGHT.transcripts}: ${OPEN_WEIGHT.fullN.join(", ")}.`}
				</p>
			</div>
		</section>
	);
}
