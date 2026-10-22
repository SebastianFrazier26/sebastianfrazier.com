#!/usr/bin/env node
// Renders the Caddyfile template with the CSP header from csp-policy.ts and
// the built worlds' embed origins. Usage:
//   node scripts/render-caddyfile.ts <template> <out>
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { headerCsp, loadEmbedOrigins } from "../csp-policy.ts";

export const CSP_PLACEHOLDER = "__SF_CSP__";

export function renderCaddyfile(template: string, csp: string): string {
	const count = template.split(CSP_PLACEHOLDER).length - 1;
	if (count !== 1) {
		throw new Error(
			`Caddyfile template must contain ${CSP_PLACEHOLDER} exactly once, found ${count}`,
		);
	}
	// The value sits inside a double-quoted Caddyfile token.
	if (/["\n\\]/.test(csp)) {
		throw new Error("CSP contains a character that breaks the quoted token");
	}
	return template.replace(CSP_PLACEHOLDER, csp);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const [templatePath, outPath] = process.argv.slice(2);
	if (!templatePath || !outPath) {
		console.error("usage: render-caddyfile.ts <template> <out>");
		process.exit(2);
	}
	const origins = loadEmbedOrigins(
		new URL("../public/worlds/manifest.json", import.meta.url),
	);
	await writeFile(
		outPath,
		renderCaddyfile(await readFile(templatePath, "utf8"), headerCsp(origins)),
	);
}
