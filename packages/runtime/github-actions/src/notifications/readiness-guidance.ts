import type { MessageId } from "./catalog.js";

export type ReadinessGuidanceId = Extract<
	MessageId,
	`communication.reason.${string}`
>;

export const READINESS_GUIDANCE = new Map<string, ReadinessGuidanceId>([
	["event.confirmation.host.missing", "communication.reason.host-confirmation"],
	[
		"event.confirmation.speakers.missing",
		"communication.reason.speaker-confirmation",
	],
	["event.title.missing", "communication.reason.title"],
	["event.date.missing", "communication.reason.date"],
	["event.date.invalid", "communication.reason.date"],
	["event.description.missing", "communication.reason.description"],
	["event.hoster.missing", "communication.reason.host"],
	["event.hoster.invalid", "communication.reason.host"],
	["event.hoster.multiple", "communication.reason.host"],
	["event.agenda.missing", "communication.reason.agenda"],
	["event.agenda.legacy-line-invalid", "communication.reason.agenda"],
	["event.agenda.speaker.missing", "communication.reason.agenda-speaker"],
	["event.agenda.speaker.invalid", "communication.reason.agenda-speaker"],
	[
		"event.agenda.description.missing",
		"communication.reason.agenda-description",
	],
	["publication.meetup.missing", "communication.reason.meetup-link"],
	["event.link.meetup.invalid", "communication.reason.meetup-link"],
	["publication.meetup-url.invalid", "communication.reason.meetup-link"],
	["publication.community.missing", "communication.reason.community-link"],
	["event.link.community.invalid", "communication.reason.community-link"],
	["publication.community-url.invalid", "communication.reason.community-link"],
	["publication.assets.missing", "communication.reason.assets-link"],
	["event.link.assets.invalid", "communication.reason.assets-link"],
	["publication.asset-url.invalid", "communication.reason.assets-link"],
	["event.link.feedback.invalid", "communication.reason.feedback-link"],
]);
