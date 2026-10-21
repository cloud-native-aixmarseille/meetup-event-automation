import type { EventDiagnostic, MeetupEvent } from "@meetup-automation/event";

export type IssueFormBody = Readonly<{
	event_date?: unknown;
	event_title?: unknown;
	hoster?: unknown;
	event_description?: unknown;
	agenda?: unknown;
	meetup_link?: unknown;
	cncf_link?: unknown;
	drive_link?: unknown;
	openfeedback_link?: unknown;
	event_status?: unknown;
}>;

/** Fields decoded from the supported GitHub issue form. */
export type IssueFormEventInput = Readonly<{
	repository: string;
	issueNumber: number;
	issueState?: "open" | "closed";
	issueTitle: string;
	labels?: readonly string[];
	parsedBody: IssueFormBody;
	timeZone?: string;
}>;

export type IssueFormEventResult = Readonly<{
	event: MeetupEvent;
	diagnostics: readonly EventDiagnostic[];
}>;
