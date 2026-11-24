import { createBlog, definePost, markdownPost } from "@cabn/blog";

// scripts/build-blog.ts imports this file in Node to write each post's
// HTML page, the feed and the sitemap, so every `load` must stay a lazy
// import: a component or stylesheet imported at the top would break the build.
export const blog = createBlog({
	title: "Sebastian Frazier",
	description: "Write-ups on the projects behind the worlds.",
	siteUrl: "https://sebastianfrazier.com",
	author: "Sebastian Frazier",
	posts: [
		definePost({
			slug: "fan-sentiment",
			title: "Are the fans always right?",
			date: "2026-11-22",
			summary:
				"When a fanbase is upbeat about a player one week, does he play better the next?",
			// 2026-11-22: placeholder while the real post is built on
			// feat/blog-fan-sentiment. Drop `draft` and point `load` at its
			// component when it lands.
			draft: true,
			load: markdownPost(() => import("./fan-sentiment/placeholder.md?raw")),
		}),
	],
});
