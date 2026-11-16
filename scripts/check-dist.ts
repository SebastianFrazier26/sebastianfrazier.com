#!/usr/bin/env node
// Postbuild gate over dist/ (pnpm build runs it): the CSP meta tag is the
// one csp-policy.ts computes and precedes every script, the retired résumé
// is not shipped, and no world data was dropped from the copy.
import { readFile, stat } from "node:fs/promises";
import { loadEmbedOrigins, metaCsp } from "../csp-policy.ts";

const dist = new URL("../dist/", import.meta.url);
const errors: string[] = [];

const index = await readFile(new URL("index.html", dist), "utf8");
const expected = `<meta http-equiv="Content-Security-Policy" content="${metaCsp(
	loadEmbedOrigins(new URL("worlds/manifest.json", dist)),
)}" />`;
const cspAt = index.indexOf(expected);
const firstScript = index.search(/<script/i);
if (cspAt === -1) errors.push("dist/index.html: CSP meta missing or different");
else if (firstScript !== -1 && firstScript < cspAt)
	errors.push("dist/index.html: a script precedes the CSP meta");

await stat(new URL("resume", dist)).then(
	() => errors.push("dist/resume exists; the résumé is retired"),
	() => {},
);

for (const path of [
	"worlds/shelf.json",
	"worlds/manifest.json",
	"assets/originals",
]) {
	await stat(new URL(path, dist)).catch(() =>
		errors.push(`dist/${path} missing`),
	);
}

if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}
console.log("dist checks passed");
