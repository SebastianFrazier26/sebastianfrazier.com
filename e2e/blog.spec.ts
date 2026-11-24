import { expect, test } from "@playwright/test";
import { blog } from "../src/blog/posts.ts";

// One cheap pass over what only a real browser can show: the blog works under
// the site's actual CSP, and its pages stay free of the game engine's chunks.
test("map to blog to post, with no CSP violations and no engine chunk", async ({
	page,
}) => {
	const problems: string[] = [];
	const scripts: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") problems.push(`console: ${message.text()}`);
	});
	page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
	page.on("requestfailed", (request) =>
		problems.push(`request failed: ${request.url()}`),
	);
	page.on("request", (request) => {
		if (request.resourceType() === "script") {
			scripts.push(new URL(request.url()).pathname);
		}
	});
	// CSP violations are also logged as console errors; this catches any that
	// a browser reports only through the event.
	await page.addInitScript(() => {
		document.addEventListener("securitypolicyviolation", (event) => {
			console.error(
				`CSP violation: ${event.violatedDirective} ${event.blockedURI}`,
			);
		});
	});

	await page.goto("/");
	const cabin = page.locator(".map-marker", { hasText: "Blog" });
	await expect(cabin).toHaveAttribute("href", "/blog/");
	expect(scripts.filter((path) => /BlogPage/.test(path))).toEqual([]);

	await cabin.click();
	await expect(page).toHaveURL(/\/blog\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(blog.title);
	for (const post of blog.posts) {
		await expect(page.getByRole("link", { name: post.title })).toBeVisible();
	}
	for (const draft of blog.drafts) {
		await expect(page.getByRole("link", { name: draft.title })).toHaveCount(0);
	}

	// Drafts have pages too, so there is always a post to open, listed or not.
	const post = blog.posts[0] ?? blog.drafts[0];
	if (!post) throw new Error("the blog has no posts at all to open");
	const response = await page.goto(`/blog/${post.slug}/`);
	const html = (await response?.text()) ?? "";
	expect(html).toContain(`<title>${post.title} · ${blog.title}</title>`);
	expect(html).toContain('property="og:title"');
	await expect(page).toHaveTitle(`${post.title} · ${blog.title}`);
	// A bare post brings its own markup, so only the standard frame is asserted.
	if (post.layout === "standard") {
		await expect(page.locator(".cabn-blog-post h1")).toHaveText(post.title);
		await expect(page.locator(".cabn-blog-body")).not.toBeEmpty();
	}
	await page.waitForLoadState("networkidle");

	await page.goto("/blog/no-such-post/");
	await expect(page.locator(".cabn-blog-missing")).toBeVisible();

	// The engine is Phaser plus CodeMirror, about 2.4 MB; pdf.js rides with it.
	expect(scripts.filter((path) => /CabnWorld|pdf/i.test(path))).toEqual([]);
	expect(problems).toEqual([]);
});
