import type { MessageId } from "./i18n/catalog.js";

export const STAGE_GUIDANCE = [
	[
		"communication.checklist-concurrently-modified",
		["Communication", "comment.guidance.communication.concurrent-checklist"],
	],
	[
		"publication.feedback.conflict",
		["OpenFeedback Link", "comment.guidance.feedback.conflict"],
	],
	[
		"communication.feedback-unavailable",
		["OpenFeedback Link", "comment.guidance.feedback.results"],
	],
	[
		"communication.feedback-fetch-failed",
		["OpenFeedback Link", "comment.guidance.feedback.access"],
	],
	[
		"communication.slides-unavailable",
		["Slides & Content", "comment.guidance.assets.slides"],
	],
	[
		"communication.approval-pending",
		["Communication", "comment.guidance.communication.approval"],
	],
	[
		"communication.approval-rejected",
		["Communication", "comment.guidance.communication.rejected"],
	],
	[
		"communication.approval-unavailable",
		["Communication", "comment.guidance.communication.approval-unavailable"],
	],
	[
		"communication.approval-notification-failed",
		["Communication", "comment.guidance.communication.approval-notification"],
	],
	[
		"communication.gateway-delivery-uncertain",
		["Communication", "comment.guidance.communication.delivery-uncertain"],
	],
	[
		"communication.gateway-threw-ambiguous-error",
		["Communication", "comment.guidance.communication.delivery-uncertain"],
	],
	[
		"communication.ledger-status-write-failed",
		["Communication", "comment.guidance.communication.delivery-uncertain"],
	],
	[
		"communication.gateway-delivery-rejected",
		["Communication", "comment.guidance.communication.delivery-rejected"],
	],
	[
		"communication.gateway-delivery-deferred",
		["Communication", "comment.guidance.communication.delivery-deferred"],
	],
	[
		"communication.invalid-clock",
		["Communication", "comment.guidance.communication.configuration"],
	],
	[
		"communication.invalid-identifier",
		["Communication", "comment.guidance.communication.configuration"],
	],
	[
		"communication.invalid-readiness-window",
		["Communication", "comment.guidance.communication.configuration"],
	],
	[
		"communication.invalid-time-zone",
		["Communication", "comment.guidance.communication.configuration"],
	],
	[
		"communication.github-credential-missing",
		["Communication", "comment.guidance.communication.configuration"],
	],
	[
		"communication.ledger-read-failed",
		["Communication", "comment.guidance.communication.ledger"],
	],
	[
		"communication.ledger-reservation-failed",
		["Communication", "comment.guidance.communication.ledger"],
	],
	[
		"communication.missing-mail-destination",
		["Communication", "comment.guidance.communication.destination"],
	],
	[
		"communication.missing-notification-content",
		["Communication", "comment.guidance.communication.content"],
	],
	[
		"communication.checklist-update-failed",
		["Communication", "comment.guidance.communication.checklist"],
	],
	[
		"communication.event-concurrently-modified",
		["Communication", "comment.guidance.communication.concurrent"],
	],
	[
		"communication.event-references-unresolved",
		["Agenda", "comment.guidance.communication.references"],
	],
	[
		"communication.referential-catalog-invalid",
		["Referentials", "comment.guidance.communication.catalog"],
	],
	[
		"publication.feedback.agenda",
		["Agenda", "comment.guidance.feedback.agenda"],
	],
	[
		"publication.feedback.prerequisites",
		["OpenFeedback Link", "comment.guidance.feedback.prerequisites"],
	],
	[
		"publication.feedback.current-event",
		["OpenFeedback Link", "comment.guidance.feedback.current-event"],
	],
	[
		"publication.feedback.ambiguous-date",
		["OpenFeedback Link", "comment.guidance.feedback.ambiguous-date"],
	],
	[
		"publication.assets.prerequisites",
		["Drive Link", "comment.guidance.assets.prerequisites"],
	],
	[
		"publication.assets.file.drift",
		["Slides & Content", "comment.guidance.assets.drift"],
	],
	[
		"publication.assets.content.contract",
		["Slides & Content", "comment.guidance.assets.template"],
	],
	[
		"publication.assets.content.location",
		["Slides & Content", "comment.guidance.assets.template"],
	],
	[
		"publication.assets.content.missing",
		["Slides & Content", "comment.guidance.assets.missing"],
	],
	[
		"publication.assets.content.conflict",
		["Slides & Content", "comment.guidance.assets.recovery"],
	],
	[
		"publication.assets.content.recovery",
		["Slides & Content", "comment.guidance.assets.recovery"],
	],
	[
		"publication.assets.content.revision",
		["Slides & Content", "comment.guidance.assets.revision"],
	],
	[
		"publication.assets.content.image",
		["Slides & Content", "comment.guidance.assets.image"],
	],
	[
		"publication.assets.content.fallback",
		["Slides & Content", "comment.guidance.assets.fallback"],
	],
	[
		"communication.invalid-event-date",
		["Event Date", "comment.guidance.event.date.invalid"],
	],
	[
		"communication.occurrence-status-unknown",
		["Event Status", "comment.guidance.event.occurrence-status.invalid"],
	],
] as const satisfies readonly (readonly [
	string,
	readonly [string, Extract<MessageId, `comment.guidance.${string}`>],
])[];
