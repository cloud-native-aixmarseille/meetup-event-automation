import {
	ATTENTION_CODES,
	type AttentionCondition,
	type AttentionEpisode,
	type AttentionState,
	type AttentionStateRules,
} from "@meetup-automation/communication";
import type { AttentionRecordFields as Fields } from "./attention-record-fields.js";
export const ATTENTION_MARKER = "<!-- meetup-organizer-attention:v1 ";
/** Reads and writes one external metadata format; invariants remain domain-owned. */
export interface AttentionRecordCollaborators {
	readonly attentionRecordFields: Fields;
	readonly attentionStateRules: Pick<AttentionStateRules, "validate">;
}

export class AttentionRecord {
	constructor(private readonly collaborators: AttentionRecordCollaborators) {}

	read(body: string): AttentionState {
		const lines = body
			.split("\n")
			.filter((line) => line.startsWith(ATTENTION_MARKER));
		const line = lines[0];
		if (lines.length !== 1 || !line?.endsWith(" -->"))
			throw new Error("Invalid attention record");
		const input: unknown = JSON.parse(line.slice(ATTENTION_MARKER.length, -4));
		return this.decode(input);
	}
	marker(state: AttentionState): string {
		const safe = this.decode({ ...state, version: 1 });
		return `${ATTENTION_MARKER}${JSON.stringify({ version: 1, ...safe })} -->`;
	}
	private decode(input: unknown): AttentionState {
		const data = this.collaborators.attentionRecordFields.record(input);
		if (!Array.isArray(data.episodes) || data.episodes.length > 300)
			throw new Error("Invalid attention episodes");
		this.collaborators.attentionRecordFields.choice(data.version, [1]);
		const state: AttentionState = {
			eventDate: this.collaborators.attentionRecordFields.text(
				data.eventDate,
				/^(?:\d{4}-\d{2}-\d{2})?$/,
			),
			stopped: this.collaborators.attentionRecordFields.choice(data.stopped, [
				true,
				false,
			]),
			episodes: data.episodes.map(this.episode.bind(this)),
			post: data.post === undefined ? undefined : this.post(data.post),
			runId:
				data.runId === undefined
					? undefined
					: this.collaborators.attentionRecordFields.text(data.runId, /^\d+$/),
			commentId:
				data.commentId === undefined
					? undefined
					: this.collaborators.attentionRecordFields.integer(
							data.commentId,
							true,
						),
		};
		this.collaborators.attentionStateRules.validate(state);
		return state;
	}
	private episode(input: unknown): AttentionEpisode {
		const data = this.collaborators.attentionRecordFields.record(input);
		return {
			condition: this.condition(data.condition),
			episode: this.collaborators.attentionRecordFields.integer(
				data.episode,
				true,
			),
			openedAt: this.collaborators.attentionRecordFields.instant(data.openedAt),
			status: this.collaborators.attentionRecordFields.choice(data.status, [
				"active",
				"unknown",
				"resolved",
				"stopped",
			]),
			lastWindow:
				data.lastWindow === undefined
					? undefined
					: this.collaborators.attentionRecordFields.text(
							data.lastWindow,
							/^(?:day|week|preparation|occurrence|follow-up):-?\d+$/,
						),
		};
	}
	private condition(input: unknown): AttentionCondition {
		const data = this.collaborators.attentionRecordFields.record(input);
		return {
			key: this.collaborators.attentionRecordFields.text(
				data.key,
				/^[a-z0-9:-]{1,180}$/,
			),
			code: this.collaborators.attentionRecordFields.choice(
				data.code,
				ATTENTION_CODES,
			),
			owner: this.collaborators.attentionRecordFields.choice(data.owner, [
				"event",
				"assets",
				"feedback",
				"communications",
				"social",
				"content",
				"approvals",
				"delivery",
			]),
			resource: this.collaborators.attentionRecordFields.text(
				data.resource,
				/^[a-z0-9:-]{1,128}$/,
			),
			severity: this.collaborators.attentionRecordFields.choice(data.severity, [
				"warning",
				"error",
			]),
			policy: this.collaborators.attentionRecordFields.choice(data.policy, [
				"preparation",
				"daily",
				"weekly",
				"approval",
				"occurrence",
				"follow-up",
				"none",
			]),
			since:
				data.since === undefined
					? undefined
					: this.collaborators.attentionRecordFields.instant(data.since),
			commentId:
				data.commentId === undefined
					? undefined
					: this.collaborators.attentionRecordFields.integer(
							data.commentId,
							true,
						),
			recovery:
				data.recovery === undefined
					? undefined
					: this.collaborators.attentionRecordFields.choice(data.recovery, [
							true,
						]),
		};
	}
	private post(input: unknown): NonNullable<AttentionState["post"]> {
		const data = this.collaborators.attentionRecordFields.record(input);
		return {
			reservationId: this.collaborators.attentionRecordFields.text(
				data.reservationId,
				/^attention:\d+:\d+$/,
			),
			day: this.collaborators.attentionRecordFields.integer(data.day),
			reservedAt: this.collaborators.attentionRecordFields.instant(
				data.reservedAt,
			),
			status: this.collaborators.attentionRecordFields.choice(data.status, [
				"pending",
				"accepted",
				"retry",
			]),
			retryAt:
				data.retryAt === undefined
					? undefined
					: this.collaborators.attentionRecordFields.instant(data.retryAt),
			fingerprint:
				data.fingerprint === undefined
					? undefined
					: this.collaborators.attentionRecordFields.text(
							data.fingerprint,
							/^[a-f0-9]{64}$/,
						),
			message:
				data.message === undefined ? undefined : this.message(data.message),
		};
	}
	private message(
		input: unknown,
	): NonNullable<NonNullable<AttentionState["post"]>["message"]> {
		const data = this.collaborators.attentionRecordFields.record(input);
		return {
			destination: this.collaborators.attentionRecordFields.text(
				data.destination,
				/^[a-zA-Z0-9._:-]{1,128}$/,
			),
			messageId: this.collaborators.attentionRecordFields.text(
				data.messageId,
				/^[a-zA-Z0-9._:-]{1,128}$/,
			),
		};
	}
}
