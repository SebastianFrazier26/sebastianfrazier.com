import { Fragment, type ReactNode, useRef, useState } from "react";
import { COPY } from "../copy.ts";
import { resultsUrl } from "../data.ts";
import { useHeadScrub } from "./motion.ts";

/**
 * A white goose facing right, feet on (x, y). Its lower beak (`.lg-beak-low`)
 * opens around the hinge and its `.lg-honk` bubble shows when a scene honks;
 * at rest the beak is shut and the bubble hidden, which is the finished
 * picture every scene ends on.
 */
export function Goose({
	x,
	y,
	scale = 1,
	flip = false,
	honk,
	className = "",
}: {
	x: number;
	y: number;
	scale?: number;
	flip?: boolean;
	honk?: string;
	className?: string;
}): React.ReactElement {
	return (
		<g
			className={`lg-goose ${className}`}
			transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}
		>
			<line className="lg-goose-leg" x1={-5} y1={-11} x2={-6} y2={0} />
			<line className="lg-goose-leg" x1={3} y1={-11} x2={5} y2={0} />
			<path className="lg-goose-foot" d="M-11 0h8M1 0h8" />
			<path
				className="lg-goose-body"
				d="M-30 -28 L-37 -33 L-31 -20 Q-27 -8 -8 -8 Q10 -8 12 -20 Q12 -31 -2 -32 Q-18 -33 -30 -28 Z"
			/>
			<path
				className="lg-goose-wing"
				d="M-24 -24 Q-12 -14 2 -20 Q-8 -27 -24 -24 Z"
			/>
			<path className="lg-goose-neck" d="M5 -27 Q14 -40 11 -52" />
			<circle className="lg-goose-head" cx={13} cy={-55} r={7} />
			<circle className="lg-goose-eye" cx={15.5} cy={-57} r={1.5} />
			<path className="lg-goose-beak" d="M19 -57.5 L31 -54.5 L19.5 -52.5 Z" />
			<g className="lg-beak-low">
				<path className="lg-goose-beak" d="M19.5 -53 L28 -51.5 L19 -49.5 Z" />
			</g>
			{honk && (
				<g className="lg-honk" opacity={0}>
					<path
						className="lg-honk-arc"
						d="M35 -62 q5 7 0 14 M41 -66 q8 11 0 22"
					/>
					<text
						className="lg-honk-text"
						x={48}
						y={-60}
						// Undo the goose's mirror so a flipped goose's honk still reads left to right.
						transform={flip ? "scale(-1 1) translate(-96 0)" : undefined}
						textAnchor={flip ? "end" : "start"}
					>
						{honk}
					</text>
				</g>
			)}
		</g>
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
