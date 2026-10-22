import type {
	EventDiagnostic,
	EventDiagnostics,
} from "@meetup-automation/event";
import type { Section } from "./github-issue-form-event-document-codec-contracts.js";
import type { MarkdownLines } from "./markdown-lines.js";

export interface IssueFormSectionsCollaborators {
	readonly markdownLines: Pick<
		MarkdownLines,
		| "findLineEnd"
		| "findNextLineStart"
		| "parseHeadingLine"
		| "trimTrailingWhitespace"
		| "trimLeadingWhitespace"
	>;
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
}

export class IssueFormSections {
	constructor(private readonly collaborators: IssueFormSectionsCollaborators) {}

	parseSections(body: string): ReadonlyMap<string, readonly Section[]> {
		const sections = new Map<string, Section[]>();
		let pending:
			| Readonly<{
					heading: string;
					headingStart: number;
					contentStart: number;
			  }>
			| undefined;

		for (let cursor = 0; cursor < body.length; ) {
			const lineEnd = this.collaborators.markdownLines.findLineEnd(
				body,
				cursor,
			);
			const nextLineStart = this.collaborators.markdownLines.findNextLineStart(
				body,
				lineEnd,
			);
			const heading = this.collaborators.markdownLines.parseHeadingLine(
				body.slice(cursor, lineEnd),
			);

			if (heading !== undefined) {
				if (pending) {
					this.appendSection(sections, {
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
			this.appendSection(sections, {
				heading: pending.heading,
				headingStart: pending.headingStart,
				contentStart: pending.contentStart,
				contentEnd: body.length,
				value: body.slice(pending.contentStart),
			});
		}

		return sections;
	}

	appendSection(sections: Map<string, Section[]>, section: Section): void {
		const existing = sections.get(section.heading) ?? [];
		sections.set(section.heading, [...existing, section]);
	}

	cleanResponse(value: string): string {
		const trimmed = value.trim();
		return trimmed === "_No response_" ? "" : trimmed;
	}

	replaceOrAppendSection(body: string, heading: string, value: string): string {
		const section = this.parseSections(body).get(heading)?.[0];
		const normalizedValue = value.trim();
		if (!section) {
			if (!normalizedValue) {
				return body;
			}
			const separator =
				body.length === 0 || body.endsWith("\n\n") ? "" : "\n\n";
			return `${body}${separator}### ${heading}\n\n${normalizedValue}\n`;
		}
		if (this.cleanResponse(section.value) === normalizedValue) {
			return body;
		}
		return `${body.slice(0, section.contentStart)}\n${normalizedValue}\n\n${body.slice(section.contentEnd)}`;
	}

	removeSection(body: string, heading: string): string {
		const section = this.parseSections(body).get(heading)?.[0];
		if (!section) {
			return body;
		}

		const before = this.collaborators.markdownLines.trimTrailingWhitespace(
			body.slice(0, section.headingStart),
		);
		const after = this.collaborators.markdownLines.trimLeadingWhitespace(
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

	readSection(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		required: boolean,
		diagnostics: EventDiagnostic[],
	): string {
		const matches = sections.get(heading) ?? [];
		if (matches.length === 0) {
			if (required) {
				diagnostics.push(
					this.collaborators.eventDiagnostics.diagnostic({
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
				this.collaborators.eventDiagnostics.diagnostic({
					code: "event.document.heading.duplicate",
					severity: "error",
					category: "invalid",
					field: heading,
					message: `The ${heading} heading occurs more than once`,
				}),
			);
		}
		return this.cleanResponse(matches[0].value);
	}
}
