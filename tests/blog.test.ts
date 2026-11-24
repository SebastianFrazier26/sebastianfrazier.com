import { readdirSync, readFileSync, statSync } from "node:fs";
import { parseBlogRoute } from "@cabn/blog";
import { findUnscopedSelectors } from "@cabn/blog/build";
import { describe, expect, it } from "vitest";
import { blog } from "../src/blog/posts.ts";
import { parseRoute } from "../src/route.ts";

const blogDir = new URL("../src/blog/", import.meta.url);

describe("the post list", () => {
	it("is mounted at /blog on the production origin", () => {
		expect(blog.basePath).toBe("/blog");
		expect(blog.siteUrl).toBe("https://sebastianfrazier.com");
	});

	it("lists the fan-sentiment post as a bare-layout page", () => {
		const post = blog.find("fan-sentiment");
		expect(post?.draft).toBe(false);
		expect(post?.layout).toBe("bare");
		expect(blog.posts.map((p) => p.slug)).toContain("fan-sentiment");
	});

	// scripts/build-blog.ts imports posts.ts in Node, where a component or a
	// stylesheet cannot load.
	it("has only lazy imports, so the build script can load it in Node", () => {
		const source = readFileSync(new URL("posts.ts", blogDir), "utf8");
		const eager = [...source.matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gm)].map(
			(match) => match[1],
		);
		expect(eager).toEqual(["@cabn/blog"]);
	});

	it("keeps every post's stylesheet inside that post's root class", () => {
		for (const entry of readdirSync(blogDir)) {
			if (!statSync(new URL(entry, blogDir)).isDirectory()) continue;
			const dir = new URL(`${entry}/`, blogDir);
			for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
				const report = findUnscopedSelectors(
					readFileSync(new URL(file, dir), "utf8"),
					`.post-${entry}`,
				);
				expect(report.selectors, `${entry}/${file}`).toEqual([]);
			}
		}
	});
});

describe("parseRoute", () => {
	it("reads the map, the worlds and a deep link", () => {
		expect(parseRoute("/", "")).toEqual({ page: "map" });
		expect(parseRoute("/play", "")).toEqual({ page: "play", world: null });
		expect(parseRoute("/play/", "?world=cabn")).toEqual({
			page: "play",
			world: "cabn",
		});
	});

	it("hands /blog paths to the blog", () => {
		expect(parseRoute("/blog", "")).toEqual({
			page: "blog",
			route: { kind: "index" },
		});
		expect(parseRoute("/blog/fan-sentiment/", "")).toEqual({
			page: "blog",
			route: { kind: "post", slug: "fan-sentiment" },
		});
		expect(parseRoute("/blog/nope/", "")).toEqual({
			page: "blog",
			route: parseBlogRoute("/blog/nope/"),
		});
	});

	it("treats anything else as the map, as before", () => {
		expect(parseRoute("/blogs", "")).toEqual({ page: "map" });
		expect(parseRoute("/resume", "")).toEqual({ page: "map" });
	});
});
