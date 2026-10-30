/** Keeps the editable text separate from trusted metadata and approval controls. */
export class ContentTextPreview {
	private readonly start = "<!-- meetup-content:text -->";
	private readonly end = "<!-- /meetup-content:text -->";
	render(text: string): string {
		const escaped = text
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("[", "&#91;")
			.replaceAll("]", "&#93;")
			.replaceAll("@", "<span>@</span>")
			.replaceAll("\n", "  \n");
		return `${this.start}\n\n${escaped}\n\n${this.end}`;
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
		const text = body
			.slice(start + this.start.length, end)
			.trim()
			.replace(/ {2}\n/g, "\n")
			.replaceAll("<span>@</span>", "@")
			.replaceAll("&#91;", "[")
			.replaceAll("&#93;", "]")
			.replaceAll("&gt;", ">")
			.replaceAll("&lt;", "<")
			.replaceAll("&amp;", "&");
		return { text, start, end: end + this.end.length };
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
