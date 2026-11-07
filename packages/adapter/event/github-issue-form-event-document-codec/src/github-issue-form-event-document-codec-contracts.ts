import { EVENT_TASK_NAMES } from "@meetup-automation/event";

export const CURRENT_SCHEMA_MARKER = "<!-- meetup-event-schema:1 -->";

export const SCHEMA_MARKER_NAME = "meetup-event-schema";

export const REFERENCE_MARKER_NAME = "meetup-event-references";

export const STABLE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

export const HEADINGS = Object.freeze({
	eventTitle: "Event Title",
	date: "Event Date",
	host: "Hoster",
	description: "Event Description",
	agenda: "Agenda",
	proposals: "Conference Hall proposals",
	meetupLink: "Meetup Link",
	communityLink: "CNCF Link",
	assetsLink: "Drive Link",
	feedbackLink: "OpenFeedback Link",
	slidesPdf: "Slides PDF",
	slides: "Event materials",
	communication: "Communication",
	introductionEmails: "Automated introduction emails",
	aperitif: "Aperitif",
	restaurant: "Restaurant / Bar",
	postEvent: "Post event",
	thankYouEmails: "Automated thank-you emails",
	slidesDelivery: "Automated slide sharing",
	occurrenceStatus: "Event Status",
});

/** Public form labels mapped to stable operational task names at the codec boundary. */
export const CHECKLIST_LABELS = new Map<string, string>([
	[EVENT_TASK_NAMES.introduceSpeakers, "Send speaker introduction emails"],
	[EVENT_TASK_NAMES.introduceHost, "Send host introduction email"],
	[
		EVENT_TASK_NAMES.announceSlackAixMarseilleTech,
		"Announce on Slack - AixMarseille.Tech",
	],
	[EVENT_TASK_NAMES.announceSlackOpenBar, "Announce on Slack - OpenBaR"],
	[EVENT_TASK_NAMES.announceLinkedIn, "Announce on LinkedIn"],
	[EVENT_TASK_NAMES.thankHost, "Send host thank-you email"],
	[EVENT_TASK_NAMES.thankSpeakers, "Send speaker thank-you emails"],
	[EVENT_TASK_NAMES.shareSlides, "Send slides to Meetup attendees"],
	[EVENT_TASK_NAMES.importAttendance, "Import attendees into CNCF"],
	[EVENT_TASK_NAMES.shareOnSocialNetworks, "Share recap on LinkedIn"],
]);

export const AUTOMATED_TASK_HEADINGS = new Map<string, string>([
	[EVENT_TASK_NAMES.introduceSpeakers, HEADINGS.introductionEmails],
	[EVENT_TASK_NAMES.introduceHost, HEADINGS.introductionEmails],
	[EVENT_TASK_NAMES.thankHost, HEADINGS.thankYouEmails],
	[EVENT_TASK_NAMES.thankSpeakers, HEADINGS.thankYouEmails],
	[EVENT_TASK_NAMES.shareSlides, HEADINGS.slidesDelivery],
]);

export interface GitHubIssueFormEventDocumentCodecOptions {
	/** Consumer checkout revision used for catalog navigation links. */
	readonly repositoryRef?: string;
	/** Organizer event URL used when converting selected proposal numbers into links. */
	readonly conferenceHallEventUrl?: string;
	readonly timeZone?: string;
	readonly speakersConfirmationLabel?: string;
}

export type LegacyReferenceMetadata = Readonly<{
	hostId: string | null;
	agendaSpeakerIds: readonly (readonly (string | null)[])[];
}>;

export type StableReferenceBinding = Readonly<{
	id: string;
	displayName: string;
}>;

export type StableReferenceMetadata = Readonly<{
	schemaVersion: 2;
	host: StableReferenceBinding | null;
	speakers: readonly StableReferenceBinding[];
}>;

export type ParsedReferenceMetadata =
	| Readonly<{ kind: "bound"; value: StableReferenceMetadata }>
	| Readonly<{ kind: "legacy"; value: LegacyReferenceMetadata }>;

export type Section = Readonly<{
	heading: string;
	headingStart: number;
	contentStart: number;
	contentEnd: number;
	value: string;
}>;

export type Checkbox = Readonly<{
	checked: boolean;
	label: string;
}>;

/** Plain-text completion marker without a clickable checkbox. */
export const COMPLETION_MARKER = "✅";

/** Issue representation only; delivery records own duplicate prevention. */
export const CHECKMARK_TASK_NAMES: ReadonlySet<string> = new Set([
	EVENT_TASK_NAMES.introduceHost,
	EVENT_TASK_NAMES.introduceSpeakers,
	EVENT_TASK_NAMES.thankHost,
	EVENT_TASK_NAMES.thankSpeakers,
	EVENT_TASK_NAMES.shareSlides,
	EVENT_TASK_NAMES.publishMeetup,
	EVENT_TASK_NAMES.announceSlackAixMarseilleTech,
	EVENT_TASK_NAMES.announceSlackOpenBar,
	EVENT_TASK_NAMES.announceLinkedIn,
]);

export type Completion = Readonly<{
	label: string;
}>;

export type ManagedMarkerMatch = Readonly<{
	start: number;
	end: number;
	value: string;
}>;
