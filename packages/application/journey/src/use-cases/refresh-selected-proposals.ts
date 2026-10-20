import type { EventDiagnostic, MeetupEvent } from "@meetup-automation/event";
import {
	type ProposalSnapshot,
	type ProposalSource,
	ProposalSourceError,
	type ReferentialCatalog,
} from "@meetup-automation/referential";
import { ProposalSelectionError } from "./proposal-selection-error.js";

export class RefreshSelectedProposals {
	constructor(private readonly source: ProposalSource) {}
	async execute(
		event: MeetupEvent,
		catalog: ReferentialCatalog,
		diagnostics: EventDiagnostic[],
	): Promise<MeetupEvent> {
		const numbers = event.proposalReferences;
		if (!numbers?.length) return event;
		for (let index = diagnostics.length - 1; index >= 0; index--) {
			if (diagnostics[index].code === "event.agenda.missing")
				diagnostics.splice(index, 1);
		}
		try {
			if (
				diagnostics.some(
					(item) =>
						(item.code.startsWith("event.proposals.") ||
							item.code.startsWith("event.document.")) &&
						item.severity === "error",
				)
			)
				return { ...event, proposalStatus: "stale" };
			if (
				new Set(numbers).size !== numbers.length ||
				!numbers.every(
					(value) =>
						/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
				)
			)
				throw new ProposalSelectionError("invalid-selection");
			const snapshot = await this.source.load();
			const agenda = this.project(numbers, snapshot, catalog);
			for (let index = diagnostics.length - 1; index >= 0; index--) {
				if (diagnostics[index].code.startsWith("event.agenda."))
					diagnostics.splice(index, 1);
			}
			return { ...event, agenda, proposalStatus: "current" };
		} catch (error) {
			const code =
				error instanceof ProposalSourceError ||
				error instanceof ProposalSelectionError
					? error.code
					: "unavailable";
			diagnostics.push({
				code: `event.proposals.${code}`,
				severity: "error",
				category: "invalid",
				field: "agenda",
				message:
					"Selected proposals could not be refreshed; the last agenda is stale. Check source access, acceptance and reviewed speaker mappings.",
			});
			return { ...event, proposalStatus: "stale" };
		}
	}
	private project(
		numbers: readonly string[],
		snapshot: ProposalSnapshot,
		catalog: ReferentialCatalog,
	) {
		const selected = new Set<string>();
		return numbers.map((number) => {
			const matches = snapshot.proposals.filter(
				(item) => item.number === Number(number),
			);
			if (!matches.length) throw new ProposalSelectionError("not-found");
			if (matches.length !== 1) throw new ProposalSourceError("conflict");
			const proposal = matches[0];
			if (selected.has(proposal.id)) throw new ProposalSourceError("invalid");
			selected.add(proposal.id);
			if (!proposal.accepted) throw new ProposalSelectionError("not-accepted");
			const speakers = proposal.speakerIds.map((speakerId) => {
				const matches = catalog.speakers.filter(
					(speaker) =>
						speaker.sourceIdentity?.provider === snapshot.provider &&
						speaker.sourceIdentity.event === snapshot.event &&
						speaker.sourceIdentity.speakerId === speakerId,
				);
				if (matches.length !== 1)
					throw new ProposalSourceError("mapping-required");
				const speaker = matches[0];
				return {
					id: speaker.id,
					displayName: speaker.displayName,
					source: speaker.source,
					pictureUrl: speaker.pictureUrl,
				};
			});
			return {
				speakers,
				description: `${proposal.title}: ${proposal.abstract}`,
				proposal: {
					provider: snapshot.provider,
					event: snapshot.event,
					id: proposal.id,
					title: proposal.title,
					abstract: proposal.abstract,
					languages: proposal.languages,
					formats: proposal.formats,
				},
			};
		});
	}
}
