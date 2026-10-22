import type { EventDiagnostic, MeetupEvent } from "@meetup-automation/event";
import { HEADINGS } from "./github-issue-form-event-document-codec-contracts.js";
import type { IssueFormSections } from "./issue-form-sections.js";
import type { ManagedIssueMarkers } from "./managed-issue-markers.js";

export interface ProposalSelectionCodecCollaborators {
	readonly issueFormSections: Pick<
		IssueFormSections,
		"parseSections" | "readSection"
	>;
	readonly managedIssueMarkers: Pick<
		ManagedIssueMarkers,
		"readManagedMarkerValues" | "replaceManagedMarker"
	>;
}

export class ProposalSelectionCodec {
	constructor(
		private readonly collaborators: ProposalSelectionCodecCollaborators,
	) {}

	read(
		body: string,
		diagnostics: EventDiagnostic[],
	): Pick<MeetupEvent, "proposalReferences" | "proposalStatus"> {
		const sections = this.collaborators.issueFormSections.parseSections(body);
		const value = this.collaborators.issueFormSections.readSection(
			sections,
			HEADINGS.proposals,
			false,
			diagnostics,
		);
		const hasMarker = body.includes("<!-- meetup-proposals:");
		if ((!value || value === "_No response_") && !hasMarker) return {};
		const proposalReferences = (value || "!missing-selection")
			.split(/\r?\n/)
			.map((id) => id.trim().replace(/^[-*]\s+/, ""))
			.filter(Boolean);
		const markers =
			this.collaborators.managedIssueMarkers.readManagedMarkerValues(
				body,
				"meetup-proposals",
			);
		if (
			markers.length > 1 ||
			(markers[0] && !/^1:(current|stale)$/.test(markers[0]))
		)
			diagnostics.push({
				code: "event.proposals.invalid-selection",
				severity: "error",
				category: "invalid",
				field: "agenda",
				message: "Proposal selection metadata is invalid.",
			});
		return { proposalReferences, proposalStatus: "stale" };
	}
	write(
		body: string,
		event: Pick<MeetupEvent, "proposalReferences" | "proposalStatus">,
	): string {
		if (!event.proposalReferences?.length) return body;
		const marker = `<!-- meetup-proposals:1:${event.proposalStatus ?? "stale"} -->`;
		const replaced =
			this.collaborators.managedIssueMarkers.replaceManagedMarker(
				body,
				"meetup-proposals",
				marker,
			);
		return replaced.found ? replaced.body : `${marker}\n${body}`;
	}
	restore(event: MeetupEvent): MeetupEvent {
		return {
			...event,
			agenda: event.agenda.map((entry) => ({
				...entry,
				description: event.proposalReferences?.length
					? this.unescape(entry.description)
					: entry.description,
				speakers: entry.speakers.map((speaker) => ({
					...speaker,
					displayName: this.unescape(speaker.displayName),
				})),
			})),
		};
	}
	unescape(value: string): string {
		return value.replace(/&(amp|lt|gt|#\d+);/g, (match, code: string) => {
			if (code === "amp") return "&";
			if (code === "lt") return "<";
			if (code === "gt") return ">";
			const number = Number(code.slice(1));
			return number >= 32 && number <= 126
				? String.fromCharCode(number)
				: match;
		});
	}

	escape(value: string): string {
		return value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(
				/[\\`*_[\]{}()#!|~,:]/g,
				(character) => `&#${character.charCodeAt(0)};`,
			)
			.replace(/[\r\n]+/g, " ");
	}
}
