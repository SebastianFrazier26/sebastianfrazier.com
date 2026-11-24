#!/usr/bin/env node
// Postbuild gate over dist/ (pnpm build runs it): the CSP meta tag is the
// one csp-policy.ts computes and precedes every script, on the shell and on
// every blog page copied from it; the retired résumé is not shipped; no
// world data was dropped from the copy; and every font family ships its
// licence.
import { readdir, readFile, stat } from "node:fs/promises";
import { postUrl } from "@cabn/blog/build";
import { loadEmbedOrigins, metaCsp } from "../csp-policy.ts";
import { blog } from "../src/blog/posts.ts";
import { FONT_FILE, fontFamily, licencePaths } from "./lib/fontLicences.ts";

const dist = new URL("../dist/", import.meta.url);
const errors: string[] = [];

const index = await readFile(new URL("index.html", dist), "utf8");
const expected = `<meta http-equiv="Content-Security-Policy" content="${metaCsp(
	loadEmbedOrigins(new URL("worlds/manifest.json", dist)),
)}" />`;
function checkCsp(path: string, html: string): void {
	const cspAt = html.indexOf(expected);
	const firstScript = html.search(/<script/i);
	if (cspAt === -1) errors.push(`dist/${path}: CSP meta missing or different`);
	else if (firstScript !== -1 && firstScript < cspAt)
		errors.push(`dist/${path}: a script precedes the CSP meta`);
}
checkCsp("index.html", index);

const blogBase = blog.basePath.slice(1);
for (const post of [...blog.posts, ...blog.drafts]) {
	const path = `${blogBase}/${post.slug}/index.html`;
	const html = await readFile(new URL(path, dist), "utf8").catch(() => null);
	if (html === null) {
		errors.push(`dist/${path} missing`);
		continue;
	}
	checkCsp(path, html);
	if (!html.includes(`<link rel="canonical" href="${postUrl(blog, post)}" />`))
		errors.push(`dist/${path}: canonical link missing`);
	// A draft's page exists so it can be previewed; it must never be indexed.
	if (post.draft !== html.includes('<meta name="robots" content="noindex" />'))
		errors.push(`dist/${path}: noindex does not match the post's draft flag`);
}

await stat(new URL("resume", dist)).then(
	() => errors.push("dist/resume exists; the résumé is retired"),
	() => {},
);

for (const path of [
	"worlds/shelf.json",
	"worlds/manifest.json",
	"assets/originals",
	`${blogBase}/index.html`,
	`${blogBase}/feed.xml`,
	`${blogBase}/sitemap.xml`,
]) {
	await stat(new URL(path, dist)).catch(() =>
		errors.push(`dist/${path} missing`),
	);
}

const fonts = (await readdir(new URL("assets", dist), { recursive: true }))
	.filter((path) => FONT_FILE.test(path))
	.sort();
for (const family of new Set(fonts.map(fontFamily))) {
	const found = await Promise.any(
		licencePaths(family).map((path) => stat(new URL(path, dist))),
	).then(
		() => true,
		() => false,
	);
	if (!found)
		errors.push(
			`dist ships ${family} fonts but no ${licencePaths(family).join(" or ")}`,
		);
}

if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}
console.log("dist checks passed");
