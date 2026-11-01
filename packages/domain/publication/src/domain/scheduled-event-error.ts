export type ScheduledEventFailure =
	| "conflict"
	| "link"
	| "content-review"
	| "approval-pending"
	| "approval-rejected"
	| "approval-unavailable"
	| "authentication"
	| "authentication-captcha-required"
	| "authentication-captcha-unavailable"
	| "authentication-captcha-rejected"
	| "authentication-one-time-code"
	| "authentication-credentials-rejected"
	| "authentication-session-not-reusable"
	| "authentication-login-page-unavailable"
	| "authentication-login-form-unavailable"
	| "authentication-submit-unavailable"
	| "authentication-redirect-timeout"
	| "authentication-account-unavailable"
	| "authentication-account-mismatch"
	| "authentication-unexpected-page"
	| "authentication-rate-limited"
	| "authentication-browser"
	| "authentication-configuration"
	| "unavailable"
	| "editor"
	| "uncertain"
	| "verification";

export class ScheduledEventError extends Error {
	constructor(readonly kind: ScheduledEventFailure) {
		super(`Event publication failed: ${kind}`);
		this.name = "ScheduledEventError";
	}
}
