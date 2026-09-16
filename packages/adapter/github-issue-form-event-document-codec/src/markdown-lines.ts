import type { Checkbox } from "./github-issue-form-event-document-codec-contracts.js";

export class MarkdownLines {
	static findLineEnd(value: string, start: number): number {
		let cursor = start;
		while (
			cursor < value.length &&
			value[cursor] !== "\n" &&
			value[cursor] !== "\r"
		) {
			cursor += 1;
		}
		return cursor;
	}

	static findNextLineStart(value: string, lineEnd: number): number {
		if (lineEnd >= value.length) {
			return value.length;
		}
		if (value[lineEnd] === "\r" && value[lineEnd + 1] === "\n") {
			return lineEnd + 2;
		}
		return lineEnd + 1;
	}

	static trimLeadingWhitespace(value: string): string {
		let start = 0;
		while (
			start < value.length &&
			MarkdownLines.isWhitespaceCharacter(value[start])
		) {
			start += 1;
		}
		return value.slice(start);
	}

	static trimTrailingWhitespace(value: string): string {
		let end = value.length;
		while (end > 0 && MarkdownLines.isWhitespaceCharacter(value[end - 1])) {
			end -= 1;
		}
		return value.slice(0, end);
	}

	static isHorizontalWhitespaceCharacter(value: string): boolean {
		return value === " " || value === "\t";
	}

	static isWhitespaceCharacter(value: string): boolean {
		return (
			value === " " ||
			value === "\t" ||
			value === "\n" ||
			value === "\r" ||
			value === "\f" ||
			value === "\v"
		);
	}

	static parseHeadingLine(line: string): string | undefined {
		if (!line.startsWith("### ")) {
			return undefined;
		}

		const rawHeading = line.slice(4);
		if (rawHeading.length === 0) {
			return undefined;
		}

		let end = rawHeading.length;
		while (
			end > 1 &&
			MarkdownLines.isHorizontalWhitespaceCharacter(rawHeading[end - 1])
		) {
			end -= 1;
		}
		return rawHeading.slice(0, end).trim();
	}

	static parseCheckboxLine(line: string): Checkbox | undefined {
		let cursor = 0;
		cursor = MarkdownLines.skipHorizontalWhitespace(line, cursor);
		if (line[cursor] !== "-") {
			return undefined;
		}

		cursor += 1;
		if (!MarkdownLines.isHorizontalWhitespaceCharacter(line[cursor] ?? "")) {
			return undefined;
		}
		cursor = MarkdownLines.skipHorizontalWhitespace(line, cursor);
		if (line[cursor] !== "[") {
			return undefined;
		}

		const checkedMarker = line[cursor + 1];
		if (
			(checkedMarker !== " " &&
				checkedMarker !== "x" &&
				checkedMarker !== "X") ||
			line[cursor + 2] !== "]"
		) {
			return undefined;
		}

		cursor += 3;
		if (!MarkdownLines.isHorizontalWhitespaceCharacter(line[cursor] ?? "")) {
			return undefined;
		}
		cursor = MarkdownLines.skipHorizontalWhitespace(line, cursor);

		const label = line.slice(cursor).trim();
		if (label === "") {
			return undefined;
		}

		return {
			checked: checkedMarker.toLowerCase() === "x",
			label,
		};
	}

	private static skipHorizontalWhitespace(
		line: string,
		cursor: number,
	): number {
		while (
			cursor < line.length &&
			MarkdownLines.isHorizontalWhitespaceCharacter(line[cursor])
		) {
			cursor += 1;
		}
		return cursor;
	}
}
