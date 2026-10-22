#!/usr/bin/env node
// Writes public/resume/index.html from content/resume.json and the public,
// enabled entries of projects.json.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadProjects } from "./lib/projects.ts";
import { ResumeSchema, renderResume, resumeProjects } from "./lib/resume.ts";

const resume = ResumeSchema.parse(
	JSON.parse(
		await readFile(new URL("../content/resume.json", import.meta.url), "utf8"),
	),
);
const projects = resumeProjects(await loadProjects());
const outDir = new URL("../public/resume/", import.meta.url);
await mkdir(outDir, { recursive: true });
await writeFile(new URL("index.html", outDir), renderResume(resume, projects));
console.log(`wrote public/resume/index.html (${projects.length} projects)`);
