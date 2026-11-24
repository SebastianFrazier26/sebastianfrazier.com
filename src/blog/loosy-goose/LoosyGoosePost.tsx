import { Final } from "./sections/Final.tsx";
import { Home } from "./sections/Home.tsx";
import { Opener } from "./sections/Opener.tsx";
import { Paddle } from "./sections/Paddle.tsx";
import { Rally } from "./sections/Rally.tsx";
import { Serve } from "./sections/Serve.tsx";
import { Shots } from "./sections/Shots.tsx";
import "./theme.css";

/**
 * The post: its sections in story order under one root class. This is the
 * folder's default export, the shape the blog's post list loads lazily.
 */
export default function LoosyGoosePost(): React.ReactElement {
	return (
		<article className="post-loosy-goose">
			<Opener />
			<Serve />
			<Paddle />
			<Shots />
			<Home />
			<Rally />
			<Final />
		</article>
	);
}
