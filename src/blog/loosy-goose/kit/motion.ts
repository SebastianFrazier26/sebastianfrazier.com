import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useLayoutEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);
// Phones show and hide the address bar while scrolling; re-measuring every
// pin on each of those resizes makes pinned scenes jump.
ScrollTrigger.config({ ignoreMobileResize: true });

let pendingRefresh = 0;
/**
 * A pin's start and end are measured against everything above it, so any
 * layout change above a pin re-measures every trigger, once per frame.
 */
function scheduleRefresh(): void {
	cancelAnimationFrame(pendingRefresh);
	pendingRefresh = requestAnimationFrame(() => {
		ScrollTrigger.sort();
		ScrollTrigger.refresh();
	});
}

/**
 * Scenes drawn by hand (driver) are not GSAP tweens, so mm.revert() cannot
 * undo them. Each driver registers a reset to its finished picture here while
 * a scene builds, and the scene's cleanup runs them.
 */
let collecting: (() => void)[] | null = null;
function collect(build: () => void): () => void {
	const resets: (() => void)[] = [];
	collecting = resets;
	try {
		build();
	} finally {
		collecting = null;
	}
	return () => {
		for (const reset of resets) reset();
	};
}

export const MOTION = "(prefers-reduced-motion: no-preference)";
/** Too short a screen to pin a scene and still read it: scrub it unpinned. */
const PIN_MEDIA = `${MOTION} and (min-height: 560px)`;
const FREE_MEDIA = `${MOTION} and (max-height: 559px)`;

interface ScrubOptions {
	/** Selector of the element to pin while the timeline scrubs. */
	pin?: string;
	/** How much scrolling the pinned timeline spans. */
	distance?: string;
	/** Start and end of an unpinned scrub (ScrollTrigger syntax). */
	start?: string;
	end?: string;
}

/**
 * Ties `build`'s timeline to the scroll position, on every screen width:
 * pinned under `pin` when the screen is tall enough, otherwise scrubbed while
 * the section passes through the viewport. The markup is always the finished
 * picture and the timeline only animates towards it, so under reduced motion
 * (or with no script) the reader sees the end state. `layoutKey` names the
 * layout the build measured; the timeline is rebuilt when it changes.
 */
export function useScrub(
	ref: RefObject<HTMLElement | null>,
	build: (scope: HTMLElement) => gsap.core.Timeline,
	layoutKey: string | number,
	options: ScrubOptions = {},
): void {
	const latest = useRef(build);
	latest.current = build;
	const {
		pin,
		distance = "+=110%",
		start = "top 85%",
		end = "bottom 55%",
	} = options;
	useLayoutEffect(() => {
		const scope = ref.current;
		if (!scope || layoutKey === "") return;
		const mm = gsap.matchMedia(scope);
		const free = (): (() => void) =>
			collect(() => {
				ScrollTrigger.create({
					trigger: scope,
					start,
					end,
					scrub: 0.6,
					animation: latest.current(scope),
				});
			});
		if (!pin) {
			mm.add(MOTION, free);
		} else {
			mm.add(FREE_MEDIA, free);
			mm.add(PIN_MEDIA, () =>
				collect(() => {
					const target = scope.querySelector(pin);
					ScrollTrigger.create({
						trigger: target ?? scope,
						start: "center center",
						end: distance,
						pin: target ?? true,
						scrub: 0.6,
						animation: latest.current(scope),
					});
				}),
			);
		}
		scheduleRefresh();
		return () => mm.revert();
	}, [ref, layoutKey, pin, distance, start, end]);
}

/**
 * A section opening that rises in as it scrolls up the screen and settles
 * by the time it is a third of the way down.
 */
export function useHeadScrub(ref: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const scope = ref.current;
		if (!scope) return;
		const mm = gsap.matchMedia(scope);
		mm.add(MOTION, () => {
			const tl = gsap
				.timeline({ defaults: { ease: "power2.out" } })
				.from(scope.querySelector(".lg-score"), {
					opacity: 0,
					x: 40,
					duration: 1,
				})
				.from(
					scope.querySelector(".lg-kicker"),
					{ opacity: 0, x: -20, duration: 0.6 },
					"<",
				)
				.from(
					scope.querySelectorAll(".lg-word > span"),
					{ yPercent: 110, duration: 0.6, stagger: 0.06 },
					"<0.1",
				)
				.from(
					scope.querySelectorAll(".lg-head-copy > *"),
					{ opacity: 0, y: 16, duration: 0.6, stagger: 0.1 },
					"<0.2",
				);
			ScrollTrigger.create({
				trigger: scope,
				start: "top 92%",
				end: "top 45%",
				scrub: 0.5,
				animation: tl,
			});
		});
		return () => mm.revert();
	}, [ref]);
}

/**
 * Counts every `[data-count]` numeral in `scope` from `from` to its value on
 * `tl` at `at`. The markup already holds the final text, and it is restored
 * exactly at the end of the tween.
 */
export function countUp(
	tl: gsap.core.Timeline,
	scope: Element,
	at: gsap.Position = ">",
	duration = 0.8,
): gsap.core.Timeline {
	scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el, i) => {
		const end = Number(el.dataset.count);
		const start = Number(el.dataset.from ?? 0);
		const digits = Number(el.dataset.digits ?? 0);
		el.dataset.final ??= el.textContent ?? "";
		const final = el.dataset.final;
		const prefix = el.dataset.prefix ?? "";
		const suffix = el.dataset.suffix ?? "";
		// A setter, not onUpdate: GSAP skips callbacks when a scrubbed
		// timeline jumps (a refresh, a fast fling) but always sets the
		// property, so the text cannot be left mid-count.
		const counter = {
			value: start,
			get v(): number {
				return this.value;
			},
			set v(next: number) {
				this.value = next;
				el.textContent =
					next === end
						? final
						: `${prefix}${next.toLocaleString("en-US", {
								minimumFractionDigits: digits,
								maximumFractionDigits: digits,
							})}${suffix}`;
			},
		};
		tl.fromTo(
			counter,
			{ v: start },
			{ v: end, duration, ease: "power1.out", immediateRender: false },
			i === 0 ? at : "<",
		);
	});
	return tl;
}

/**
 * A proxy whose `t` drives `draw`: tween `t` on a timeline and the scene
 * redraws, through a setter for the same reason as in countUp.
 */
export function driver(draw: (t: number) => void, initial = 0): { t: number } {
	let value = initial;
	draw(initial);
	collecting?.push(() => draw(1));
	return {
		get t(): number {
			return value;
		},
		set t(next: number) {
			value = next;
			draw(next);
		},
	};
}

export { gsap };
