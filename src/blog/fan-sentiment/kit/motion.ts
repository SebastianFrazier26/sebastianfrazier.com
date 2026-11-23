import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useLayoutEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export type Point = readonly [number, number];

/** Point on a quadratic Bézier at t in [0, 1]. */
export function bezier(t: number, p0: Point, p1: Point, p2: Point): Point {
	const u = 1 - t;
	return [
		u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
		u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
	];
}

/** A fly ball from `from` to `to`: the control point that peaks `rise` above the higher end. */
export function flyControl(from: Point, to: Point, rise: number): Point {
	const top = Math.min(from[1], to[1]) - rise;
	// A quadratic's peak sits halfway between its control point and the chord.
	return [(from[0] + to[0]) / 2, 2 * top - (from[1] + to[1]) / 2];
}

export function flyPath(from: Point, control: Point, to: Point): string {
	return `M${from[0]} ${from[1]} Q${control[0]} ${control[1]} ${to[0]} ${to[1]}`;
}

/**
 * Plays `build`'s timeline once, when the section scrolls into view. The
 * markup is always the finished picture: the timeline only animates towards
 * it, and under reduced motion (or with no script) nothing runs at all.
 * `layoutKey` names the layout the build measured (a width, say); the
 * timeline is rebuilt when it changes.
 */
export function useReveal(
	ref: RefObject<HTMLElement | null>,
	build: (scope: HTMLElement) => gsap.core.Timeline,
	layoutKey: string | number,
): void {
	const latest = useRef(build);
	latest.current = build;
	useLayoutEffect(() => {
		const scope = ref.current;
		if (!scope || layoutKey === "") return;
		const mm = gsap.matchMedia(scope);
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			const timeline = latest.current(scope).pause();
			ScrollTrigger.create({
				trigger: scope,
				start: "top 62%",
				once: true,
				onEnter: () => timeline.play(),
			});
		});
		return () => mm.revert();
	}, [ref, layoutKey]);
}

export { gsap };
