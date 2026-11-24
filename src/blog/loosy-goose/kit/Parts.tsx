import { Fragment, type ReactNode, useRef, useState } from "react";
import { COPY } from "../copy.ts";
import { resultsUrl } from "../data.ts";
import { driver, useHeadScrub } from "./motion.ts";
import {
	GOOSE_FRAMES,
	GOOSE_KEYS,
	GOOSE_OX,
	GOOSE_ROWS,
	type GooseFrame,
	gridPaths,
} from "./sprites.ts";

/**
 * A pixel goose facing right, feet on (x, y), `px` screen pixels per sprite
 * cell. Every frame is in the markup and only the visible one shows; at rest
 * it stands idle with its honk bubble hidden, the finished picture every
 * scene ends on. Scenes change frames only through `poseGoose`/`honker`.
 */
export function Goose({
	x,
	y,
	px = 3,
	flip = false,
	honk,
	className = "",
}: {
	x: number;
	y: number;
	px?: number;
	flip?: boolean;
	honk?: string;
	className?: string;
}): React.ReactElement {
	const ox = -GOOSE_OX * px;
	const oy = -GOOSE_ROWS * px;
	// Press Start 2P is drawn on an 8px grid; other sizes blur its pixels.
	const font = px >= 4 ? 16 : 8;
	return (
		<g
			className={`lg-goose lg-px ${className}`}
			transform={`translate(${Math.round(x)} ${Math.round(y)})${flip ? " scale(-1 1)" : ""}`}
		>
			{(Object.keys(GOOSE_FRAMES) as GooseFrame[]).map((frame) => {
				const paths = gridPaths(GOOSE_FRAMES[frame], px, ox, oy);
				return (
					<g
						key={frame}
						data-frame={frame}
						visibility={frame === "idle" ? "visible" : "hidden"}
					>
						{GOOSE_KEYS.map((k) =>
							paths[k] ? (
								<path key={k} className={`lg-px-${k}`} d={paths[k]} />
							) : null,
						)}
					</g>
				);
			})}
			{honk && (
				<g className="lg-honk" visibility="hidden">
					<rect
						className="lg-honk-bar"
						x={11 * px}
						y={-18 * px}
						width={px}
						height={3 * px}
					/>
					<rect
						className="lg-honk-bar"
						x={13 * px}
						y={-19 * px}
						width={px}
						height={5 * px}
					/>
					<text
						className="lg-honk-text"
						x={15 * px}
						y={-15 * px}
						fontSize={font}
						// Undo the goose's mirror so a flipped goose's honk still reads left to right.
						transform={
							flip ? `scale(-1 1) translate(${-30 * px} 0)` : undefined
						}
						textAnchor={flip ? "end" : "start"}
					>
						{honk}
					</text>
				</g>
			)}
		</g>
	);
}

/** Shows one frame of a Goose and, when honking, its bubble. */
export function poseGoose(goose: Element | null, frame: GooseFrame): void {
	if (!goose) return;
	for (const g of goose.querySelectorAll("[data-frame]")) {
		g.setAttribute(
			"visibility",
			g.getAttribute("data-frame") === frame ? "visible" : "hidden",
		);
	}
	goose
		.querySelector(".lg-honk")
		?.setAttribute("visibility", frame === "honk" ? "visible" : "hidden");
}

/**
 * A driver for one honk: tween its `t` from 0 to 1 and the goose honks for
 * the whole tween, standing idle again at both ends.
 */
export function honker(goose: Element | null): { t: number } {
	return driver((t) => poseGoose(goose, t > 0 && t < 1 ? "honk" : "idle"));
}

/** A driver for a walk: legs alternate `steps` times and the goose stops idle. */
export function walker(goose: Element | null, steps: number): { t: number } {
	return driver((t) =>
		poseGoose(
			goose,
			t > 0 && t < 1 && Math.floor(t * steps * 2) % 2 === 0 ? "step" : "idle",
		),
	);
}

/** Body copy that phones show as four lines and a toggle; the full text is always in the page. */
export function Clamp({
	children,
}: {
	children: ReactNode;
}): React.ReactElement {
	const [open, setOpen] = useState(false);
	return (
		<div className={`lg-clamp${open ? " is-open" : ""}`}>
			<p className="lg-copy">{children}</p>
			<button
				type="button"
				className="lg-more"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				{open ? COPY.ui.less : COPY.ui.more}
			</button>
		</div>
	);
}

/**
 * A section's opening: a hollow pong score drifting in behind, the kicker,
 * a title whose words rise out of their line, and the copy.
 */
export function SectionHead({
	id,
	score,
	kicker,
	title,
	children,
	level = 2,
}: {
	id: string;
	score: string;
	kicker: string;
	title: string;
	children?: ReactNode;
	level?: 1 | 2;
}): React.ReactElement {
	const root = useRef<HTMLDivElement>(null);
	useHeadScrub(root);
	const Title = level === 1 ? "h1" : "h2";
	return (
		<div className="lg-head" ref={root}>
			<span className="lg-score" aria-hidden="true">
				{score}
			</span>
			<p className="lg-kicker">{kicker}</p>
			<Title id={id} className="lg-title">
				{title.split(" ").map((word, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: a title's words never reorder.
					<Fragment key={i}>
						{i > 0 && " "}
						<span className="lg-word">
							<span>{word}</span>
						</span>
					</Fragment>
				))}
			</Title>
			{children && <div className="lg-head-copy">{children}</div>}
		</div>
	);
}

export interface Count {
	to: number;
	from?: number;
	digits?: number;
	prefix?: string;
	suffix?: string;
}

/** One cell of a scoreboard strip: a small label over a monospaced numeral. */
export function Stat({
	label,
	value,
	count,
	accent = false,
}: {
	label: string;
	value: string;
	count?: Count;
	accent?: boolean;
}): React.ReactElement {
	return (
		<p className={`lg-stat${accent ? " is-accent" : ""}`}>
			<span className="lg-stat-label">{label}</span>
			<span
				className="lg-stat-value"
				data-count={count?.to}
				data-from={count?.from}
				data-digits={count?.digits}
				data-prefix={count?.prefix}
				data-suffix={count?.suffix}
			>
				{value}
			</span>
		</p>
	);
}

export function Stats({
	children,
}: {
	children: ReactNode;
}): React.ReactElement {
	return <div className="lg-stats">{children}</div>;
}

/** The numbers behind a scene, folded away, with a link to the repo table they came from. */
export function DataTable({
	summary,
	head,
	rows,
	sources,
}: {
	summary: string;
	head: string[];
	rows: string[][];
	sources: string[];
}): React.ReactElement {
	return (
		<details className="lg-table">
			<summary>{summary}</summary>
			<div className="lg-table-scroll">
				<table>
					<thead>
						<tr>
							{head.map((h) => (
								<th key={h} scope="col">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.join("|")}>
								{r.map((cell, i) =>
									i === 0 ? (
										<th key={cell} scope="row">
											{cell}
										</th>
									) : (
										// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder.
										<td key={i}>{cell}</td>
									),
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="lg-source">
				{COPY.ui.source}:{" "}
				{sources.map((file, i) => (
					<Fragment key={file}>
						{i > 0 && ", "}
						<a href={resultsUrl(file)}>{file}</a>
					</Fragment>
				))}
			</p>
		</details>
	);
}
