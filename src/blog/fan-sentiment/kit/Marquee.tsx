import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { gsap, useReveal } from "./motion.ts";

/** Distance from the sign's edge to the bulb centres, and between bulbs. */
const BAND = 13;
const SPACING = 24;

type Bulb = readonly [number, number];

/**
 * Bulb centres around a w × h sign, clockwise from the top-left corner, so
 * consecutive indices are neighbours and a chase runs around the frame.
 */
export function bulbRing(w: number, h: number): Bulb[] {
	const x0 = BAND;
	const y0 = BAND;
	const x1 = w - BAND;
	const y1 = h - BAND;
	if (x1 <= x0 || y1 <= y0) return [];
	const across = Math.max(1, Math.round((x1 - x0) / SPACING));
	const down = Math.max(1, Math.round((y1 - y0) / SPACING));
	const out: Bulb[] = [];
	for (let i = 0; i < across; i++)
		out.push([x0 + ((x1 - x0) * i) / across, y0]);
	for (let i = 0; i < down; i++) out.push([x1, y0 + ((y1 - y0) * i) / down]);
	for (let i = 0; i < across; i++)
		out.push([x1 - ((x1 - x0) * i) / across, y1]);
	for (let i = 0; i < down; i++) out.push([x0, y1 - ((y1 - y0) * i) / down]);
	return out;
}

function useBox(ref: React.RefObject<HTMLElement | null>): [number, number] {
	const [box, setBox] = useState<[number, number]>([0, 0]);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = (): void =>
			setBox([Math.round(el.offsetWidth), Math.round(el.offsetHeight)]);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return box;
}

/**
 * The page title as a ballpark marquee: a red sign ringed with bulbs. On load
 * the bulbs flicker on, the letters flip up one by one, the bulbs chase round
 * the frame a few times and the whole sign settles fully lit, which is also
 * the markup's picture (and all that reduced motion shows).
 */
export function Marquee({
	id,
	title,
}: {
	id: string;
	title: string;
}): React.ReactElement {
	const root = useRef<HTMLDivElement>(null);
	const [w, h] = useBox(root);
	const bulbs = bulbRing(w, h);
	useReveal(
		root,
		(scope) => {
			const all = [...scope.querySelectorAll(".mq-bulb")];
			const phase = (k: number): Element[] => all.filter((_, i) => i % 3 === k);
			const tl = gsap
				.timeline({ delay: 0.15 })
				.from(scope, {
					scaleY: 0.2,
					opacity: 0,
					transformOrigin: "50% 50%",
					duration: 0.35,
					ease: "back.out(1.8)",
				})
				.set(all, { opacity: 0.2 })
				.from(scope.querySelectorAll(".mq-letter"), {
					rotationX: -95,
					opacity: 0,
					transformPerspective: 500,
					transformOrigin: "50% 100%",
					duration: 0.4,
					ease: "back.out(2.2)",
					stagger: 0.045,
				});
			// A three-phase chase: a third of the bulbs lit, stepping one bulb
			// round the ring each beat.
			for (let beat = 0; beat < 15; beat++) {
				tl.set(all, { opacity: 0.2 }, `>${beat === 0 ? 0 : 0.11}`).set(
					phase(beat % 3),
					{ opacity: 1 },
					"<",
				);
			}
			return tl.set(all, { opacity: 1 }, ">0.11");
		},
		bulbs.length > 0 ? "lit" : "",
		{ play: true },
	);
	const words = title.split(" ");
	return (
		<div className="mq" ref={root}>
			<svg
				className="mq-frame"
				width={w}
				height={h}
				viewBox={`0 0 ${w} ${h}`}
				aria-hidden="true"
			>
				<rect
					className="mq-trim"
					x={BAND * 2}
					y={BAND * 2}
					width={Math.max(0, w - BAND * 4)}
					height={Math.max(0, h - BAND * 4)}
					rx={6}
				/>
				{bulbs.map(([x, y], i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: bulbs are positions round a ring, nothing to key them by.
					<g key={i} className="mq-bulb" transform={`translate(${x} ${y})`}>
						<circle className="mq-halo" r={6.5} />
						<circle className="mq-glass" r={4} />
					</g>
				))}
			</svg>
			<h1 id={id} className="fk-title mq-title">
				<span className="mq-sr">{title}</span>
				<span aria-hidden="true">
					{words.map((word, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a title's words never reorder.
						<Fragment key={i}>
							{i > 0 && " "}
							<span className="mq-word">
								{[...word].map((ch, j) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: a word's letters never reorder.
									<span key={j} className="mq-letter">
										{ch}
									</span>
								))}
							</span>
						</Fragment>
					))}
				</span>
			</h1>
		</div>
	);
}
