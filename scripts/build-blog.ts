#!/usr/bin/env node
// Runs after `vite build` (see package.json "build"): copies dist/index.html
// to dist/blog/ and dist/blog/<slug>/ with each page's title and
// link-preview tags, and writes dist/blog/feed.xml and sitemap.xml. The post
// bodies still render in the browser.
import { fileURLToPath } from "node:url";
import { writeBlogPages } from "@cabn/blog/build";
import { blog } from "../src/blog/posts.ts";

const written = writeBlogPages({
	blog,
	distDir: fileURLToPath(new URL("../dist", import.meta.url)),
});
console.log(`blog: wrote ${written.length} files`);
