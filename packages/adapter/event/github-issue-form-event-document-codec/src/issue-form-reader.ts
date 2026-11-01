import type {
	EventDiagnostic,
	EventDiagnostics,
	EventDocument,
	EventDocumentDecodeResult,
	MeetupEvent,
	MeetupEventOperations,
} from "@meetup-automation/event";
import type { EventReferenceMetadata } from "./event-reference-metadata.js";
import {
	type GitHubIssueFormEventDocumentCodecOptions,
	HEADINGS,
	type Section,
} from "./github-issue-form-event-document-codec-contracts.js";
import type { IssueFormChecklists } from "./issue-form-checklists.js";
import type { IssueFormBody } from "./issue-form-event-input.js";
import type { IssueFormEventMapper } from "./issue-form-event-mapper.js";
import type { IssueFormSections } from "./issue-form-sections.js";
import type { ManagedIssueMarkers } from "./managed-issue-markers.js";
import type { ParticipantLinks } from "./participant-links.js";
import type { ProposalSelectionCodec } from "./proposal-selection-codec.js";

type Sections = ReadonlyMap<string, readonly Section[]>;

export interface IssueFormReaderCollaborators {
	readonly issueFormSections: Pick<
		IssueFormSections,
		"parseSections" | "readSection"
	>;
	readonly managedIssueMarkers: Pick<ManagedIssueMarkers, "readSchema">;
	readonly issueFormEventMapper: Pick<IssueFormEventMapper, "map">;
	readonly proposalSelectionCodec: Pick<
		ProposalSelectionCodec,
		"read" | "restore"
	>;
	readonly issueFormChecklists: Pick<
		IssueFormChecklists,
		"toOperationalChecklist" | "readCheckboxes" | "readLogisticsIntent"
	>;
	readonly meetupEventOperations: Pick<
		MeetupEventOperations,
		"postEventChecklistIsComplete"
	>;
	readonly eventReferenceMetadata: Pick<
		EventReferenceMetadata,
		"readReferenceMetadata" | "applyReferenceMetadata"
	>;
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly participantLinks: Pick<
		ParticipantLinks,
		"readSourceLinks" | "restoreSourceLocation"
	>;
}

