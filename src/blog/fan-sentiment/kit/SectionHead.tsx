import { Fragment, type ReactNode, useRef } from "react";
import { gsap, useParallax, useReveal } from "./motion.ts";

/**
 * A section's opening: a scoreboard numeral drifting behind, the inning
 * kicker, a marquee title whose words rise out of their own line, and the
 * copy. Animates itself, so a section only builds its scene's timeline.
 */
export function SectionHead({
	id,
	numeral,
	inning,
	title,
	children,
	level = 2,
}: {
	id: string;
	numeral: string;
	inning: string;
	title: string;
	children?: ReactNode;
	level?: 1 | 2;
}): React.ReactElement {
	const root = useRef<HTMLDivElement>(null);
	useParallax(root);
	useReveal(
		root,
		(scope) =>
			gsap
				.timeline({ defaults: { ease: "power3.out" } })
				.from(scope.querySelector(".fk-numeral-glyph"), {
					opacity: 0,
					scale: 0.86,
					duration: 1.1,
				})
				.from(
					scope.querySelector(".fk-inning"),
					{ opacity: 0, x: -18, duration: 0.5 },
					"<0.1",
				)
				.from(
					scope.querySelectorAll(".fk-word > span"),
					{ yPercent: 110, duration: 0.7, stagger: 0.06 },
					"<0.05",
				)
				.from(
					scope.querySelectorAll(".fk-head-copy > *"),
					{ opacity: 0, y: 18, duration: 0.6, stagger: 0.08 },
					"<0.3",
				),
		"static",
		// The page title is on screen before any scroll, so it plays in; every
		// later head scrubs with the scroll.
		level === 1
			? { play: true }
			: { start: "top 90%", end: "clamp(bottom 60%)" },
	);
	const Title = level === 1 ? "h1" : "h2";
	return (
		<div className="fk-head" ref={root}>
			<span className="fk-numeral" aria-hidden="true" data-depth="0.18">
				<span className="fk-numeral-glyph">{numeral}</span>
			</span>
			<p className="fk-inning">{inning}</p>
			<Title id={id} className="fk-title">
				{title.split(" ").map((word, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: a title's words never reorder.
					<Fragment key={i}>
						{i > 0 && " "}
						<span className="fk-word">
							<span>{word}</span>
						</span>
					</Fragment>
				))}
			</Title>
			{children && <div className="fk-head-copy">{children}</div>}
		</div>
	);
}
