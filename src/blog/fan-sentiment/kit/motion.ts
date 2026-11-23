import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useLayoutEffect, useRef } from "react";
import { signed } from "../format.ts";

gsap.registerPlugin(ScrollTrigger);
let pendingRefresh = 0;
/**
 * A pin's start and end are measured against everything above it, so every
 * layout change above a pin re-measures all triggers (once per frame, however
 * many ask): a section rebuilding for a new width, and the marquee and
 * scorebug fonts arriving. `fonts.ready` alone is not enough, since it can
 * resolve before the post has asked for any font.
 */
function scheduleRefresh(): void {
	cancelAnimationFrame(pendingRefresh);
	pendingRefresh = requestAnimationFrame(() => {
		ScrollTrigger.sort();
		ScrollTrigger.refresh();
	});
}
if (typeof document !== "undefined" && document.fonts) {
	document.fonts.addEventListener("loadingdone", scheduleRefresh);
}

export type Point = readonly [number, number];

/**
 * Which scenes pin and scrub with the scroll on roomy screens. The rest, and
 * every scene on a phone, play once as they scroll into view. Flip one to
 * false to make it play instead; nothing else changes.
 */
export const SCRUBBED = {
	pitch: true,
	hitting: true,
	league: false,
	review: false,
} as const;

const MOTION = "(prefers-reduced-motion: no-preference)";
/** Below this, a pinned scene would take the whole phone screen; play it instead. */
const PIN_MEDIA = `${MOTION} and (min-width: 760px) and (min-height: 620px)`;
const PLAY_MEDIA = `${MOTION} and ((max-width: 759px) or (max-height: 619px))`;

/** Point on a quadratic Bézier at t in [0, 1]. */
export function bezier(t: number, p0: Point, p1: Point, p2: Point): Point {
	const u = 1 - t;
	return [
		u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
		u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
	];
}

/** Velocity of the same curve at t (per unit t). */
export function bezierVelocity(
	t: number,
	p0: Point,
	p1: Point,
	p2: Point,
): Point {
	return [
		2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
		2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
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

export interface Flight {
	from: Point;
	control: Point;
	to: Point;
	/** The ground the shadow runs along. */
	ground: number;
}

/** How far the ball stretches along its path at a given speed (units per t). */
export function stretchFor(speed: number): number {
	return Math.min(0.32, speed / 2400);
}

/**
 * Returns draw(t) for a Flight component: the ball rides the curve stretched
 * along its velocity, a short trail of ghosts follows it, and its shadow
 * tracks it on the ground, shrinking with height. At t = 1 everything is back
 * to the markup's finished picture.
 */
export function flightDrawer(
	root: Element | null,
	f: Flight,
): (t: number) => void {
	const ball = root?.querySelector(".fk-flight-ball");
	const shadow = root?.querySelector(".fk-shadow");
	const ghosts = [...(root?.querySelectorAll(".fk-ghost") ?? [])];
	return (t) => {
		const [x, y] = bezier(t, f.from, f.control, f.to);
		const [vx, vy] = bezierVelocity(t, f.from, f.control, f.to);
		const k = t >= 1 ? 0 : stretchFor(Math.hypot(vx, vy));
		const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
		ball?.setAttribute(
			"transform",
			`translate(${x} ${y}) rotate(${deg}) scale(${1 + k} ${1 - k * 0.6}) rotate(${-deg})`,
		);
		const lift = Math.max(0, f.ground - y);
		const near = Math.max(0.35, 1 - lift / 260);
		shadow?.setAttribute(
			"transform",
			`translate(${x} ${f.ground}) scale(${near})`,
		);
		shadow?.setAttribute("opacity", String(0.15 + 0.3 * near));
		ghosts.forEach((g, i) => {
			const back = Math.max(0, t - (i + 1) * 0.045);
			const [gx, gy] = bezier(back, f.from, f.control, f.to);
			g.setAttribute("transform", `translate(${gx} ${gy})`);
			const live = t > 0 && t < 1 ? 1 : 0;
			g.setAttribute("opacity", String(live * (0.4 - i * 0.09)));
		});
	};
}

interface RevealOptions {
	/**
	 * On roomy screens, tie the timeline to scrolling instead of playing it:
	 * the element this selector names is pinned while the timeline scrubs.
	 */
	pin?: string;
	/** How much scrolling the pinned timeline spans. */
	distance?: string;
}

/**
 * Plays `build`'s timeline once, when the section scrolls into view, or
 * scrubs it under a pinned scene (see RevealOptions). The markup is always the
 * finished picture: the timeline only animates towards it, and under reduced
 * motion (or with no script) nothing runs at all. `layoutKey` names the layout
 * the build measured (a width, say); the timeline is rebuilt when it changes.
 */
export function useReveal(
	ref: RefObject<HTMLElement | null>,
	build: (scope: HTMLElement) => gsap.core.Timeline,
	layoutKey: string | number,
	options: RevealOptions = {},
): void {
	const latest = useRef(build);
	latest.current = build;
	const { pin, distance = "+=120%" } = options;
	useLayoutEffect(() => {
		const scope = ref.current;
		if (!scope || layoutKey === "") return;
		const mm = gsap.matchMedia(scope);
		const play = (): void => {
			const timeline = latest.current(scope).pause();
			ScrollTrigger.create({
				trigger: scope,
				start: "top 62%",
				once: true,
				onEnter: () => timeline.play(),
			});
		};
		if (!pin) {
			mm.add(MOTION, play);
		} else {
			mm.add(PLAY_MEDIA, play);
			mm.add(PIN_MEDIA, () => {
				const target = scope.querySelector(pin);
				const timeline = latest.current(scope).pause();
				ScrollTrigger.create({
					trigger: target ?? scope,
					start: "center center",
					end: distance,
					pin: target ?? true,
					scrub: 0.7,
					animation: timeline,
				});
			});
		}
		scheduleRefresh();
		return () => mm.revert();
	}, [ref, layoutKey, pin, distance]);
}

/**
 * Moves every `[data-depth]` element in `ref` against the scroll, by its
 * depth as a fraction of the viewport, so layers drift at different speeds.
 */
export function useParallax(ref: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const scope = ref.current;
		if (!scope) return;
		const mm = gsap.matchMedia(scope);
		mm.add(MOTION, () => {
			for (const el of scope.querySelectorAll<HTMLElement | SVGElement>(
				"[data-depth]",
			)) {
				const depth = Number(el.getAttribute("data-depth")) || 0;
				gsap.fromTo(
					el,
					{ y: () => depth * window.innerHeight * 0.5 },
					{
						y: () => -depth * window.innerHeight * 0.5,
						ease: "none",
						scrollTrigger: {
							trigger: scope,
							start: "top bottom",
							end: "bottom top",
							scrub: true,
							invalidateOnRefresh: true,
						},
					},
				);
			}
		});
		return () => mm.revert();
	}, [ref]);
}

