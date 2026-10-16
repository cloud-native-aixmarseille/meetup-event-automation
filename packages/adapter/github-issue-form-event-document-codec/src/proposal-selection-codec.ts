import type { EventDiagnostic, MeetupEvent } from "@meetup-automation/event";
import { IssueFormSections } from "./issue-form-sections.js";
import { ManagedIssueMarkers } from "./managed-issue-markers.js";

export class ProposalSelectionCodec {
	static read(
		body: string,
		diagnostics: EventDiagnostic[],
	): Pick<MeetupEvent, "proposalReferences" | "proposalStatus"> {
		const sections = IssueFormSections.parseSections(body);
		const value = IssueFormSections.readSection(
			sections,
			"Conference Hall proposals",
			false,
			diagnostics,
		);
		const hasMarker = body.includes("<!-- meetup-proposals:");
		if ((!value || value === "_No response_") && !hasMarker) return {};
		const proposalReferences = (value || "!missing-selection")
			.split(/\r?\n/)
			.map((id) => id.trim().replace(/^[-*]\s+/, ""))
			.filter(Boolean);
		const markers = ManagedIssueMarkers.readManagedMarkerValues(
			body,
			"meetup-proposals",
		);
		if (
			markers.length > 1 ||
			(markers[0] && !/^1:(current|stale)$/.test(markers[0]))
		)
			diagnostics.push({
				code: "event.proposals.invalid",
				severity: "error",
				category: "invalid",
				field: "agenda",
				message: "Proposal selection metadata is invalid.",
			});
		return { proposalReferences, proposalStatus: "stale" };
	}
	static write(
		body: string,
		event: Pick<MeetupEvent, "proposalReferences" | "proposalStatus">,
	): string {
		if (!event.proposalReferences?.length) return body;
		const marker = `<!-- meetup-proposals:1:${event.proposalStatus ?? "stale"} -->`;
		const replaced = ManagedIssueMarkers.replaceManagedMarker(
			body,
			"meetup-proposals",
			marker,
		);
		return replaced.found ? replaced.body : `${marker}\n${body}`;
	}
	static restore(event: MeetupEvent): MeetupEvent {
		return {
			...event,
			agenda: event.agenda.map((entry) => ({
				...entry,
				description: event.proposalReferences?.length
					? ProposalSelectionCodec.unescape(entry.description)
					: entry.description,
				speakers: entry.speakers.map((speaker) => ({
					...speaker,
					displayName: ProposalSelectionCodec.unescape(speaker.displayName),
				})),
			})),
		};
	}
	static unescape(value: string): string {
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

	static escape(value: string): string {
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
