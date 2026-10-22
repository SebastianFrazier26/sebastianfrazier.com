import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadProjects } from "../scripts/lib/projects.ts";
import {
	escapeHtml,
	ResumeSchema,
	renderResume,
	resumeProjects,
} from "../scripts/lib/resume.ts";

async function committedResume() {
	return ResumeSchema.parse(
		JSON.parse(
			await readFile(
				new URL("../content/resume.json", import.meta.url),
				"utf8",
			),
		),
	);
}

describe("resume page", async () => {
	const projects = resumeProjects(await loadProjects());
	const html = renderResume(await committedResume(), projects);

	it("ships no JavaScript at all", () => {
		expect(html).not.toMatch(/<script/i);
		expect(html).not.toMatch(/\son[a-z]+\s*=/i);
		expect(html).not.toMatch(/javascript:/i);
	});

	it("lists only public, enabled projects", () => {
		expect(projects.map((p) => p.id)).not.toContain("famgo");
		expect(html).not.toContain("famgo");
		expect(html).toContain("SaViMAE");
		expect(html).toContain("https://github.com/SebastianFrazier26/cabn");
	});

	it("marks every TODO placeholder visibly", () => {
		const todos = html.match(/TODO\(owner\)/g) ?? [];
		const marked = html.match(/<mark class="todo">TODO\(owner\)/g) ?? [];
		expect(todos.length).toBeGreaterThan(0);
		expect(marked.length).toBe(todos.length);
	});

	it("escapes content", () => {
		expect(escapeHtml(`<img src=x onerror="a">&'`)).toBe(
			"&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;",
		);
	});

	it("rejects non-https links in the data file", async () => {
		const resume = await committedResume();
		expect(() =>
			ResumeSchema.parse({
				...resume,
				links: [{ label: "x", url: "javascript:alert(1)" }],
			}),
		).toThrow();
	});
});
