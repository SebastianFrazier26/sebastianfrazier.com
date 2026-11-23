/** Signed, fixed decimals, with a real minus sign: -0.0023 -> "−0.002". */
export function signed(value: number, digits = 3): string {
	const text = Math.abs(value).toFixed(digits);
	if (Number(text) === 0) return text;
	return `${value < 0 ? "−" : "+"}${text}`;
}
