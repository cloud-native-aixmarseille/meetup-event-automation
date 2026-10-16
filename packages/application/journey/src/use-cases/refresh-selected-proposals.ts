import type { EventDiagnostic, MeetupEvent } from "@meetup-automation/event";
import {
	ProposalSourceError,
	type ProposalSource,
	type ProposalSnapshot,
	type ReferentialCatalog,
} from "@meetup-automation/referential";

export class RefreshSelectedProposals {
	constructor(private readonly source: ProposalSource) {}
	async execute(
		event: MeetupEvent,
		catalog: ReferentialCatalog,
		diagnostics: EventDiagnostic[],
	): Promise<MeetupEvent> {
		const ids = event.proposalReferences;
		if (!ids?.length) return event;
		try {
			if (
				diagnostics.some(
					(item) =>
						(item.code.startsWith("event.proposals.") ||
							item.code.startsWith("event.document.")) &&
						item.severity === "error",
				)
			)
				throw new ProposalSourceError("invalid");
			if (
				new Set(ids).size !== ids.length ||
				!ids.every((id) => /^[a-zA-Z0-9_-]{1,200}$/.test(id))
			)
				throw new ProposalSourceError("invalid");
			const snapshot = await this.source.load();
			const agenda = this.project(ids, snapshot, catalog);
			for (let index = diagnostics.length - 1; index >= 0; index--) {
				if (diagnostics[index].code.startsWith("event.agenda."))
					diagnostics.splice(index, 1);
			}
			return { ...event, agenda, proposalStatus: "current" };
		} catch (error) {
			const code =
				error instanceof ProposalSourceError ? error.code : "unavailable";
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
		ids: readonly string[],
		snapshot: ProposalSnapshot,
		catalog: ReferentialCatalog,
	) {
		return ids.map((id) => {
			const proposal = snapshot.proposals.find((item) => item.id === id);
			if (!proposal?.accepted) throw new ProposalSourceError("invalid");
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