/**
 * Counts every `[data-count]` numeral in `scope` up from zero and pops its
 * chip in, on `tl` at `at`. The markup already holds the final text.
 */
export function countUp(
	tl: gsap.core.Timeline,
	scope: Element,
	at: gsap.Position = ">",
	duration = 0.9,
	ease = "power3.out",
): gsap.core.Timeline {
	tl.from(
		scope.querySelectorAll(".fk-stats"),
		{
			opacity: 0,
			scaleX: 0.4,
			transformOrigin: "50% 50%",
			ease: "expo.out",
			duration: 0.5,
		},
		at,
	).from(
		scope.querySelectorAll(".fk-stat"),
		{
			opacity: 0,
			scale: 0.7,
			y: 14,
			transformOrigin: "50% 100%",
			ease: "back.out(2.4)",
			duration: 0.45,
			stagger: 0.1,
		},
		"<0.15",
	);
	scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el, i) => {
		const end = Number(el.dataset.count);
		const digits = Number(el.dataset.digits ?? 0);
		const signedNum = el.dataset.signed === "true";
		// Kept from the first build: a rebuild may find the text mid-count.
		el.dataset.final ??= el.textContent ?? "";
		const final = el.dataset.final;
		// The numeral is written by a setter, not an onUpdate callback: GSAP
		// skips callbacks when a scrubbed timeline jumps (a refresh, a fast
		// scroll), but always sets the property, so the text cannot go stale.
		const counter = {
			value: 0,
			get v(): number {
				return this.value;
			},
			set v(next: number) {
				this.value = next;
				el.textContent =
					next === end ? final : formatCount(next, digits, signedNum);
			},
		};
		tl.fromTo(
			counter,
			{ v: 0 },
			{ v: end, duration, ease, immediateRender: false },
			i === 0 ? "<" : "<0.1",
		);
	});
	return tl;
}

export function formatCount(
	v: number,
	digits: number,
	signedNum: boolean,
): string {
	return signedNum ? signed(v, digits) : v.toFixed(digits);
}

/**
 * A puff of infield dirt where a ball lands: the Puff component's specks fly
 * out and fade, ending invisible as the markup has them.
 */
export function puff(
	tl: gsap.core.Timeline,
	el: Element | null,
	at: gsap.Position = ">",
): gsap.core.Timeline {
	const specks = el ? [...el.querySelectorAll(".fk-speck")] : [];
	if (specks.length === 0) return tl;
	return tl.fromTo(
		specks,
		{ x: 0, y: 0, opacity: 0.95, scale: 1 },
		{
			x: (i: number) => ((i / (specks.length - 1)) * 2 - 1) * 22,
			y: (i: number) => -6 - ((i * 5) % 9),
			opacity: 0,
			scale: 0.4,
			duration: 0.55,
			ease: "power2.out",
		},
		at,
	);
}

export { gsap };
