import {
	EVENT_SCHEMA_VERSION,
	type EventDiagnostic,
	EventDiagnostics,
	EventOccurrenceParser,
	type MeetupEvent,
	OCCURRENCE_STATUS_LABELS,
	OCCURRENCE_STATUSES,
	type OccurrenceStatus,
} from "@meetup-automation/event";
import type {
	IssueFormEventInput,
	IssueFormEventResult,
} from "./issue-form-event-input.js";
import { IssueFormFields } from "./issue-form-fields.js";

export class IssueFormEventMapper {
	static map(dto: IssueFormEventInput): IssueFormEventResult {
		const diagnostics: EventDiagnostic[] = [];
		const body = dto.parsedBody;

		const { eventTitle, date, description, host, agenda, occurrenceStatus } =
			IssueFormEventMapper.fields(dto, diagnostics);

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
			publicationLinks: IssueFormEventMapper.publicationLinks(
				body,
				diagnostics,
			),
			occurrenceStatus,
			timeZone: dto.timeZone ?? "Europe/Paris",
			confirmations: {
				host: dto.labels?.includes("hoster:confirmed") ?? false,
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
			EventDiagnostics.diagnostic({
				code: "event.document.legacy-schema",
				severity: "info",
				category: "migration",
				message: "The legacy event document was migrated to schema version 1",
				fixAvailable: true,
			}),
		);

		return { event, diagnostics };
	}

	private static publicationLinks(
		body: IssueFormEventInput["parsedBody"],
		diagnostics: EventDiagnostic[],
	) {
		return {
			meetup: IssueFormFields.readOptionalString(
				body.meetup_link,
				"meetup_link",
				diagnostics,
			),
			community: IssueFormFields.readOptionalString(
				body.cncf_link,
				"cncf_link",
				diagnostics,
			),
			feedback: IssueFormFields.readOptionalString(
				body.openfeedback_link,
				"openfeedback_link",
				diagnostics,
			),
			assets: IssueFormFields.readOptionalString(
				body.drive_link,
				"drive_link",
				diagnostics,
			),
		};
	}
	private static fields(
		dto: IssueFormEventInput,
		diagnostics: EventDiagnostic[],
	) {
		const body = dto.parsedBody;
		const eventTitle = IssueFormFields.readString(
			body.event_title,
			"event_title",
			diagnostics,
		);
		const date = IssueFormFields.readString(
			body.event_date,
			"event_date",
			diagnostics,
		);
		const description = IssueFormFields.readString(
			body.event_description,
			"event_description",
			diagnostics,
		);
		const host = IssueFormFields.readHost(body.hoster, diagnostics);
		const agenda = IssueFormFields.readAgenda(body.agenda, diagnostics);
		const occurrenceStatus = EventOccurrenceParser.readOccurrenceStatus(
			dto.labels ?? [],
			dto.issueState ?? "open",
			IssueFormEventMapper.occurrenceField(dto, diagnostics),
			diagnostics,
		);
		return { eventTitle, date, description, host, agenda, occurrenceStatus };
	}

	private static occurrenceField(
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
			EventDiagnostics.diagnostic({
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
