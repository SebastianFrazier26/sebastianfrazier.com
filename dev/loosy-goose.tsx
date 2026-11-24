// Dev-only page for the loosy-goose post: `pnpm dev`, then open
// /dev/loosy-goose.html. It is not a build input, so it never ships; the
// post reaches the site through the blog's post list.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LoosyGoosePost from "../src/blog/loosy-goose/LoosyGoosePost.tsx";

const container = document.getElementById("root");
if (!container) throw new Error("#root element missing");
createRoot(container).render(
	<StrictMode>
		<LoosyGoosePost />
	</StrictMode>,
);
