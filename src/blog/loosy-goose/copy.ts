// DRAFT COPY — for the owner's edit. Every sentence a reader sees in the post
// lives here, so the wording can change without touching a scene. Numbers are
// never typed into these strings: the sections fill them in from data.ts.

export const COPY = {
	ui: {
		more: "Read more",
		less: "Show less",
		source: "Source",
	},
	opener: {
		kicker: "Context compression · a match report",
		title: "Loosy-Goose",
		lede: "Long AI coding sessions run out of room. I tried squeezing them the way JPEG squeezes a photo: keep the pieces that carry the most meaning, honk the rest off the court. A big model's summary still wins the match. The goose wins somewhere else.",
		cue: "Scroll to serve ↓",
	},
	serve: {
		kicker: "Point one · the serve",
		title: "Every token is a ball in play",
		body: "An agent session is mostly tool output: file reads, edits, test logs. Loosy-Goose splits it into pieces, and first throws out anything that was later replaced, like a file read that a newer read of the same file makes stale. That part loses nothing. Then it embeds every piece, finds the directions that carry the session's meaning, and keeps the pieces that point along them, until the budget is full. Nothing is rewritten, so nothing can be made up.",
		legendKept: "kept, word for word",
		legendStale: "stale, removed losslessly",
		legendDropped: "dropped to fit the budget",
		honkStale: "stale!",
		honkDrop: "HONK",
		stats: {
			before: "Earlier tokens",
			after: "Kept at medium",
			lossless: "Lossless share",
			speed: "Seconds per 100k",
		},
		note: "One square is about the same number of tokens. Kept and dropped follow the set D average; the stale share is the corpus average.",
	},
	paddle: {
		kicker: "Point two · pick a paddle",
		title: "The budget is the paddle",
		body: "You choose how much of the session to keep: half, a third or a quarter. A smaller paddle is cheaper and misses more. The other side of the net is a frontier-model summary, the way built-in compaction works, given exactly the same budget. Each point is a short factual question about the part that was compressed.",
		left: "Loosy-Goose",
		right: "Sonnet summary",
		paddleLabel: "keep",
		levels: { light: "light", medium: "medium", heavy: "heavy" },
		gap: "Summary ahead by",
	},
	shots: {
		kicker: "Point three · trick shots",
		title: "Every trick shot hit the net",
		body: "I spent weeks trying to close that gap without a big model. Rewriting sentences into compact slots, deleting predictable words, keeping only the lines of code that mattered. Each one went into the net or barely cleared it. The centre line is no change at all.",
		worse: "worse",
		better: "better",
		names: {
			slot: "Slot rows (rewrite prose)",
			slm: "Small-model rewrite",
			line: "Line-keep for code dumps",
			gentle: "Gentle rewrite",
			decay: "Decaying memory",
			hybrid: "Summary + goose fill",
		},
		vs: {
			slot: "vs plain goose",
			slm: "vs plain goose",
			line: "vs plain goose",
			gentle: "vs plain goose",
			decay: "vs plain freeze",
			hybrid: "vs summary alone",
		},
		filled: "filled: significant",
		hollow: "hollow: not significant",
	},
	home: {
		kicker: "Point four · home court",
		title: "Take the big bird away",
		body: "Built-in compaction leans on a frontier model. Take that away, and ask a model small enough to run on a laptop to write the summary instead. Now the goose is far ahead. The small models also kept writing summaries far shorter than the budget they were given.",
		goose: "Loosy-Goose",
		used: "of budget used",
		onTarget: "on target",
		band: "pale band: the 95% interval across sessions",
	},
	rally: {
		kicker: "Point five · the long rally",
		title: "Keep the rally going",
		body: "So I tried running it all the time. Instead of compacting once the window fills, each chunk of the session is compressed once as it ages out of a recent window, and never touched again. Then I replayed real sessions with only open models anywhere: one answering, another writing and grading the questions. Continuous freeze tracked full context, and full context overflowed the model's window on some checkpoints. Letting the small model summarise itself fell away.",
		axis: "how far into the session",
		fullNote:
			"Full context is averaged only over the sessions that still fit the model's window at each checkpoint, out of",
		names: {
			full: "Full context",
			freeze: "Goose, continuous",
			tloosy: "Goose, once full",
			qthresh: "Model summarises itself",
		},
		stats: {
			vsFull: "Continuous vs full",
			vsSelf: "Continuous vs self-summary",
			overflow: "Full overflowed",
		},
	},
	final: {
		kicker: "Final score",
		title: "Not a champion, a specialist",
		body: "If a frontier model can write the summary, let it. Loosy-Goose earns its place where that is not allowed or not affordable: offline machines, private sessions, local models, and anywhere you need to show exactly what a model was given.",
		boards: {
			frontier: "With a frontier model",
			local: "Open models only",
		},
		uses: [
			"Compaction that has to stay on your machine, with no API call.",
			"Private sessions, where no third model should see the transcript.",
			"Auditable context: every kept line is the original, word for word.",
			"Long sessions on local models, through the continuous proxy.",
		],
		limits: [
			"Ten to twenty-five transcripts per test set, all public agent sessions.",
			"Short factual questions reward keeping facts, not keeping a plan.",
			"One grading model per run, and local summaries that undershot their budget are a lower bound.",
		],
		limitsTitle: "Read the small print",
		links: {
			repo: "The code and every result table",
			demo: "Try it in the browser",
		},
	},
} as const;
