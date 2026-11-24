// Dev-only page for the fan-sentiment post: `pnpm dev`, then open
// /dev/fan-sentiment.html. It is not a build input, so it never ships; the
// post reaches the site through the blog's post list.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FanSentimentPost from "../src/blog/fan-sentiment/FanSentimentPost.tsx";

const container = document.getElementById("root");
if (!container) throw new Error("#root element missing");
createRoot(container).render(
	<StrictMode>
		<FanSentimentPost />
	</StrictMode>,
);
