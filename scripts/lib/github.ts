import { mkdir } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import * as tar from "tar";
import type { Project } from "./projects.ts";

const API = "https://api.github.com";
const SHA_RE = /^[0-9a-f]{40}$/;

// Caps for one project's tarball. The largest today (cabn) is ~1,250
// entries after excludes and well under 100 MB compressed; these leave room
// to grow while bounding what a runaway upstream can cost a build.
export const LIMITS = {
	resolveTimeoutMs: 30_000,
	downloadTimeoutMs: 10 * 60_000,
	maxCompressedBytes: 500 * 1024 * 1024,
	maxExtractedBytes: 300 * 1024 * 1024,
	maxEntries: 20_000,
};

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
			`[${project.id}] is private: set GITHUB_TOKEN to a token that can read it`,
		);
	}
}

/** The commit branch `ref` points at right now (the branches endpoint refuses tags); the tarball is then fetched by this exact SHA so the manifest and the content agree. */
export async function resolveSha(
	project: Project,
	token = githubToken(),
): Promise<string> {
	requireTokenFor(project, token);
	const res = await fetch(
		`${API}/repos/${project.repo}/branches/${encodeURIComponent(project.ref)}`,
		{
			headers: headers("application/vnd.github+json", token),
			signal: AbortSignal.timeout(LIMITS.resolveTimeoutMs),
		},
	);
	if (!res.ok) {
		throw new Error(
			`[${project.id}] resolving branch ${project.ref}: HTTP ${res.status}`,
		);
	}
	const sha = ((await res.json()) as { commit?: { sha?: unknown } }).commit
		?.sha;
	if (typeof sha !== "string" || !SHA_RE.test(sha)) {
		throw new Error(`[${project.id}] unexpected branch response`);
	}
	return sha;
}

/** Errors once more than `max` bytes have passed through. */
export function byteCap(max: number, label: string): Transform {
	let seen = 0;
	return new Transform({
		transform(chunk: Buffer, _enc, done) {
			seen += chunk.length;
			if (seen > max) done(new Error(`${label}: over ${max} bytes`));
			else done(null, chunk);
		},
	});
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
		signal: AbortSignal.timeout(LIMITS.downloadTimeoutMs),
	});
	if (!res.ok || !res.body) {
		throw new Error(
			`[${project.id}] downloading ${sha.slice(0, 7)}: HTTP ${res.status}`,
		);
	}
	await mkdir(destDir, { recursive: true });
	const result: ExtractResult = { files: 0, excluded: [], skippedLinks: [] };
	let entries = 0;
	let extractedBytes = 0;
	let overLimit: string | null = null;
	await pipeline(
		Readable.fromWeb(res.body as WebReadableStream<Uint8Array>),
		byteCap(LIMITS.maxCompressedBytes, `[${project.id}] tarball`),
		tar.x({
			cwd: destDir,
			strip: 1,
			filter: (path, entry) => {
				// Past a cap, nothing more is written; the error is raised once
				// the stream has drained.
				if (overLimit) return false;
				if (++entries > LIMITS.maxEntries) {
					overLimit = `more than ${LIMITS.maxEntries} entries`;
					return false;
				}
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
				if (type === "File") {
					extractedBytes += "size" in entry ? (entry.size ?? 0) : 0;
					if (extractedBytes > LIMITS.maxExtractedBytes) {
						overLimit = `more than ${LIMITS.maxExtractedBytes} extracted bytes`;
						return false;
					}
					result.files++;
				}
				return true;
			},
		}),
	);
	if (overLimit) throw new Error(`[${project.id}] tarball has ${overLimit}`);
	return result;
}

/** tar's filter sees the archive path before `strip` applies: drop GitHub's `<owner>-<repo>-<sha>/` prefix. */
export function stripTopDir(path: string): string {
	const slash = path.indexOf("/");
	return slash === -1 ? "" : path.slice(slash + 1).replace(/\/+$/, "");
}
