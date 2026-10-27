import type {
	LinkedInSocialDestination,
	SocialDestination,
} from "./social-destination.js";
import type { SocialPostMilestone } from "./social-post-draft.js";

export type SocialPostReceipt =
	| Readonly<{
			provider: "slack";
			workspaceId: string;
			channelId: string;
			ts: string;
			url?: string;
	  }>
	| Readonly<{
			provider: "linkedin";
			organizationUrn: string;
			postUrn: string;
			url?: string;
	  }>;

export interface SocialPreparedMedia {
	readonly assetUrn: string;
	readonly fingerprint: string;
	readonly description: string;
}

export type SocialDispatchResult =
	| Readonly<{ status: "accepted"; receipt: SocialPostReceipt }>
	| Readonly<{
			status: "rejected" | "deferred" | "uncertain";
			code: string;
			retryAfterSeconds?: number;
	  }>;

export interface SocialPostInput {
	readonly destination: SocialDestination;
	readonly text: string;
	readonly media?: SocialPreparedMedia;
}

export interface SocialPublicationGateway {
	publish(
		input: SocialPostInput,
		beforeWrite: () => Promise<void>,
	): Promise<SocialDispatchResult>;
}

export interface SocialImageInput {
	readonly destination: LinkedInSocialDestination;
	readonly bytes: Uint8Array;
	readonly mimeType: string;
	readonly fingerprint: string;
	readonly description: string;
}

export type SocialMediaResult =
	| Readonly<{ status: "ready"; media: SocialPreparedMedia }>
	| Readonly<{
			status: "rejected" | "deferred" | "uncertain";
			code: string;
			retryAfterSeconds?: number;
	  }>;

export interface SocialImageGateway {
	prepare(
		input: SocialImageInput,
		beforeWrite: () => Promise<void>,
		record: (media: SocialPreparedMedia) => Promise<void>,
	): Promise<SocialMediaResult>;
}

export interface SocialDeliveryRecovery {
	readonly actor: string;
	readonly decidedAt: string;
	readonly outcome: "published" | "not-published";
	readonly reference: string;
}

export interface SocialDeliveryAttempt {
	readonly id: string;
	readonly revision: string;
	readonly reservedAt: string;
	readonly status:
		| "reserved"
		| "prepared"
		| "accepted"
		| "rejected"
		| "deferred"
		| "uncertain"
		| "stale";
	readonly media?: SocialPreparedMedia;
	readonly receipt?: SocialPostReceipt;
	readonly code?: string;
	readonly retryAt?: string;
	readonly recovery?: SocialDeliveryRecovery;
}

export interface SocialDeliveryRecord {
	readonly manual?: Readonly<{ recordedAt: string; reference: string }>;
	readonly intentId: string;
	readonly occurrence: string;
	readonly purpose: SocialPostMilestone;
	readonly destination: SocialDestination;
	readonly attempts: readonly SocialDeliveryAttempt[];
}

export interface SocialDeliveryJournal {
	load(intentId: string): Promise<SocialDeliveryRecord | undefined>;
	save(
		previous: SocialDeliveryRecord | undefined,
		next: SocialDeliveryRecord,
	): Promise<void>;
}
