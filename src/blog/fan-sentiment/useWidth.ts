import { type RefObject, useLayoutEffect, useState } from "react";

/** Content width of an element in CSS pixels, tracked across resizes. */
export function useWidth(
	ref: RefObject<HTMLElement | null>,
	initial: number,
): number {
	const [width, setWidth] = useState(initial);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = (): void => setWidth(Math.round(el.clientWidth));
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return width;
}
