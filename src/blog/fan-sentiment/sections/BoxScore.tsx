import { useRef } from "react";
import { COPY } from "../copy.ts";
import { gsap, useReveal } from "../kit/motion.ts";
import { Stat } from "../kit/Scorebug.tsx";
import type { LeagueData, Snapshot } from "../snapshot.ts";
import "../theme.css";

const REPO = "https://github.com/SebastianFrazier26/mlb-fan-sentiment";

/** The final line: the answer, the three counts behind it, and the limits. */
export function BoxScore({
	result,
	league,
}: {
	result: Snapshot["confirmatory"];
	league: LeagueData;
}): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	useReveal(
		root,
		() =>
			gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(".fk-stat", { opacity: 0, y: 12, stagger: 0.14, duration: 0.35 }),
		"static",
	);
	return (
		<section className="fk-section bx" ref={root} aria-labelledby="bx-title">
			<div className="fk-wrap">
				<p className="fk-inning">{COPY.boxScore.inning}</p>
				<h2 id="bx-title" className="fk-title">
					{COPY.boxScore.title}
				</h2>
				<p className="fk-copy">{COPY.boxScore.body}</p>
				<div className="fk-stats">
					<Stat
						className="fk-verdict"
						label="Test called in advance"
						value={result.confirmed ? "Confirmed" : "Not confirmed"}
					/>
					<Stat
						label="League-wide stats that clear"
						value={`${
							league.pooled.filter((r) => (r.q_bh ?? 1) < 0.05).length
						} of ${league.pooled.length}`}
					/>
					<Stat
						label={`Fanbase tests clearing q < ${league.threshold}`}
						value={`${league.clearing} of ${league.cells.length}`}
					/>
				</div>
				<ul className="bx-limits">
					{COPY.boxScore.limits.map((limit) => (
						<li key={limit}>{limit}</li>
					))}
				</ul>
				<p className="bx-links">
					<a href={REPO}>Code and method</a> ·{" "}
					<a href={`${REPO}/blob/main/docs/preregistration.md`}>
						The test, as written down
					</a>{" "}
					·{" "}
					<a href={`${REPO}/blob/main/docs/results-2026-11.md`}>Full results</a>
				</p>
				<p className="bx-small">
					Aggregate results only. No comment text is shown or stored here.
				</p>
			</div>
		</section>
	);
}
