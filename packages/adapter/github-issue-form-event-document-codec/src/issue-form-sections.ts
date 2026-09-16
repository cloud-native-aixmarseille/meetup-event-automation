import {
	type EventDiagnostic,
	EventDiagnostics,
} from "@meetup-automation/event";
import type { Section } from "./github-issue-form-event-document-codec-contracts.js";
import { MarkdownLines } from "./markdown-lines.js";

export class IssueFormSections {
	static parseSections(body: string): ReadonlyMap<string, readonly Section[]> {
		const sections = new Map<string, Section[]>();
		let pending:
			| Readonly<{
					heading: string;
					headingStart: number;
					contentStart: number;
			  }>
			| undefined;

		for (let cursor = 0; cursor < body.length; ) {
			const lineEnd = MarkdownLines.findLineEnd(body, cursor);
			const nextLineStart = MarkdownLines.findNextLineStart(body, lineEnd);
			const heading = MarkdownLines.parseHeadingLine(
				body.slice(cursor, lineEnd),
			);

			if (heading !== undefined) {
				if (pending) {
					IssueFormSections.appendSection(sections, {
						heading: pending.heading,
						headingStart: pending.headingStart,
						contentStart: pending.contentStart,
						contentEnd: cursor,
						value: body.slice(pending.contentStart, cursor),
					});
				}
				pending = {
					heading,
					headingStart: cursor,
					contentStart: nextLineStart,
				};
			}

			cursor = nextLineStart;
		}

		if (pending) {
			IssueFormSections.appendSection(sections, {
				heading: pending.heading,
				headingStart: pending.headingStart,
				contentStart: pending.contentStart,
				contentEnd: body.length,
				value: body.slice(pending.contentStart),
			});
		}

		return sections;
	}

	static appendSection(
		sections: Map<string, Section[]>,
		section: Section,
	): void {
		const existing = sections.get(section.heading) ?? [];
		sections.set(section.heading, [...existing, section]);
	}

	static cleanResponse(value: string): string {
		const trimmed = value.trim();
		return trimmed === "_No response_" ? "" : trimmed;
	}

	static replaceOrAppendSection(
		body: string,
		heading: string,
		value: string,
	): string {
		const section = IssueFormSections.parseSections(body).get(heading)?.[0];
		const normalizedValue = value.trim();
		if (!section) {
			if (!normalizedValue) {
				return body;
			}
			const separator =
				body.length === 0 || body.endsWith("\n\n") ? "" : "\n\n";
			return `${body}${separator}### ${heading}\n\n${normalizedValue}\n`;
		}
		if (IssueFormSections.cleanResponse(section.value) === normalizedValue) {
			return body;
		}
		return `${body.slice(0, section.contentStart)}\n${normalizedValue}\n\n${body.slice(section.contentEnd)}`;
	}

	static removeSection(body: string, heading: string): string {
		const section = IssueFormSections.parseSections(body).get(heading)?.[0];
		if (!section) {
			return body;
		}

		const before = MarkdownLines.trimTrailingWhitespace(
			body.slice(0, section.headingStart),
		);
		const after = MarkdownLines.trimLeadingWhitespace(
			body.slice(section.contentEnd),
		);
		if (before === "") {
			return after;
		}
		if (after === "") {
			return `${before}\n`;
		}
		return `${before}\n\n${after}`;
	}

	static readSection(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		required: boolean,
		diagnostics: EventDiagnostic[],
	): string {
		const matches = sections.get(heading) ?? [];
		if (matches.length === 0) {
			if (required) {
				diagnostics.push(
					EventDiagnostics.diagnostic({
						code: "event.document.heading.missing",
						severity: "error",
						category: "invalid",
						field: heading,
						message: `The ${heading} heading is missing`,
						fixAvailable: true,
					}),
				);
			}
			return "";
		}
		if (matches.length > 1) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.heading.duplicate",
					severity: "error",
					category: "invalid",
					field: heading,
					message: `The ${heading} heading occurs more than once`,
				}),
			);
		}
		return IssueFormSections.cleanResponse(matches[0].value);
	}
}
