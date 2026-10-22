#!/usr/bin/env node
// The engine loads its sprites from /assets/{originals,placeholders}/ (see
// @cabn/engine's assetPaths). @cabn/cli ships exactly that set in
// dist/assets for `cabn serve`, so the site copies it from there instead of
// vendoring art into this repo.
import { cp, rm, stat } from "node:fs/promises";
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
