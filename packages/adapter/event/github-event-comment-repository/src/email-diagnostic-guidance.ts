import type { MessageId } from "./i18n/catalog.js";
export const EMAIL_GUIDANCE = [
	[
		"communication.email-parameters-invalid",
		[
			"Communication",
			"comment.guidance.communication.email-parameters-invalid",
		],
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
] as const satisfies readonly (readonly [
	string,
	readonly [string, Extract<MessageId, `comment.guidance.${string}`>],
])[];
