import picomatch from "picomatch";

/**
 * gitignore-style patterns over repo-relative POSIX paths:
 * - a pattern with no "/" except a trailing one ("data/", "*.log") matches
 *   at any depth;
 * - a leading "/" or a "/" in the middle ("/build", "src/seed.js") anchors it
 *   to the repo root;
 * - a match on a directory excludes everything under it.
 * Negation ("!") isn't supported: an exclude list that can un-exclude is
 * harder to audit than the leak it might cause.
 */
export function compilePattern(raw: string): string {
	let pattern = raw.replace(/\/+$/, "");
	const anchored = pattern.startsWith("/") || pattern.includes("/");
	pattern = pattern.replace(/^\/+/, "");
	if (!anchored && !pattern.startsWith("**/")) pattern = `**/${pattern}`;
	return pattern;
}

export function makeExcluder(
	patterns: readonly string[],
): (path: string) => boolean {
	const matchers = patterns.flatMap((raw) => {
		if (raw.startsWith("!")) {
			throw new Error(`negated exclude "${raw}" is not supported`);
		}
		const pattern = compilePattern(raw);
		return [
			picomatch(pattern, { dot: true }),
			picomatch(`${pattern}/**`, { dot: true }),
		];
	});
	return (path) => {
		const clean = path.replace(/^\.\//, "").replace(/\/+$/, "");
		return matchers.some((m) => m(clean));
	};
}
