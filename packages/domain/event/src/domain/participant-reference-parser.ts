import { STABLE_ID_PATTERN } from "./dto-contracts.js";
import type { ParticipantReference } from "./model.js";

export class ParticipantReferenceParser {
	static parseParticipantReference(value: string): ParticipantReference {
		const trimmed = value.trim();
		const markdownLinkLabel =
			ParticipantReferenceParser.parseMarkdownLinkLabel(trimmed);
		if (markdownLinkLabel !== undefined) {
			return { displayName: markdownLinkLabel };
		}

		const stableReference =
			ParticipantReferenceParser.parseStableIdReference(trimmed);
		if (stableReference) {
			return stableReference;
		}

		return { displayName: trimmed };
	}

	static parseLegacyAgendaLine(
		line: string,
	): Readonly<{ speakers: string; description: string }> | undefined {
		let cursor = 0;
		cursor = ParticipantReferenceParser.skipHorizontalWhitespace(line, cursor);
		if (line[cursor] !== "-") {
			return undefined;
		}

		cursor += 1;
		if (
			!ParticipantReferenceParser.isHorizontalWhitespaceCharacter(
				line[cursor] ?? "",
			)
		) {
			return undefined;
		}
		cursor = ParticipantReferenceParser.skipHorizontalWhitespace(line, cursor);

		const content = line.slice(cursor);
		for (let index = 0; index < content.length; index += 1) {
			if (content[index] !== ":") {
				continue;
			}
			if (
				!ParticipantReferenceParser.isHorizontalWhitespaceCharacter(
					content[index + 1] ?? "",
				)
			) {
				continue;
			}

			const speakers = content.slice(0, index).trimEnd();
			if (speakers === "") {
				return undefined;
			}

			let descriptionStart = index + 1;
			while (
				descriptionStart < content.length &&
				ParticipantReferenceParser.isHorizontalWhitespaceCharacter(
					content[descriptionStart],
				)
			) {
				descriptionStart += 1;
			}

			return {
				speakers,
				description: content.slice(descriptionStart),
			};
		}

		return undefined;
	}

	static parseMarkdownLinkLabel(value: string): string | undefined {
		if (!value.startsWith("[") || !value.endsWith(")")) {
			return undefined;
		}

		const closingBracket = value.indexOf("]");
		if (closingBracket <= 1 || value[closingBracket + 1] !== "(") {
			return undefined;
		}

		const target = value.slice(closingBracket + 2, -1);
		if (target === "" || target.includes(")")) {
			return undefined;
		}

		return value.slice(1, closingBracket).trim();
	}

	static parseStableIdReference(
		value: string,
	): ParticipantReference | undefined {
		if (!value.endsWith("]")) {
			return undefined;
		}

		const openingBracket = value.lastIndexOf("[");
		if (
			openingBracket <= 0 ||
			!ParticipantReferenceParser.isWhitespaceCharacter(
				value[openingBracket - 1] ?? "",
			)
		) {
			return undefined;
		}

		const id = value.slice(openingBracket + 1, -1);
		if (!STABLE_ID_PATTERN.test(id)) {
			return undefined;
		}

		const displayName = value.slice(0, openingBracket).trim();
		if (displayName === "") {
			return undefined;
		}

		return {
			displayName,
			id,
		};
	}

	static isHorizontalWhitespaceCharacter(value: string): boolean {
		return value === " " || value === "\t";
	}

	static isWhitespaceCharacter(value: string): boolean {
		return (
			ParticipantReferenceParser.isHorizontalWhitespaceCharacter(value) ||
			value === "\n" ||
			value === "\r"
		);
	}

	private static skipHorizontalWhitespace(
		line: string,
		cursor: number,
	): number {
		while (
			cursor < line.length &&
			ParticipantReferenceParser.isHorizontalWhitespaceCharacter(line[cursor])
		) {
			cursor += 1;
		}
		return cursor;
	}
}
