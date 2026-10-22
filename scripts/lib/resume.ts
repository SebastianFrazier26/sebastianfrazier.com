import { z } from "zod";
import {
	enabledProjects,
	type Project,
	type ProjectsFile,
} from "./projects.ts";

const Text = z.string().min(1).max(1000);
const HttpsUrl = z.url({ protocol: /^https$/ });

export const ResumeSchema = z.strictObject({
	$comment: z.string().optional(),
	name: Text,
	headline: Text,
	summary: Text,
	links: z.array(z.strictObject({ label: Text, url: HttpsUrl })),
	contact: Text,
	experience: z.array(
		z.strictObject({
			title: Text,
			org: Text,
			dates: Text,
			points: z.array(Text),
		}),
	),
	education: z.array(z.strictObject({ title: Text, org: Text, dates: Text })),
	skills: z.array(Text),
});
export type Resume = z.infer<typeof ResumeSchema>;

/** What the resume lists: only projects that are both published and public. */
export function resumeProjects(file: ProjectsFile): Project[] {
	return enabledProjects(file).filter((p) => p.visibility === "public");
}

export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** A TODO placeholder renders marked, so an unfinished resume is obvious on the page rather than passing for real content. */
function text(value: string): string {
	const safe = escapeHtml(value);
	return value.startsWith("TODO") ? `<mark class="todo">${safe}</mark>` : safe;
}

function link(label: string, url: string): string {
	// Schema-checked https URLs only; never javascript: or data:.
	return `<a href="${escapeHtml(url)}" rel="noopener">${escapeHtml(label)}</a>`;
}

const STYLE = `
:root { color-scheme: light dark; --bg: #f7f5ef; --fg: #1f1d1a; --muted: #5d574e; --accent: #8c461f; --mark: #ffe9a8; }
@media (prefers-color-scheme: dark) { :root { --bg: #17140f; --fg: #ece6da; --muted: #b2a996; --accent: #e3a06b; --mark: #5b4a12; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.55 Georgia, "Times New Roman", serif; }
main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
h1 { margin: 0; font-size: 2rem; }
h2 { margin: 2.2rem 0 .6rem; font-size: 1.05rem; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
h3 { margin: 1rem 0 .1rem; font-size: 1.05rem; }
.meta { color: var(--muted); font-size: .95rem; }
a { color: var(--accent); }
ul { padding-left: 1.2rem; }
ul.plain { list-style: none; padding: 0; }
mark.todo { background: var(--mark); color: inherit; padding: 0 .2em; }
nav { font-family: "Courier New", monospace; font-size: .9rem; margin-bottom: 2rem; }
@media print { nav { display: none; } body { background: #fff; color: #000; } }
`;

/**
 * The whole page as one static string: no scripts, no event-handler
 * attributes, inline styles only (allowed by the site CSP's style-src).
 */
export function renderResume(resume: Resume, projects: Project[]): string {
	const projectItems = projects
		.map(
			(p) => `<li><h3>${escapeHtml(p.name)}</h3>
<p>${escapeHtml(p.description)}</p>
<p class="meta">${[
				link("Source", `https://github.com/${p.repo}`),
				...(p.hero?.status === "live" ? [link("Live site", p.hero.url)] : []),
			].join(" · ")}</p></li>`,
		)
		.join("\n");
	const experience = resume.experience
		.map(
			(e) => `<li><h3>${text(e.title)} — ${text(e.org)}</h3>
<p class="meta">${text(e.dates)}</p>
<ul>${e.points.map((pt) => `<li>${text(pt)}</li>`).join("")}</ul></li>`,
		)
		.join("\n");
	const education = resume.education
		.map(
			(e) =>
				`<li><h3>${text(e.title)} — ${text(e.org)}</h3><p class="meta">${text(e.dates)}</p></li>`,
		)
		.join("\n");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(resume.name)} — Résumé</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>${STYLE}</style>
</head>
<body>
<main>
<nav><a href="/">← back to the cabin</a></nav>
<header>
<h1>${escapeHtml(resume.name)}</h1>
<p class="meta">${text(resume.headline)}</p>
<p class="meta">${resume.links.map((l) => link(l.label, l.url)).join(" · ")} · ${text(resume.contact)}</p>
</header>
<section><h2>Summary</h2><p>${text(resume.summary)}</p></section>
<section><h2>Projects</h2><ul class="plain">
${projectItems}
</ul></section>
<section><h2>Experience</h2><ul class="plain">
${experience}
</ul></section>
<section><h2>Education</h2><ul class="plain">
${education}
</ul></section>
<section><h2>Skills</h2><ul>${resume.skills.map((s) => `<li>${text(s)}</li>`).join("")}</ul></section>
</main>
</body>
</html>
`;
}
