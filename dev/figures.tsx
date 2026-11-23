// Dev-only page: the two drawings of the players side by side, so the owner
// can pick FIGURE_STYLE in kit/Figures.tsx. Not a build input.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
	Ball,
	Batter,
	Fielder,
	type FigureStyle,
} from "../src/blog/fan-sentiment/kit/Figures.tsx";
import "../src/blog/fan-sentiment/theme.css";

function Pair({ variant }: { variant: FigureStyle }): React.ReactElement {
	return (
		<div className="fk-wrap">
			<p className="fk-inning">FIGURE_STYLE = "{variant}"</p>
			<svg
				width={620}
				height={300}
				viewBox="0 0 310 150"
				role="img"
				aria-label={`${variant} batter and fielder`}
			>
				<ellipse className="fk-dirt" cx={56} cy={130} rx={46} ry={9} />
				<line className="fk-ground" x1={6} x2={304} y1={130} y2={130} />
				<Batter x={50} y={130} variant={variant} />
				<Fielder x={250} y={130} variant={variant} />
				<Ball x={233} y={38} />
			</svg>
		</div>
	);
}

const container = document.getElementById("root");
if (!container) throw new Error("#root element missing");
createRoot(container).render(
	<StrictMode>
		<div className="post-fan-sentiment">
			<div className="fk-section">
				<Pair variant="simple" />
				<Pair variant="full" />
			</div>
		</div>
	</StrictMode>,
);
