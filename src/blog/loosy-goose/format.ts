/** Signed, fixed decimals, with a real minus sign: -0.0023 -> "−0.002". */
export function signed(value: number, digits = 3): string {
	const text = Math.abs(value).toFixed(digits);
	if (Number(text) === 0) return text;
	return `${value < 0 ? "−" : "+"}${text}`;
}

/** Accuracy as the result tables print it: 0.8 -> "0.800". */
export function acc(value: number): string {
	return value.toFixed(3);
}

/** A sign-test p-value; tables print values under 0.001 as 0.000. */
export function formatP(p: number): string {
	return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}

/** 19333 -> "19,333"; 12355 -> "12.4k" with `short`. */
export function tokens(n: number, short = false): string {
	if (short && n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toLocaleString("en-US");
}

export function percent(share: number, digits = 1): string {
	return `${(share * 100).toFixed(digits)}%`;
}

/**
 * `signed` for text set in the pixel font, which has no U+2212: a real minus
 * there falls back to another font and sits off the pixel baseline.
 */
export function pixelSigned(value: number, digits = 3): string {
	return signed(value, digits).replace("−", "-");
}
