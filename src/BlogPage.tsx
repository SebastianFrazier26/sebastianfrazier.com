import { Blog, type BlogRoute } from "@cabn/blog";
import "@cabn/blog/styles.css";
import { blog } from "./blog/posts.ts";

export default function BlogPage({
	route,
	onNavigate,
}: {
	route: BlogRoute;
	onNavigate: (path: string) => void;
}): React.ReactElement {
	return (
		<Blog
			blog={blog}
			route={route}
			onNavigate={onNavigate}
			homeHref="/"
			homeLabel="Map"
		/>
	);
}
