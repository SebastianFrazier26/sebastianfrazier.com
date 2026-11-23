import { type BlogRoute, parseBlogRoute } from "@cabn/blog";

export type Route =
	| { page: "map" }
	/** `world` is the raw `?world=` value; validated against the shelf once it has loaded. */
	| { page: "play"; world: string | null }
	| { page: "blog"; route: BlogRoute };

export function parseRoute(pathname: string, search: string): Route {
	const blog = parseBlogRoute(pathname);
	if (blog) return { page: "blog", route: blog };
	if (pathname.replace(/\/$/, "") === "/play") {
		return { page: "play", world: new URLSearchParams(search).get("world") };
	}
	return { page: "map" };
}
