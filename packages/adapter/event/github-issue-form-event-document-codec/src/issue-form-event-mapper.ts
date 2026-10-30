import {
	EVENT_SCHEMA_VERSION,
	type EventDiagnostic,
	type EventDiagnostics,
	type EventOccurrenceParser,
	type MeetupEvent,
	OCCURRENCE_STATUS_LABELS,
	OCCURRENCE_STATUSES,
	type OccurrenceStatus,
} from "@meetup-automation/event";
import type {
	IssueFormEventInput,
	IssueFormEventResult,
} from "./issue-form-event-input.js";
import type { IssueFormFields } from "./issue-form-fields.js";

export interface IssueFormEventMapperCollaborators {
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly issueFormFields: Pick<
		IssueFormFields,
		"readOptionalString" | "readString" | "readHost" | "readAgenda"
	>;
	readonly eventOccurrenceParser: Pick<
		EventOccurrenceParser,
		"readOccurrenceStatus"
	>;
}

export class IssueFormEventMapper {
	constructor(
		private readonly collaborators: IssueFormEventMapperCollaborators,
	) {}

	map(dto: IssueFormEventInput): IssueFormEventResult {
		const diagnostics: EventDiagnostic[] = [];
		const body = dto.parsedBody;

		const { eventTitle, date, description, host, agenda, occurrenceStatus } =
			this.fields(dto, diagnostics);

		const event: MeetupEvent = {
			schemaVersion: EVENT_SCHEMA_VERSION,
			identity: {
				repository: dto.repository,
				issueNumber: dto.issueNumber,
			},
			issueState: dto.issueState ?? "open",
			issueTitle: dto.issueTitle,
			labels: [...(dto.labels ?? [])],
			eventTitle,
			date,
			description,
			host,
			agenda,
			publicationLinks: this.publicationLinks(body, diagnostics),
			occurrenceStatus,
			timeZone: dto.timeZone ?? "Europe/Paris",
			confirmations: {
				speakers: dto.labels?.includes("speakers:confirmed") ?? false,
			},
			logistics: {
				aperitif: "unspecified",
				postEventVenue: "unspecified",
			},
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: [],
			},
			// Only named checklist evidence can prove follow-up completion.
			followUpComplete: false,
		};

		diagnostics.unshift(
			this.collaborators.eventDiagnostics.diagnostic({
				code: "event.document.legacy-schema",
				severity: "info",
				category: "migration",
				message: "The legacy event document was migrated to schema version 1",
				fixAvailable: true,
			}),
		);

		return { event, diagnostics };
	}

	private publicationLinks(
		body: IssueFormEventInput["parsedBody"],
		diagnostics: EventDiagnostic[],
	) {
		return {
			meetup: this.collaborators.issueFormFields.readOptionalString(
				body.meetup_link,
				"meetup_link",
				diagnostics,
			),
			community: this.collaborators.issueFormFields.readOptionalString(
				body.cncf_link,
				"cncf_link",
				diagnostics,
			),
			feedback: this.collaborators.issueFormFields.readOptionalString(
				body.openfeedback_link,
				"openfeedback_link",
				diagnostics,
			),
			assets: this.collaborators.issueFormFields.readOptionalString(
				body.drive_link,
				"drive_link",
				diagnostics,
			),
		};
	}
	private fields(dto: IssueFormEventInput, diagnostics: EventDiagnostic[]) {
		const body = dto.parsedBody;
		const eventTitle = this.collaborators.issueFormFields.readString(
			body.event_title,
			"event_title",
			diagnostics,
		);
		const date = this.collaborators.issueFormFields.readString(
			body.event_date,
			"event_date",
			diagnostics,
		);
		const description = this.collaborators.issueFormFields.readString(
			body.event_description,
			"event_description",
			diagnostics,
		);
		const host = this.collaborators.issueFormFields.readHost(
			body.hoster,
			diagnostics,
		);
		const agenda = this.collaborators.issueFormFields.readAgenda(
			body.agenda,
			diagnostics,
		);
		const occurrenceStatus =
			this.collaborators.eventOccurrenceParser.readOccurrenceStatus(
				dto.labels ?? [],
				dto.issueState ?? "open",
				this.occurrenceField(dto, diagnostics),
				diagnostics,
			);
		return { eventTitle, date, description, host, agenda, occurrenceStatus };
	}

	private occurrenceField(
		dto: IssueFormEventInput,
		diagnostics: EventDiagnostic[],
	): OccurrenceStatus | undefined {
		// Operational labels take precedence; an unused form field cannot invalidate them.
		if (
			OCCURRENCE_STATUSES.some((status) => {
				const label = OCCURRENCE_STATUS_LABELS[status];
				return label !== null && dto.labels?.includes(label);
			})
		)
			return undefined;
		const value = dto.parsedBody.event_status;
		if (value === undefined || value === null || value === "") return undefined;
		const status = OCCURRENCE_STATUSES.find((candidate) => candidate === value);
		if (status) return status;
		diagnostics.push(
			this.collaborators.eventDiagnostics.diagnostic({
				code: "event.occurrence-status.invalid",
				severity: "error",
				category: "invalid",
				field: "event_status",
				message:
					"Occurrence status must be scheduled, postponed, held, or cancelled",
			}),
		);
		return undefined;
	}
}
