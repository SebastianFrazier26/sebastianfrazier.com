/** One matte stat chip: a small label over a scoreboard numeral. */
export function Stat({
	label,
	value,
	className = "",
}: {
	label: string;
	value: string;
	className?: string;
}): React.ReactElement {
	return (
		<p className={`fk-stat ${className}`}>
			<span className="fk-stat-label">{label}</span>
			<span className="fk-stat-value">{value}</span>
		</p>
	);
}

export function DataTable({
	summary,
	head,
	rows,
}: {
	summary: string;
	head: string[];
	rows: string[][];
}): React.ReactElement {
	return (
		<details className="fk-table">
			<summary>{summary}</summary>
			<div className="fk-table-scroll">
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
		</details>
	);
}
