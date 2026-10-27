import type {
	EventDocument,
	EventRepositoryPatch,
	MeetupEvent,
	ParticipantReference,
} from "@meetup-automation/event";
import type { EventReferenceMetadata } from "./event-reference-metadata.js";
import {
	type GitHubIssueFormEventDocumentCodecOptions,
	HEADINGS,
} from "./github-issue-form-event-document-codec-contracts.js";
import type { IssueFormChecklists } from "./issue-form-checklists.js";
import type { IssueFormSections } from "./issue-form-sections.js";
import type { ManagedIssueMarkers } from "./managed-issue-markers.js";
import type { ParticipantLinks } from "./participant-links.js";
import type { ProposalSelectionCodec } from "./proposal-selection-codec.js";

export interface IssueFormWriterCollaborators {
	readonly proposalSelectionCodec: Pick<
		ProposalSelectionCodec,
		"write" | "escape"
	>;
	readonly managedIssueMarkers: Pick<
		ManagedIssueMarkers,
		"upsertManagedMarkers"
	>;
	readonly eventReferenceMetadata: Pick<
		EventReferenceMetadata,
		"referenceMetadata"
	>;
	readonly participantLinks: Pick<
		ParticipantLinks,
		"renderAgenda" | "encodeUrlSegment"
	>;
	readonly issueFormSections: Pick<
		IssueFormSections,
		"replaceOrAppendSection" | "removeSection"
	>;
	readonly issueFormChecklists: Pick<
		IssueFormChecklists,
		"replaceOrAppendChecklistSections" | "replaceOrAppendLogisticsIntent"
	>;
}

export class IssueFormWriter {
	private readonly repositoryRef: string;
	constructor(
		private readonly collaborators: IssueFormWriterCollaborators,
		options: GitHubIssueFormEventDocumentCodecOptions = {},
	) {
		this.repositoryRef = options.repositoryRef ?? "main";
	}
	createPatch(
		document: EventDocument,
		event: MeetupEvent,
	): EventRepositoryPatch {
		const patch: {
			issueTitle?: string;
			labels?: readonly string[];
			body?: string;
		} = {};
		if (document.issueTitle !== event.issueTitle)
			patch.issueTitle = event.issueTitle;
		if (!this.arraysEqual(document.labels, event.labels))
			patch.labels = Object.freeze([...event.labels]);
		const fields = this.renderFields(document, event);
		const checklists = this.renderOperations(fields, event);
		const body = this.collaborators.proposalSelectionCodec.write(
			this.collaborators.managedIssueMarkers.upsertManagedMarkers(
				checklists,
				this.collaborators.eventReferenceMetadata.referenceMetadata(event),
			),
			event,
		);
		if (body !== document.body) patch.body = body;
		return Object.freeze(patch);
	}
	private renderFields(document: EventDocument, event: MeetupEvent): string {
		const render = (participant: ParticipantReference) =>
			this.renderParticipant(participant, document.identity.repository);
		const renderSpeaker = (participant: ParticipantReference) =>
			event.proposalReferences?.length && participant.id
				? `${this.collaborators.proposalSelectionCodec.escape(participant.displayName)} [${participant.id}]`
				: render({
						...participant,
						displayName: this.collaborators.proposalSelectionCodec.escape(
							participant.displayName,
						),
					});

		const fields = [
			[HEADINGS.eventTitle, event.eventTitle],
			[HEADINGS.date, event.date],
			[HEADINGS.host, event.host ? render(event.host) : ""],
			[HEADINGS.description, event.description],
			[
				HEADINGS.agenda,
				this.collaborators.participantLinks.renderAgenda(event, renderSpeaker),
			],
			[HEADINGS.meetupLink, event.publicationLinks.meetup ?? ""],
			[HEADINGS.communityLink, event.publicationLinks.community ?? ""],
			[HEADINGS.assetsLink, event.publicationLinks.assets ?? ""],
			[HEADINGS.slidesPdf, event.slidesPdfUrl ?? ""],
		] as const;
		let body = document.body;
		for (const [heading, value] of fields) {
			if (heading === HEADINGS.agenda && event.proposalStatus === "stale")
				continue;
			body = this.collaborators.issueFormSections.replaceOrAppendSection(
				body,
				heading,
				value,
			);
		}
		if (event.publicationLinks.feedback)
			body = this.collaborators.issueFormSections.replaceOrAppendSection(
				body,
				HEADINGS.feedbackLink,
				event.publicationLinks.feedback,
			);
		return this.collaborators.issueFormSections.removeSection(
			body,
			HEADINGS.occurrenceStatus,
		);
	}
	private renderOperations(source: string, event: MeetupEvent): string {
		let body = source;
		for (const [headings, items] of [
			[[HEADINGS.slides], event.operationalChecklists.slidesAndContent],
			[
				[HEADINGS.communication, HEADINGS.introductionEmails],
				event.operationalChecklists.communication,
			],
		] as const)
			body =
				this.collaborators.issueFormChecklists.replaceOrAppendChecklistSections(
					body,
					headings,
					items,
				);
		body =
			this.collaborators.issueFormChecklists.replaceOrAppendLogisticsIntent(
				body,
				HEADINGS.aperitif,
				event.logistics.aperitif,
			);
		body =
			this.collaborators.issueFormChecklists.replaceOrAppendLogisticsIntent(
				body,
				HEADINGS.restaurant,
				event.logistics.postEventVenue,
			);
		return this.collaborators.issueFormChecklists.replaceOrAppendChecklistSections(
			body,
			[HEADINGS.postEvent, HEADINGS.thankYouEmails, HEADINGS.slidesDelivery],
			event.operationalChecklists.postEvent,
		);
	}
	private renderParticipant(
		participant: ParticipantReference,
		repository: string,
	): string {
		if (!participant.id || !participant.source) return participant.displayName;
		const path = participant.source.path
			.split("/")
			.map(
				this.collaborators.participantLinks.encodeUrlSegment.bind(
					this.collaborators.participantLinks,
				),
			)
			.join("/");
		const ref = this.collaborators.participantLinks.encodeUrlSegment(
			this.repositoryRef,
		);
		const url = `https://github.com/${repository}/blob/${ref}/${path}#L${participant.source.line}`;
		return `[${participant.displayName}](${url})`;
	}
	private arraysEqual(
		left: readonly string[],
		right: readonly string[],
	): boolean {
		return (
			left.length === right.length &&
			left.every((value, index) => value === right[index])
		);
	}
}
export type IssueFormWriterArguments =
	ConstructorParameters<typeof IssueFormWriter> extends [unknown, ...infer Args]
		? Args
		: never;
