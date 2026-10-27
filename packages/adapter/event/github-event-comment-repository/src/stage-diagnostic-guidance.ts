import type { MessageId } from "./i18n/catalog.js";

export const STAGE_GUIDANCE = [
	[
		"publication.meetup.slides-source",
		["Automated slide sharing", "comment.guidance.meetup.slides-source"],
	],
	[
		"publication.meetup.slides-link",
		["Automated slide sharing", "comment.guidance.meetup.slides-link"],
	],
	[
		"publication.meetup.slides-pdf-pending",
		["Automated slide sharing", "comment.guidance.meetup.slides-pdf-pending"],
	],
	[
		"publication.meetup.slides-delivery-recovery",
		[
			"Automated slide sharing",
			"comment.guidance.meetup.slides-delivery-recovery",
		],
	],
	[
		"publication.meetup.slides-form-unavailable",
		[
			"Automated slide sharing",
			"comment.guidance.meetup.slides-form-unavailable",
		],
	],
	[
		"publication.meetup.slides-source-changed",
		[
			"Automated slide sharing",
			"comment.guidance.meetup.slides-source-changed",
		],
	],
	[
		"publication.content.prerequisites",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.pending",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.rejected",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.iteration-requested",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.recovery",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.stale",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.title-review",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.content.description-review",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"publication.meetup.content-review",
		["Event materials", "comment.guidance.content.review"],
	],
	[
		"communication.content-review",
		["Event materials", "comment.guidance.content.review"],
	],

	[
		"publication.assets.pdf.source",
		["Event materials", "comment.guidance.pdf.source"],
	],
	[
		"publication.assets.pdf.source-pending",
		["Event materials", "comment.guidance.pdf.source-pending"],
	],
	[
		"publication.assets.pdf.revision",
		["Event materials", "comment.guidance.pdf.revision"],
	],
	[
		"publication.assets.pdf.conflict",
		["Event materials", "comment.guidance.pdf.recovery"],
	],
	[
		"publication.assets.pdf.recovery",
		["Event materials", "comment.guidance.pdf.recovery"],
	],
	[
		"publication.assets.pdf.limit",
		["Event materials", "comment.guidance.pdf.limit"],
	],
	[
		"publication.assets.pdf.invalid",
		["Event materials", "comment.guidance.pdf.invalid"],
	],
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
		["Event materials", "comment.guidance.assets.slides"],
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
		"communication.invalid-time-zone",
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
		"publication.feedback-link.prerequisites",
		["Meetup issue", "comment.guidance.feedback-link.prerequisites"],
	],
	[
		"publication.feedback-link.ambiguous-date",
		["Meetup issue", "comment.guidance.feedback-link.ambiguous-date"],
	],
	[
		"publication.assets.prerequisites",
		["Drive Link", "comment.guidance.assets.prerequisites"],
	],
	[
		"publication.assets.file.drift",
		["Event materials", "comment.guidance.assets.drift"],
	],
	[
		"publication.assets.content.contract",
		["Event materials", "comment.guidance.assets.template"],
	],
	[
		"publication.assets.content.location",
		["Event materials", "comment.guidance.assets.template"],
	],
	[
		"publication.assets.content.missing",
		["Event materials", "comment.guidance.assets.missing"],
	],
	[
		"publication.assets.content.conflict",
		["Event materials", "comment.guidance.assets.recovery"],
	],
	[
		"publication.assets.content.recovery",
		["Event materials", "comment.guidance.assets.recovery"],
	],
	[
		"publication.assets.content.revision",
		["Event materials", "comment.guidance.assets.revision"],
	],
	[
		"publication.assets.content.image",
		["Event materials", "comment.guidance.assets.image"],
	],
	[
		"publication.assets.content.fallback",
		["Event materials", "comment.guidance.assets.fallback"],
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
