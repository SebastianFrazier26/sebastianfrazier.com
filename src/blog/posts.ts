import { createBlog, definePost } from "@cabn/blog";

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
			// The post paints its own full-width field, so it takes the whole page.
			layout: "bare",
			load: () => import("./fan-sentiment/FanSentimentPost.tsx"),
		}),
		definePost({
			slug: "loosy-goose",
			title: "Loosy-Goose: honking out the context",
			date: "2026-11-23",
			summary:
				"Compressing AI agent sessions like JPEG compresses photos: where a frontier summary still wins, and where the goose does.",
			layout: "bare",
			load: () => import("./loosy-goose/LoosyGoosePost.tsx"),
		}),
	],
});
