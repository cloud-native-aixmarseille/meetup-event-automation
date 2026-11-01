import type { MessageId } from "./i18n/catalog.js";

export const AUTHENTICATION_GUIDANCE = [
	[
		"publication.meetup.authentication",
		["Meetup Link", "comment.guidance.meetup.authentication"],
	],
	[
		"publication.meetup.authentication-configuration",
		["Meetup Link", "comment.guidance.meetup.authentication-configuration"],
	],
	[
		"publication.meetup.authentication-captcha-required",
		["Meetup Link", "comment.guidance.meetup.authentication-captcha-required"],
	],
	[
		"publication.meetup.authentication-captcha-rejected",
		["Meetup Link", "comment.guidance.meetup.authentication-captcha-rejected"],
	],
	[
		"publication.meetup.authentication-captcha-unavailable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-captcha-unavailable",
		],
	],
	[
		"publication.meetup.authentication-one-time-code",
		["Meetup Link", "comment.guidance.meetup.authentication-one-time-code"],
	],
	[
		"publication.meetup.authentication-credentials-rejected",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-credentials-rejected",
		],
	],
	[
		"publication.meetup.authentication-session-not-reusable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-session-not-reusable",
		],
	],
	[
		"publication.meetup.authentication-login-page-unavailable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-login-page-unavailable",
		],
	],
	[
		"publication.meetup.authentication-login-form-unavailable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-login-form-unavailable",
		],
	],
	[
		"publication.meetup.authentication-submit-unavailable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-submit-unavailable",
		],
	],
	[
		"publication.meetup.authentication-redirect-timeout",
		["Meetup Link", "comment.guidance.meetup.authentication-redirect-timeout"],
	],
	[
		"publication.meetup.authentication-account-unavailable",
		[
			"Meetup Link",
			"comment.guidance.meetup.authentication-account-unavailable",
		],
	],
	[
		"publication.meetup.authentication-account-mismatch",
		["Meetup Link", "comment.guidance.meetup.authentication-account-mismatch"],
	],
	[
		"publication.meetup.authentication-unexpected-page",
		["Meetup Link", "comment.guidance.meetup.authentication-unexpected-page"],
	],
	[
		"publication.meetup.authentication-rate-limited",
		["Meetup Link", "comment.guidance.meetup.authentication-rate-limited"],
	],
	[
		"publication.meetup.authentication-browser",
		["Meetup Link", "comment.guidance.meetup.authentication-browser"],
	],
] as const satisfies readonly (readonly [
	string,
	readonly [string, MessageId],
])[];
