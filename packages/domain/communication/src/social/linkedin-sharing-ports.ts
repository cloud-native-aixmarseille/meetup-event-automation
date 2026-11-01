import type { GatewayDispatchResult } from "../model.js";
import type { LinkedInPostReferenceValue } from "./linkedin-post-reference.js";

export interface LinkedInShareRecord extends LinkedInPostReferenceValue {
	readonly status: "pending" | "sent" | "retry";
	readonly attempts: number;
	readonly reservedAt: string;
	readonly retryAt?: string;
}

export interface LinkedInSharingJournal {
	load(id: string): Promise<LinkedInShareRecord | undefined>;
	save(
		previous: LinkedInShareRecord | undefined,
		next: LinkedInShareRecord,
	): Promise<void>;
}

export interface LinkedInSharingNotification {
	send(url: string): Promise<
		Readonly<{
			result: GatewayDispatchResult;
			retryAfterSeconds?: number;
		}>
	>;
}
