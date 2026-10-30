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
export const CHECKLIST_LABELS = new Map([
	["Mail introduction speakers", "Send speaker introduction emails"],
	["Mail introduction hoster", "Send host introduction email"],
	["Slack - AixMarseille.Tech", "Announce on Slack - AixMarseille.Tech"],
	["Slack - OpenBaR", "Announce on Slack - OpenBaR"],
	["LinkedIn", "Announce on LinkedIn"],
	["Mail thanks hoster", "Send host thank-you email"],
	["Mail thanks speakers", "Send speaker thank-you emails"],
	["Share slides to meetup", "Send slides to Meetup attendees"],
	["Sync attendees from tally sheet to CNCF", "Import attendees into CNCF"],
	["Social networks", "Share recap on LinkedIn"],
]);

export const AUTOMATED_TASK_HEADINGS = new Map([
	["Mail introduction speakers", HEADINGS.introductionEmails],
	["Mail introduction hoster", HEADINGS.introductionEmails],
	["Mail thanks hoster", HEADINGS.thankYouEmails],
	["Mail thanks speakers", HEADINGS.thankYouEmails],
	["Share slides to meetup", HEADINGS.slidesDelivery],
]);

export interface GitHubIssueFormEventDocumentCodecOptions {
	/** Consumer checkout revision used for catalog navigation links. */
	readonly repositoryRef?: string;
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

export type ManagedMarkerMatch = Readonly<{
	start: number;
	end: number;
	value: string;
}>;
