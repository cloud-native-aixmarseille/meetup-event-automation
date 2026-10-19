import type { CommunicationClock } from "../ports.js";
import { AttentionEpisodes } from "./attention-episodes.js";
import { AttentionPolicy } from "./attention-policy.js";
import type { AttentionObservation, AttentionState } from "./model.js";
import type { AttentionNotification, AttentionRepository } from "./ports.js";
export interface AttentionResult {
	readonly active: number;
	readonly posted: boolean;
	readonly notificationFailed: boolean;
}
/** The official repository/issue lock serializes every invocation. */
export class ReconcileAttention {
	constructor(
		private readonly repository: AttentionRepository,
		private readonly notification: AttentionNotification,
		private readonly clock: CommunicationClock,
	) {}
	async execute(observation: AttentionObservation): Promise<AttentionResult> {
		const now = this.clock.now();
		const day = AttentionPolicy.day(now);
		const previous = await this.repository.load();
		const state = AttentionEpisodes.reconcile(previous, observation, now);
		// A failed write stops here, before any outbound Slack operation.
		await this.repository.save(state);
		const view = AttentionPolicy.view(state);
		const base = {
			active: view.conditions.length,
			posted: false,
			notificationFailed: false,
		};
		if (state.post?.status === "pending")
			return { ...base, notificationFailed: true };
		const due = AttentionEpisodes.due(state, now);
		if (
			state.post?.status === "retry" &&
			Date.parse(state.post.retryAt ?? "") > now.getTime()
		)
			return { ...base, notificationFailed: true };
		if (
			(due.length && state.post?.day !== day) ||
			(due.length && state.post?.status === "retry")
		)
			return this.post(state, now);
		return this.update(state, now);
	}
	private async update(
		state: AttentionState,
		now: Date,
	): Promise<AttentionResult> {
		const view = AttentionPolicy.view(state);
		const base = {
			active: view.conditions.length,
			posted: false,
			notificationFailed: false,
		};
		if (!state.post?.message) return base;
		const fingerprint = this.notification.fingerprint(view);
		if (fingerprint !== state.post.fingerprint) {
			if (!(await this.notification.update(state.post.message, view)))
				return { ...base, notificationFailed: true };
			state.post.fingerprint = fingerprint;
		}
		if (state.post.day === AttentionPolicy.day(now))
			AttentionEpisodes.acknowledge(state, now);
		await this.repository.save(state);
		return base;
	}

	private async post(
		state: AttentionState,
		now: Date,
	): Promise<AttentionResult> {
		const day = AttentionPolicy.day(now);
		state.post = {
			reservationId: `attention:${day}:${now.getTime()}`,
			day,
			reservedAt: now.toISOString(),
			status: "pending",
		};
		await this.repository.save(state);
		const view = AttentionPolicy.view(state);
		let result: Awaited<ReturnType<AttentionNotification["post"]>>;
		try {
			result = await this.notification.post(view);
		} catch {
			result = { outcome: "uncertain" };
		}
		if (result.outcome === "accepted") {
			state.post.status = "accepted";
			state.post.message = result.message;
			state.post.fingerprint = this.notification.fingerprint(view);
			AttentionEpisodes.acknowledge(state, now);
		} else if (result.outcome === "retry") {
			state.post.status = "retry";
			const delay = Math.max(300, result.retryAfterSeconds ?? 300);
			state.post.retryAt = new Date(now.getTime() + delay * 1000).toISOString();
		}
		await this.repository.save(state);
		return {
			active: view.conditions.length,
			posted: result.outcome === "accepted",
			notificationFailed: result.outcome !== "accepted",
		};
	}
}