export class IssueFormReader {
	private readonly timeZone: string;
	private readonly speakersConfirmationLabel: string;
	constructor(
		private readonly collaborators: IssueFormReaderCollaborators,
		options: GitHubIssueFormEventDocumentCodecOptions = {},
	) {
		this.timeZone = options.timeZone ?? "Europe/Paris";
		this.speakersConfirmationLabel =
			options.speakersConfirmationLabel ?? "speakers:confirmed";
	}
	decode(document: EventDocument): EventDocumentDecodeResult {
		const diagnostics: EventDiagnostic[] = [];
		const sections = this.collaborators.issueFormSections.parseSections(
			document.body,
		);
		const schema = this.collaborators.managedIssueMarkers.readSchema(
			document.body,
			diagnostics,
		);
		const parsedBody = this.readBody(sections, diagnostics);
		const operations = this.readOperations(sections, diagnostics);
		const migrated = this.collaborators.issueFormEventMapper.map({
			repository: document.identity.repository,
			issueNumber: document.identity.issueNumber,
			issueState: document.issueState,
			issueTitle: document.issueTitle,
			labels: document.labels,
			parsedBody,
			timeZone: this.timeZone,
		});
		diagnostics.push(
			...migrated.diagnostics.filter(
				(item) => schema === 0 || item.code !== "event.document.legacy-schema",
			),
		);
		const event: MeetupEvent = {
			...migrated.event,
			slidesPdfUrl:
				this.collaborators.issueFormSections.readSection(
					sections,
					HEADINGS.slidesPdf,
					false,
					diagnostics,
				) || undefined,
			...operations,
			...this.collaborators.proposalSelectionCodec.read(
				document.body,
				diagnostics,
			),
			confirmations: {
				speakers: document.labels.includes(this.speakersConfirmationLabel),
			},
		};
		const referenced = this.restoreReferences(
			this.collaborators.proposalSelectionCodec.restore(event),
			document.body,
			schema,
			diagnostics,
		);
		return {
			event: this.restoreLinks(
				referenced,
				sections,
				document.identity.repository,
			),
			diagnostics: Object.freeze(diagnostics),
		};
	}
	private readBody(
		sections: Sections,
		diagnostics: EventDiagnostic[],
	): IssueFormBody {
		const read = (heading: string, required = false) =>
			this.collaborators.issueFormSections.readSection(
				sections,
				heading,
				required,
				diagnostics,
			);
		return {
			event_title: read(HEADINGS.eventTitle),
			event_date: read(HEADINGS.date, true),
			hoster: [read(HEADINGS.host, true)].filter(Boolean),
			event_description: read(HEADINGS.description),
			agenda: read(HEADINGS.agenda, !sections.has(HEADINGS.proposals)),
			meetup_link: read(HEADINGS.meetupLink),
			cncf_link: read(HEADINGS.communityLink),
			drive_link: read(HEADINGS.assetsLink),
			openfeedback_link: read(HEADINGS.feedbackLink),
			event_status: read(HEADINGS.occurrenceStatus),
		};
	}
	private readOperations(
		sections: Sections,
		diagnostics: EventDiagnostic[],
	): Pick<
		MeetupEvent,
		"logistics" | "operationalChecklists" | "followUpComplete"
	> {
		const read = (headings: readonly string[]) =>
			this.collaborators.issueFormChecklists.toOperationalChecklist(
				headings.flatMap((heading) =>
					this.collaborators.issueFormChecklists.readCheckboxes(
						sections,
						heading,
						diagnostics,
					),
				),
			);
		const slidesAndContent = read([HEADINGS.slides]);
		const communication = read([
			HEADINGS.communication,
			HEADINGS.introductionEmails,
		]);
		const diagnosticOffset = diagnostics.length;
		const postEvent = read([
			HEADINGS.postEvent,
			HEADINGS.thankYouEmails,
			HEADINGS.slidesDelivery,
		]);
		const followUpComplete =
			diagnostics.length === diagnosticOffset &&
			this.collaborators.meetupEventOperations.postEventChecklistIsComplete(
				postEvent,
			);
		return {
			operationalChecklists: { slidesAndContent, communication, postEvent },
			followUpComplete,
			logistics: {
				aperitif: this.collaborators.issueFormChecklists.readLogisticsIntent(
					sections,
					HEADINGS.aperitif,
					diagnostics,
				),
				postEventVenue:
					this.collaborators.issueFormChecklists.readLogisticsIntent(
						sections,
						HEADINGS.restaurant,
						diagnostics,
					),
			},
		};
	}
	private restoreReferences(
		event: MeetupEvent,
		body: string,
		schema: 0 | 1,
		diagnostics: EventDiagnostic[],
	): MeetupEvent {
		const metadata =
			this.collaborators.eventReferenceMetadata.readReferenceMetadata(
				body,
				diagnostics,
			);
		if (metadata)
			return this.collaborators.eventReferenceMetadata.applyReferenceMetadata(
				event,
				metadata,
				diagnostics,
			);
		if (schema === 1)
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
					code: "event.document.reference-metadata.missing",
					severity: "warning",
					category: "migration",
					message: "Stable reference metadata is missing",
					fixAvailable: true,
				}),
			);
		return event;
	}
	private restoreLinks(
		event: MeetupEvent,
		sections: Sections,
		repository: string,
	): MeetupEvent {
		// Locations are presentation data. Identity comes from name-bound metadata.
		const hostSources = this.collaborators.participantLinks.readSourceLinks(
			sections.get(HEADINGS.host)?.[0]?.value ?? "",
			repository,
		);
		const speakerSources = this.collaborators.participantLinks.readSourceLinks(
			sections.get(HEADINGS.agenda)?.[0]?.value ?? "",
			repository,
		);
		return {
			...event,
			host: event.host
				? this.collaborators.participantLinks.restoreSourceLocation(
						event.host,
						hostSources,
					)
				: undefined,
			agenda: event.agenda.map((entry) => ({
				...entry,
				speakers: entry.speakers.map((speaker) =>
					this.collaborators.participantLinks.restoreSourceLocation(
						speaker,
						speakerSources,
					),
				),
			})),
		};
	}
}
export type IssueFormReaderArguments =
	ConstructorParameters<typeof IssueFormReader> extends [unknown, ...infer Args]
		? Args
		: never;
