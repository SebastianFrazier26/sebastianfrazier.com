import picomatch from "picomatch";

/**
 * One predicate over repo-relative POSIX paths. A pattern ending in "/" (or
 * naming a directory outright, like "data") also excludes everything under
 * it, so projects.json can say "data/" the way a .gitignore would.
 */
export function makeExcluder(
	patterns: readonly string[],
): (path: string) => boolean {
	const matchers = patterns.flatMap((raw) => {
		const pattern = raw.replace(/\/+$/, "");
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
