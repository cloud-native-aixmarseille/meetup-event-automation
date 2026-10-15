import type { AttentionMessageReference, AttentionState } from "./model.js";
export interface AttentionPostRecovery {
	readonly reservationId: string;
	readonly outcome: "accepted" | "not-accepted";
	readonly message?: AttentionMessageReference;
}
export class RecoverAttentionPost {
	static apply(
		state: AttentionState | undefined,
		recovery: AttentionPostRecovery,
		now: Date,
	): void {
		if (
			!state?.post ||
			state.post.reservationId !== recovery.reservationId ||
			state.post.status !== "pending"
		)
			throw new Error(
				"Recovery requires the current pending attention reservation",
			);
		if (recovery.outcome === "accepted") {
			if (
				!recovery.message ||
				!/^[CG][A-Z0-9]+$/.test(recovery.message.destination) ||
				!/^\d+\.\d+$/.test(recovery.message.messageId)
			)
				throw new Error("Recovery requires a verified Slack message reference");
			state.post.status = "accepted";
			state.post.message = { ...recovery.message };
			state.post.fingerprint = undefined;
		} else if (recovery.outcome === "not-accepted") {
			state.post.status = "retry";
			state.post.retryAt = now.toISOString();
		} else throw new Error("Invalid attention recovery outcome");
	}
}
