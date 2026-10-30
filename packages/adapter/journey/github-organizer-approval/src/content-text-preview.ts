/** Keeps the editable text separate from trusted metadata and approval controls. */
export class ContentTextPreview {
	private readonly start = "<!-- meetup-content:text -->";
	private readonly end = "<!-- /meetup-content:text -->";
	render(text: string): string {
		const fence = "`".repeat(
			Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)),
		);
		return `${this.start}\n${fence}\n${text}\n${fence}\n${this.end}`;
	}
	read(body: string): { text: string; start: number; end: number } | undefined {
		const start = body.indexOf(this.start);
		const end = body.indexOf(this.end);
		if (
			start < 0 ||
			end < start ||
			body.indexOf(this.start, start + 1) !== -1 ||
			body.indexOf(this.end, end + 1) !== -1
		)
			return undefined;
		const block = body.slice(start + this.start.length, end).trim();
		const match = /^(`{3,})\n([\s\S]*)\n\1$/.exec(block);
		if (
			!match ||
			new RegExp(`^ {0,3}\u0060{${match[1].length},}[ \\t]*$`, "m").test(
				match[2],
			)
		)
			return undefined;
		return { text: match[2], start, end: end + this.end.length };
	}
	replace(body: string, text: string): string | undefined {
		const current = this.read(body);
		return current
			? body.slice(0, current.start) +
					this.render(text) +
					body.slice(current.end)
			: undefined;
	}
}
