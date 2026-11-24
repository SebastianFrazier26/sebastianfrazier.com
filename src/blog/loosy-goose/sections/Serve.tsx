import { useRef } from "react";
import { COPY } from "../copy.ts";
import { SET_D, SUPERSEDE } from "../data.ts";
import { percent, tokens } from "../format.ts";
import { countUp, gsap, useScrub } from "../kit/motion.ts";
import {
	Clamp,
	DataTable,
	Goose,
	honker,
	SectionHead,
	Stat,
	Stats,
} from "../kit/Parts.tsx";
import { type Fate, fates } from "../kit/pong.ts";
import { useWidth } from "../kit/useWidth.ts";

const keptShare = SET_D.keptTokens.medium / SET_D.earlierTokens;

/**
 * One session as a grid of token squares. Scrolling fills the grid, then the
 * first goose honks the stale squares off and the second honks off the ones
 * that do not fit the budget; each leaves an outline where it was.
 */
export function Serve(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1000);
	const narrow = width < 640;
	const cols = narrow ? 10 : 16;
	const rows = 6;
	const n = cols * rows;
	const cell = narrow ? Math.min(28, (width - 16) / cols) : 30;
	const sq = Math.round(cell * 0.78);
	const gridW = cols * cell;
	const gridX = narrow
		? (width - gridW) / 2
		: Math.max(8, width / 2 - gridW / 2 - 140);
	const gridY = 34;
	const gridBottom = gridY + rows * cell;
	const H = narrow ? gridBottom + 104 : gridBottom + 30;
	const goosePx = narrow ? 3 : 4;
	const geese = narrow
		? [
				{ x: width * 0.3, y: H - 8 },
				{ x: width * 0.72, y: H - 8 },
			]
		: [
				{ x: gridX + gridW + 120, y: gridBottom },
				{ x: gridX + gridW + 250, y: gridBottom },
			];
	const plan: Fate[] = fates(n, keptShare, SUPERSEDE.share);
	const pos = (i: number): [number, number] => [
		gridX + (i % cols) * cell + (cell - sq) / 2,
		gridY + Math.floor(i / cols) * cell + (cell - sq) / 2,
	];

	useScrub(
		root,
		(scope) => {
			const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
			tl.from(scope.querySelectorAll(".sv-cell"), {
				scale: 0,
				transformOrigin: "50% 50%",
				duration: 0.3,
				stagger: { each: 0.008, from: "start" },
			});
			const honk = (goose: number, fate: Fate, at: gsap.Position): void => {
				const g = scope.querySelector(`.sv-goose-${goose}`);
				const [gx, gy] = [geese[goose]?.x ?? 0, geese[goose]?.y ?? 0];
				tl.to(honker(g), { t: 1, duration: 0.3, ease: "none" }, at).from(
					scope.querySelectorAll(`.sv-cover-${fate}`),
					{ opacity: 1, duration: 0.25, stagger: 0.006 },
					"<0.05",
				);
				scope
					.querySelectorAll<SVGRectElement>(`.sv-ghost-${fate}`)
					.forEach((el, i) => {
						const x = Number(el.getAttribute("x"));
						const y = Number(el.getAttribute("y"));
						tl.fromTo(
							el,
							{ x: 0, y: 0, opacity: 1 },
							{
								x: gx - x - sq / 2,
								y: gy - 40 - y,
								opacity: 0,
								duration: 0.45,
								ease: "power1.in",
								immediateRender: false,
							},
							i === 0 ? "<" : "<0.004",
						);
					});
			};
			honk(0, "stale", ">0.1");
			honk(1, "dropped", ">0.05");
			tl.from(
				scope.querySelectorAll(".sv-cover-kept"),
				{ opacity: 1, duration: 0.3, stagger: 0.004 },
				">",
			);
			return countUp(tl, scope, "<");
		},
		width,
		{ pin: ".sv-pin", distance: "+=130%" },
	);

	return (
		<section className="lg-section sv" ref={root} aria-labelledby="sv-title">
			<div className="lg-wrap">
				<SectionHead
					id="sv-title"
					score="1 : 0"
					kicker={COPY.serve.kicker}
					title={COPY.serve.title}
				>
					<Clamp>{COPY.serve.body}</Clamp>
				</SectionHead>
			</div>
			<div className="lg-bleed sv-pin">
				<div className="lg-scene" ref={box}>
					<svg
						width={width}
						height={H}
						viewBox={`0 0 ${width} ${H}`}
						role="img"
						aria-labelledby="sv-svg-title"
					>
						<title id="sv-svg-title">
							{`A session of ${tokens(SET_D.earlierTokens)} tokens as ${n} squares: ${percent(SUPERSEDE.share)} stale and removed losslessly, the rest dropped until ${tokens(SET_D.keptTokens.medium)} tokens remain.`}
						</title>
						{plan.map((fate, i) => {
							const [x, y] = pos(i);
							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: squares are positional.
								<g key={i} className="sv-cell">
									<rect
										className={`sv-sq sv-sq-${fate}`}
										x={x}
										y={y}
										width={sq}
										height={sq}
										rx={0}
									/>
									<rect
										className={`sv-cover sv-cover-${fate}`}
										x={x}
										y={y}
										width={sq}
										height={sq}
										rx={0}
										opacity={0}
									/>
									{fate !== "kept" && (
										<rect
											className={`sv-ghost sv-ghost-${fate}`}
											x={x}
											y={y}
											width={sq}
											height={sq}
											rx={0}
											opacity={0}
										/>
									)}
								</g>
							);
						})}
						{!narrow && (
							<line
								className="lg-floor"
								x1={gridX + gridW + 60}
								x2={width - 8}
								y1={gridBottom}
								y2={gridBottom}
							/>
						)}
						<Goose
							className="sv-goose-0"
							x={geese[0]?.x ?? 0}
							y={geese[0]?.y ?? 0}
							px={goosePx}
							flip
							honk={COPY.serve.honkStale}
						/>
						<Goose
							className="sv-goose-1"
							x={geese[1]?.x ?? 0}
							y={geese[1]?.y ?? 0}
							px={goosePx}
							flip
							honk={COPY.serve.honkDrop}
						/>
					</svg>
					<ul className="lg-legend">
						<li>
							<span className="lg-swatch is-kept" />
							{COPY.serve.legendKept}
						</li>
						<li>
							<span className="lg-swatch is-stale" />
							{COPY.serve.legendStale}
						</li>
						<li>
							<span className="lg-swatch is-dropped" />
							{COPY.serve.legendDropped}
						</li>
					</ul>
				</div>
				<Stats>
					<Stat
						label={COPY.serve.stats.before}
						value={tokens(SET_D.earlierTokens)}
						count={{ to: SET_D.earlierTokens }}
					/>
					<Stat
						label={COPY.serve.stats.after}
						value={tokens(SET_D.keptTokens.medium)}
						count={{ to: SET_D.keptTokens.medium, from: SET_D.earlierTokens }}
						accent
					/>
					<Stat
						label={COPY.serve.stats.lossless}
						value={percent(SUPERSEDE.share)}
						count={{ to: SUPERSEDE.share * 100, digits: 1, suffix: "%" }}
					/>
					<Stat
						label={COPY.serve.stats.speed}
						value={SUPERSEDE.secondsPer100k.toFixed(2)}
					/>
				</Stats>
			</div>
			<div className="lg-wrap">
				<p className="lg-note">{COPY.serve.note}</p>
				<DataTable
					summary="The numbers in this play"
					head={["What", "Value"]}
					rows={[
						[
							"Earlier stretch, set D mean (tokens)",
							tokens(SET_D.earlierTokens),
						],
						[
							"Kept at medium, set D mean (tokens)",
							tokens(SET_D.keptTokens.medium),
						],
						[
							"Removed losslessly, 1.50M-token corpus",
							`${tokens(SUPERSEDE.removedTokens)} of ${tokens(SUPERSEDE.corpusTokens)} (${percent(SUPERSEDE.share)})`,
						],
						[
							"Selection time, median seconds per 100k tokens",
							SUPERSEDE.secondsPer100k.toFixed(2),
						],
					]}
					sources={[SET_D.source, SUPERSEDE.source, "exp_g_summary.txt"]}
				/>
			</div>
		</section>
	);
}
