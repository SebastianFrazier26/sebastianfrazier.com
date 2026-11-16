#!/usr/bin/env node
// The engine loads its sprites from /assets/{originals,placeholders}/ (see
// @cabn/engine's assetPaths). @cabn/cli ships exactly that set in
// dist/assets for `cabn serve`, so the site copies it from there instead of
// vendoring art into this repo. The landing page's pixel font is the same
// DotGothic16 the engine inlines as a base64 data URI (not an exported
// asset), so it is decoded from the engine's module text into a real file for
// the page's @font-face; the OFL license is copied alongside, as it requires.
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const cliEntry = fileURLToPath(import.meta.resolve("@cabn/cli"));
const source = new URL("./assets/", `file://${cliEntry}`);
const dest = new URL("../public/assets/", import.meta.url);

for (const sub of ["originals", "placeholders"]) {
	await stat(new URL(sub, source)).catch(() => {
		throw new Error(
			`@cabn/cli has no dist/assets/${sub} — is the linked engine built?`,
		);
	});
}
await rm(dest, { recursive: true, force: true });
await cp(source, dest, { recursive: true });
console.log(`copied engine sprites from ${fileURLToPath(source)}`);

const engineEntry = import.meta.resolve("@cabn/engine");
const fontModule = await readFile(
	new URL("./react/fonts/dotGothic16.js", engineEntry),
	"utf8",
);
const base64 = /DOT_GOTHIC16_LATIN_WOFF2_BASE64 = "([A-Za-z0-9+/=]+)"/.exec(
	fontModule,
)?.[1];
if (!base64) throw new Error("@cabn/engine no longer inlines DotGothic16");
const fontDir = new URL("fonts/", dest);
await mkdir(fontDir, { recursive: true });
await writeFile(
	new URL("DotGothic16-Latin.woff2", fontDir),
	Buffer.from(base64, "base64"),
);
await cp(
	new URL("../third-party-licenses/DotGothic16-OFL.txt", engineEntry),
	new URL("DotGothic16-OFL.txt", fontDir),
);
