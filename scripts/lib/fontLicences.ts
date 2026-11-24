// Self-hosted fonts sit next to their licence files in src/ (OFL-<Family>.txt,
// or one bare OFL.txt / LICENSE for the whole directory). Vite emits only the
// font, so the vite.config.ts plugin uses this to ship each licence at a fixed
// path, and scripts/check-dist.ts uses it to check every font in dist has one.
import { readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const FONT_FILE = /\.(?:woff2?|ttf|otf)$/i;
const LICENCE_FILE = /^(OFL|LICEN[CS]E)(?:[-_](.+?))?(?:\.(?:txt|md))?$/i;

/** Where a family's licence lands in dist/, beside the engine's DotGothic16 one. */
export const LICENCE_DIR = "assets/fonts";

/** "Bungee-Regular-Latin-D9adNChf.woff2" and "PressStart2P.ttf" alike. */
export function fontFamily(fileName: string): string {
	return basename(fileName).split(/[-.]/)[0] ?? "";
}

export function licencePaths(family: string): string[] {
	return [
		`${LICENCE_DIR}/${family}-OFL.txt`,
		`${LICENCE_DIR}/${family}-LICENSE.txt`,
	];
}

/**
 * The licence among `siblings` (file names in the font's directory) that
 * covers `fontFile`: one naming its family wins over a bare one, and two bare
 * ones are ambiguous rather than guessed between.
 */
export function pickLicence(
	fontFile: string,
	siblings: readonly string[],
): { file: string; kind: "OFL" | "LICENSE" } | null {
	const family = fontFamily(fontFile);
	const named: string[] = [];
	const bare: string[] = [];
	for (const name of siblings) {
		const match = LICENCE_FILE.exec(name);
		if (!match) continue;
		if (match[2] === undefined) bare.push(name);
		else if (match[2] === family) named.push(name);
	}
	const file =
		named.length === 1
			? named[0]
			: named.length === 0 && bare.length === 1
				? bare[0]
				: undefined;
	if (file === undefined) return null;
	const kind = /^OFL/i.test(file) ? "OFL" : "LICENSE";
	return { file, kind };
}

/** Source licence file and its dist path for a font file on disk, or null. */
export function licenceFor(
	fontPath: string,
): { source: string; dest: string } | null {
	const dir = dirname(fontPath);
	const picked = pickLicence(fontPath, readdirSync(dir));
	if (!picked) return null;
	return {
		source: join(dir, picked.file),
		dest: `${LICENCE_DIR}/${fontFamily(fontPath)}-${picked.kind}.txt`,
	};
}
