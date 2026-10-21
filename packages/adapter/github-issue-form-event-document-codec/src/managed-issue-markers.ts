import type {
	EventDiagnostic,
	EventDiagnostics,
} from "@meetup-automation/event";
import {
	CURRENT_SCHEMA_MARKER,
	type ManagedMarkerMatch,
	REFERENCE_MARKER_NAME,
	SCHEMA_MARKER_NAME,
	type StableReferenceMetadata,
} from "./github-issue-form-event-document-codec-contracts.js";
import type { MarkdownLines } from "./markdown-lines.js";

export interface ManagedIssueMarkersCollaborators {
	readonly markdownLines: Pick<MarkdownLines, "isWhitespaceCharacter">;
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
}

export class ManagedIssueMarkers {
	constructor(
		private readonly collaborators: ManagedIssueMarkersCollaborators,
	) {}

	readManagedMarkerValues(body: string, markerName: string): readonly string[] {
		return this.findManagedMarkerMatches(body, markerName).map(
			({ value }) => value,
		);
	}

	replaceManagedMarker(
		body: string,
		markerName: string,
		replacement: string,
	): Readonly<{ body: string; found: boolean }> {
		const matches = this.findManagedMarkerMatches(body, markerName);
		if (matches.length === 0) {
			return { body, found: false };
		}

		let result = "";
		let lastIndex = 0;
		for (const [index, match] of matches.entries()) {
			result += body.slice(lastIndex, match.start);
			if (index === 0) {
				result += replacement;
			}
			lastIndex = match.end;
		}
		result += body.slice(lastIndex);

		return { body: result, found: true };
	}

	findManagedMarkerMatches(
		body: string,
		markerName: string,
	): readonly ManagedMarkerMatch[] {
		const matches: ManagedMarkerMatch[] = [];

		for (let cursor = 0; cursor < body.length; ) {
			const commentStart = body.indexOf("<!--", cursor);
			if (commentStart === -1) {
				break;
			}

			const commentEnd = body.indexOf("-->", commentStart + 4);
			if (commentEnd === -1) {
				break;
			}

			const value = this.parseManagedMarkerComment(
				body.slice(commentStart + 4, commentEnd),
				markerName,
			);
			if (value !== undefined) {
				matches.push({
					start: commentStart,
					end: commentEnd + 3,
					value,
				});
			}

			cursor = commentEnd + 3;
		}

		return matches;
	}

	parseManagedMarkerComment(
		commentBody: string,
		markerName: string,
	): string | undefined {
		const trimmed = commentBody.trim();
		if (!trimmed.startsWith(markerName)) {
			return undefined;
		}

		let cursor = markerName.length;
		while (
			cursor < trimmed.length &&
			this.collaborators.markdownLines.isWhitespaceCharacter(trimmed[cursor])
		) {
			cursor += 1;
		}
		if (trimmed[cursor] !== ":") {
			return undefined;
		}

		return trimmed.slice(cursor + 1).trim();
	}

	upsertManagedMarkers(
		body: string,
		metadata: StableReferenceMetadata,
	): string {
		const referenceMarker = `<!-- meetup-event-references:${JSON.stringify(metadata).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e")} -->`;
		const schemaReplacement = this.replaceManagedMarker(
			body,
			SCHEMA_MARKER_NAME,
			CURRENT_SCHEMA_MARKER,
		);
		const referenceReplacement = this.replaceManagedMarker(
			schemaReplacement.body,
			REFERENCE_MARKER_NAME,
			referenceMarker,
		);
		let result = referenceReplacement.body;

		if (!schemaReplacement.found) {
			result = `${CURRENT_SCHEMA_MARKER}\n${result}`;
		}
		if (!referenceReplacement.found) {
			result = result.replace(
				CURRENT_SCHEMA_MARKER,
				`${CURRENT_SCHEMA_MARKER}\n${referenceMarker}`,
			);
		}
		return result;
	}

	readSchema(body: string, diagnostics: EventDiagnostic[]): 0 | 1 {
		const markers = this.readManagedMarkerValues(body, SCHEMA_MARKER_NAME);
		if (markers.length === 0) {
			return 0;
		}
		if (markers.length > 1) {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
					code: "event.document.schema-marker.duplicate",
					severity: "error",
					category: "invalid",
					message: "The event document contains duplicate schema markers",
					fixAvailable: true,
				}),
			);
		}
		if (markers[0] !== "1") {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
					code: "event.document.schema-version.unsupported",
					severity: "error",
					category: "migration",
					message: "The event document schema version is unsupported",
				}),
			);
			return 0;
		}
		return 1;
	}
}
