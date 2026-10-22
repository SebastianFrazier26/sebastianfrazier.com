import { mkdir } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import * as tar from "tar";
import type { Project } from "./projects.ts";

const API = "https://api.github.com";
const SHA_RE = /^[0-9a-f]{40}$/;

export function githubToken(): string | undefined {
	return process.env.GITHUB_TOKEN?.trim() || undefined;
}

function headers(accept: string, token: string | undefined): HeadersInit {
	return {
		accept,
		"x-github-api-version": "2022-11-28",
		"user-agent": "sebastianfrazier.com-build",
		...(token ? { authorization: `Bearer ${token}` } : {}),
	};
}

function requireTokenFor(project: Project, token: string | undefined): void {
	if (project.visibility === "private" && !token) {
		throw new Error(
			`[${project.id}] is private: set GITHUB_TOKEN to a token that can read ${project.repo}`,
		);
	}
}

/** The commit `ref` points at right now; the tarball is then fetched by this exact SHA so the manifest and the content agree. */
export async function resolveSha(
	project: Project,
	token = githubToken(),
): Promise<string> {
	requireTokenFor(project, token);
	const res = await fetch(
		`${API}/repos/${project.repo}/commits/${encodeURIComponent(project.ref)}`,
		{ headers: headers("application/vnd.github.sha", token) },
	);
	if (!res.ok) {
		throw new Error(
			`[${project.id}] resolving ${project.repo}@${project.ref}: HTTP ${res.status}`,
		);
	}
	const sha = (await res.text()).trim();
	if (!SHA_RE.test(sha)) {
		throw new Error(`[${project.id}] unexpected SHA response`);
	}
	return sha;
}

export interface ExtractResult {
	files: number;
	excluded: string[];
	skippedLinks: string[];
}

/**
 * Streams the tarball of exactly `sha` into `destDir`. A tarball, never a
 * clone: no .git, so no history, author emails or deleted files can reach
 * the world. Excluded paths are never written to disk, and only regular
 * files and directories are extracted — a symlink in the repo could
 * otherwise point the converter outside the extract.
 */
export async function downloadAndExtract(
	project: Project,
	sha: string,
	destDir: string,
	isExcluded: (path: string) => boolean,
	token = githubToken(),
): Promise<ExtractResult> {
	requireTokenFor(project, token);
	if (!SHA_RE.test(sha)) throw new Error(`[${project.id}] bad SHA ${sha}`);
	const res = await fetch(`${API}/repos/${project.repo}/tarball/${sha}`, {
		headers: headers("application/vnd.github+json", token),
		redirect: "follow",
	});
	if (!res.ok || !res.body) {
		throw new Error(
			`[${project.id}] downloading ${project.repo}@${sha}: HTTP ${res.status}`,
		);
	}
	await mkdir(destDir, { recursive: true });
	const result: ExtractResult = { files: 0, excluded: [], skippedLinks: [] };
	await pipeline(
		Readable.fromWeb(res.body as WebReadableStream<Uint8Array>),
		tar.x({
			cwd: destDir,
			strip: 1,
			filter: (path, entry) => {
				const rel = stripTopDir(path);
				if (rel === "") return true;
				const type = "type" in entry ? entry.type : "File";
				if (type !== "File" && type !== "Directory") {
					result.skippedLinks.push(rel);
					return false;
				}
				if (isExcluded(rel)) {
					if (type === "File") result.excluded.push(rel);
					return false;
				}
				if (type === "File") result.files++;
				return true;
			},
		}),
	);
	return result;
}

/** tar's filter sees the archive path before `strip` applies: drop GitHub's `<owner>-<repo>-<sha>/` prefix. */
export function stripTopDir(path: string): string {
	const slash = path.indexOf("/");
	return slash === -1 ? "" : path.slice(slash + 1).replace(/\/+$/, "");
}
