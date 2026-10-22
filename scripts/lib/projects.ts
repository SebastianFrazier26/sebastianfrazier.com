import { readFile } from "node:fs/promises";
import { z } from "zod";

const HttpsUrl = z.url({ protocol: /^https$/ });

const LinkSchema = z.strictObject({
	label: z.string().min(1).max(60),
	url: HttpsUrl,
});

// Globs are matched against repo-relative POSIX paths, so anything that could
// climb out of the extract (or is absolute) is a config error, not a no-op.
const ExcludeGlob = z
	.string()
	.min(1)
	.refine((g) => !g.startsWith("/") && !g.split("/").includes(".."), {
		message: "must be repo-relative, without '..'",
	});

export const HeroSchema = z.strictObject({
	url: HttpsUrl,
	/** "pending" until the project's GitHub Pages site is actually live; only live heroes become site portals. */
	status: z.enum(["live", "pending"]),
});

export const ProjectSchema = z
	.strictObject({
		/** Slug: becomes public/worlds/<id>/ and the cabn site-portal id. */
		id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
		name: z
			.string()
			.min(1)
			.max(200)
			.refine((n) => !/[/\\]/.test(n), "no path separators"),
		repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/),
		ref: z.string().regex(/^[A-Za-z0-9._/-]+$/),
		visibility: z.enum(["public", "private"]),
		enabled: z.boolean(),
		description: z.string().min(1).max(500),
		links: z.array(LinkSchema).max(8),
		excludes: z.array(ExcludeGlob),
		/** Literal false: shipping git history would publish commit emails and everything ever deleted. */
		history: z.literal(false),
		hero: HeroSchema.nullable(),
		order: z.number().int(),
	})
	.refine((p) => p.visibility === "public" || !p.enabled || p.hero === null, {
		message: "a private project cannot advertise a hero site",
		path: ["hero"],
	});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectsFileSchema = z
	.strictObject({
		$comment: z.string().optional(),
		shelfName: z.string().min(1).max(100),
		defaultExcludes: z.array(ExcludeGlob),
		projects: z.array(ProjectSchema).min(1),
	})
	.superRefine((file, ctx) => {
		const seen = new Set<string>();
		for (const [i, p] of file.projects.entries()) {
			if (seen.has(p.id)) {
				ctx.addIssue({
					code: "custom",
					message: `duplicate project id "${p.id}"`,
					path: ["projects", i, "id"],
				});
			}
			seen.add(p.id);
		}
	});
export type ProjectsFile = z.infer<typeof ProjectsFileSchema>;

export function parseProjects(json: unknown): ProjectsFile {
	const result = ProjectsFileSchema.safeParse(json);
	if (!result.success) {
		throw new Error(`Invalid projects.json:\n${z.prettifyError(result.error)}`);
	}
	return result.data;
}

export async function loadProjects(
	path = new URL("../../projects.json", import.meta.url),
): Promise<ProjectsFile> {
	return parseProjects(JSON.parse(await readFile(path, "utf8")));
}

export function enabledProjects(file: ProjectsFile): Project[] {
	return file.projects
		.filter((p) => p.enabled)
		.sort((a, b) => a.order - b.order);
}
