import { useRef } from "react";
import { COPY } from "../copy.ts";
import { DEMO, OPEN_WEIGHT, REPO, SET_D } from "../data.ts";
import { acc } from "../format.ts";
import { countUp, gsap, useScrub } from "../kit/motion.ts";
import { Goose, SectionHead } from "../kit/Parts.tsx";

interface Board {
	title: string;
	note: string;
	home: { name: string; value: number; goose: boolean };
	away: { name: string; value: number; goose: boolean };
}

/**
 * Two scoreboards that flip up as they scroll in and count to their final
 * score, then what the goose is for and where to read more.
 */
export function Final(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const boards: Board[] = [
		{
			title: COPY.final.boards.frontier,
			note: `set D · medium · n = ${SET_D.transcripts}`,
			home: {
				name: COPY.paddle.right,
				value: SET_D.summary.medium.mean,
				goose: false,
			},
			away: {
				name: COPY.paddle.left,
				value: SET_D.loosy.medium.mean,
				goose: true,
			},
		},
		{
			title: COPY.final.boards.local,
			note: `set F · open weights · n = ${OPEN_WEIGHT.transcripts}`,
			home: {
				name: COPY.rally.names.freeze,
				value: OPEN_WEIGHT.overall.freeze,
				goose: true,
			},
			away: {
				name: COPY.rally.names.qthresh,
				value: OPEN_WEIGHT.overall.qthresh,
				goose: false,
			},
		},
	];

	useScrub(
		root,
		(scope) => {
			const tl = gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(scope.querySelectorAll(".fn-board"), {
					rotationX: -80,
					opacity: 0,
					transformOrigin: "50% 0%",
					duration: 0.5,
					stagger: 0.2,
				});
			countUp(tl, scope, "<0.2", 0.6);
			return tl
				.from(
					scope.querySelectorAll(".fn-uses li"),
					{ opacity: 0, x: -16, duration: 0.3, stagger: 0.08 },
					">-0.2",
				)
				.from(
					scope.querySelector(".fn-goose-walk"),
					{ x: -60, opacity: 0, duration: 0.5 },
					"<",
				)
				.fromTo(
					scope.querySelector(".fn-goose .lg-honk"),
					{ opacity: 0 },
					{ opacity: 1, duration: 0.15, yoyo: true, repeat: 1 },
					">",
				);
		},
		"static",
		{ start: "top 80%", end: "bottom 85%" },
	);

	return (
		<section className="lg-section fn" ref={root} aria-labelledby="fn-title">
			<div className="lg-wrap">
				<SectionHead
					id="fn-title"
					score="F"
					kicker={COPY.final.kicker}
					title={COPY.final.title}
				>
					<p className="lg-copy">{COPY.final.body}</p>
				</SectionHead>
				<div className="fn-boards">
					{boards.map((b) => (
						<div key={b.title} className="fn-board">
							<p className="fn-board-title">{b.title}</p>
							{[b.home, b.away].map((side) => (
								<p
									key={side.name}
									className={`fn-side${side.goose ? " is-goose" : ""}`}
								>
									<span className="fn-side-name">{side.name}</span>
									<span
										className="fn-side-value"
										data-count={side.value}
										data-digits={3}
									>
										{acc(side.value)}
									</span>
								</p>
							))}
							<p className="fn-board-note">{b.note}</p>
						</div>
					))}
				</div>
				<div className="fn-play">
					<ul className="fn-uses">
						{COPY.final.uses.map((u) => (
							<li key={u}>{u}</li>
						))}
					</ul>
					<svg
						className="fn-goose-svg"
						width={140}
						height={90}
						viewBox="0 0 140 90"
						aria-hidden="true"
					>
						<g className="fn-goose-walk">
							<Goose
								className="fn-goose"
								x={50}
								y={84}
								scale={1.2}
								honk={COPY.serve.honkDrop}
							/>
						</g>
					</svg>
				</div>
				<details className="lg-table fn-limits">
					<summary>{COPY.final.limitsTitle}</summary>
					<ul>
						{COPY.final.limits.map((l) => (
							<li key={l}>{l}</li>
						))}
					</ul>
				</details>
				<p className="fn-links">
					<a href={REPO}>{COPY.final.links.repo} →</a>
					<a href={DEMO}>{COPY.final.links.demo} →</a>
				</p>
			</div>
		</section>
	);
}
