import type {
	AttentionApproval,
	AttentionMessageReference,
	AttentionPostResult,
	AttentionRecoveryItem,
	AttentionState,
	AttentionView,
} from "./model.js";
export interface AttentionRepository {
	load(): Promise<AttentionState | undefined>;
	/** Must persist before dispatch; refuse stale or untrusted snapshots. */
	save(state: AttentionState): Promise<void>;
}
export interface AttentionNotification {
	fingerprint(view: AttentionView): string;
	post(view: AttentionView): Promise<AttentionPostResult>;
	update(
		message: AttentionMessageReference,
		view: AttentionView,
	): Promise<boolean>;
}
export interface AttentionApprovalSource {
	/** Finalizes verified organizer choices before returning their current state. */
	synchronizeApprovals(): Promise<readonly AttentionApproval[]>;
}
export interface AttentionRecoverySource {
	readAttention(): Promise<readonly AttentionRecoveryItem[]>;
}
