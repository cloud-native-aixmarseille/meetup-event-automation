/** Encodes reviewed visible text in LinkedIn's little format without mentions. */
export class LinkedInCommentary {
	encode(text: string): string {
		let result = "";
		let cursor = 0;
		for (const match of text.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
			const start = match.index + match[1].length;
			result += this.escape(text.slice(cursor, start));
			result += `{hashtag|\\#|${this.escape(match[2])}}`;
			cursor = match.index + match[0].length;
		}
		return result + this.escape(text.slice(cursor));
	}

	private escape(text: string): string {
		return text.replace(/[|{}@[\]()<>#\\*_~]/g, "\\$&");
	}
}
