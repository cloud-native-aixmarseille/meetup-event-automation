export const ATTENTION_CODES = [
	"missing-date",
	"required-data",
	"host-confirmation",
	"speaker-confirmation",
	"manual-publication",
	"approval-pending",
	"integration-failure",
	"delivery-recovery",
	"occurrence-decision",
	"follow-up",
	"stage-unknown",
] as const;
export type AttentionCode = (typeof ATTENTION_CODES)[number];
export type AttentionOwner =
	| "event"
	| "assets"
	| "feedback"
	| "communications"
	| "content"
	| "approvals"
	| "delivery";
type AttentionPolicy =
	| "preparation"
	| "daily"
	| "weekly"
	| "approval"
	| "occurrence"
	| "follow-up"
	| "none";
export interface AttentionCondition {
	readonly key: string;
	readonly code: AttentionCode;
	readonly owner: AttentionOwner;
	readonly resource: string;
	readonly severity: "warning" | "error";
	readonly policy: AttentionPolicy;
	readonly since?: string;
	readonly commentId?: number;
	/** Only unresolved external delivery survives closure or cancellation. */
	readonly recovery?: boolean;
}
export interface AttentionObservation {
	readonly commentId?: number;
	readonly conditions: readonly AttentionCondition[];
	readonly evaluated: readonly AttentionOwner[];
	/** Explicitly verified outcomes; missing evidence never clears uncertainty. */
	readonly verifiedRecovery?: readonly string[];
	readonly eventDate: string;
	readonly stopped: boolean;
	readonly runId?: string;
}
export interface AttentionEpisode {
	condition: AttentionCondition;
	episode: number;
	openedAt: string;
	status: "active" | "unknown" | "resolved" | "stopped";
	lastWindow?: string;
}
export interface AttentionMessageReference {
	readonly destination: string;
	readonly messageId: string;
}
interface AttentionPost {
	readonly reservationId: string;
	readonly day: number;
	readonly reservedAt: string;
	status: "pending" | "accepted" | "retry";
	retryAt?: string;
	message?: AttentionMessageReference;
	fingerprint?: string;
}
export interface AttentionState {
	commentId?: number;
	eventDate: string;
	stopped: boolean;
	episodes: AttentionEpisode[];
	post?: AttentionPost;
	runId?: string;
}
export interface AttentionView {
	readonly state: AttentionState;
	readonly conditions: readonly AttentionEpisode[];
}
export type AttentionPostResult =
	| {
			readonly outcome: "accepted";
			readonly message: AttentionMessageReference;
	  }
	| { readonly outcome: "uncertain" }
	| { readonly outcome: "retry"; readonly retryAfterSeconds?: number };
export interface AttentionApproval {
	readonly revision: string;
	readonly requestedAt: string;
	readonly commentId: number;
	readonly kind:
		| "email-introduction"
		| "email-thanks"
		| "meetup-publication"
		| "content-review";
	readonly eventDate: string;
	readonly status: "pending" | "approved" | "rejected" | "iteration-requested";
}
export interface AttentionRecoveryItem {
	readonly uncertain?: boolean;
	readonly resolved?: boolean;
	readonly key: string;
	readonly commentId?: number;
}
