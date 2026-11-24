/** Triangle wave: 0 at even u, 1 at odd u, linear between. */
export function triangle(u: number): number {
	const m = ((u % 2) + 2) % 2;
	return m <= 1 ? m : 2 - m;
}

/**
 * Where a pong ball is at t in [0, 1], in unit court coordinates: it crosses
 * the court `crossings` times and bounces off the walls `walls` times, starting
 * at the left paddle, a little below the middle.
 */
export function rally(
	t: number,
	crossings: number,
	walls: number,
): readonly [number, number] {
	return [triangle(t * crossings), triangle(t * walls + 0.6)];
}

/** A paddle's centre that follows the ball but stays inside the court. */
export function paddleFollow(
	ballY: number,
	half: number,
	top: number,
	bottom: number,
): number {
	return Math.min(bottom - half, Math.max(top + half, ballY));
}

/**
 * A small deterministic shuffle (an LCG), so the token grid looks scattered
 * but is identical on every render and in every test.
 */
export function scatter(n: number, seed = 7): number[] {
	const order = Array.from({ length: n }, (_, i) => i);
	let s = seed;
	for (let i = n - 1; i > 0; i--) {
		s = (s * 1103515245 + 12345) % 2147483648;
		const j = s % (i + 1);
		const a = order[i] as number;
		order[i] = order[j] as number;
		order[j] = a;
	}
	return order;
}

export type Fate = "kept" | "stale" | "dropped";

/**
 * Splits `n` squares into kept, stale and dropped by share, rounding so the
 * three counts always add up to `n`, and scatters which square gets which.
 */
export function fates(n: number, kept: number, stale: number): Fate[] {
	const k = Math.round(n * kept);
	const s = Math.min(n - k, Math.round(n * stale));
	const out: Fate[] = new Array(n).fill("dropped");
	scatter(n).forEach((square, rank) => {
		if (rank < k) out[square] = "kept";
		else if (rank < k + s) out[square] = "stale";
	});
	return out;
}
