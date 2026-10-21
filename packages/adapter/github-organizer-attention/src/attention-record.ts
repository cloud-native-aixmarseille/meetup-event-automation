import {
	ATTENTION_CODES,
	type AttentionCondition,
	type AttentionEpisode,
	type AttentionState,
	AttentionStateRules,
} from "@meetup-automation/communication";
import { AttentionRecordFields as Fields } from "./attention-record-fields.js";
export const ATTENTION_MARKER = "<!-- meetup-organizer-attention:v1 ";
/** Reads and writes one external metadata format; invariants remain domain-owned. */
export class AttentionRecord {
	static read(body: string): AttentionState {
		const lines = body
			.split("\n")
			.filter((line) => line.startsWith(ATTENTION_MARKER));
		const line = lines[0];
		if (lines.length !== 1 || !line?.endsWith(" -->"))
			throw new Error("Invalid attention record");
		const input: unknown = JSON.parse(line.slice(ATTENTION_MARKER.length, -4));
		return AttentionRecord.decode(input);
	}
	static marker(state: AttentionState): string {
		const safe = AttentionRecord.decode({ ...state, version: 1 });
		return `${ATTENTION_MARKER}${JSON.stringify({ version: 1, ...safe })} -->`;
	}
	private static decode(input: unknown): AttentionState {
		const data = Fields.record(input);
		if (!Array.isArray(data.episodes) || data.episodes.length > 300)
			throw new Error("Invalid attention episodes");
		Fields.choice(data.version, [1]);
		const state: AttentionState = {
			eventDate: Fields.text(data.eventDate, /^(?:\d{4}-\d{2}-\d{2})?$/),
			stopped: Fields.choice(data.stopped, [true, false]),
			episodes: data.episodes.map(AttentionRecord.episode),
			post:
				data.post === undefined ? undefined : AttentionRecord.post(data.post),
			runId:
				data.runId === undefined ? undefined : Fields.text(data.runId, /^\d+$/),
			commentId:
				data.commentId === undefined
					? undefined
					: Fields.integer(data.commentId, true),
		};
		AttentionStateRules.validate(state);
		return state;
	}
	private static episode(input: unknown): AttentionEpisode {
		const data = Fields.record(input);
		return {
			condition: AttentionRecord.condition(data.condition),
			episode: Fields.integer(data.episode, true),
			openedAt: Fields.instant(data.openedAt),
			status: Fields.choice(data.status, [
				"active",
				"unknown",
				"resolved",
				"stopped",
			]),
			lastWindow:
				data.lastWindow === undefined
					? undefined
					: Fields.text(
							data.lastWindow,
							/^(?:day|week|preparation|occurrence|follow-up):-?\d+$/,
						),
		};
	}
	private static condition(input: unknown): AttentionCondition {
		const data = Fields.record(input);
		return {
			key: Fields.text(data.key, /^[a-z0-9:-]{1,180}$/),
			code: Fields.choice(data.code, ATTENTION_CODES),
			owner: Fields.choice(data.owner, [
				"event",
				"assets",
				"feedback",
				"communications",
				"approvals",
				"delivery",
			]),
			resource: Fields.text(data.resource, /^[a-z0-9:-]{1,128}$/),
			severity: Fields.choice(data.severity, ["warning", "error"]),
			policy: Fields.choice(data.policy, [
				"preparation",
				"daily",
				"weekly",
				"approval",
				"occurrence",
				"follow-up",
				"none",
			]),
			since: data.since === undefined ? undefined : Fields.instant(data.since),
			commentId:
				data.commentId === undefined
					? undefined
					: Fields.integer(data.commentId, true),
			recovery:
				data.recovery === undefined
					? undefined
					: Fields.choice(data.recovery, [true]),
		};
	}
	private static post(input: unknown): NonNullable<AttentionState["post"]> {
		const data = Fields.record(input);
		return {
			reservationId: Fields.text(data.reservationId, /^attention:\d+:\d+$/),
			day: Fields.integer(data.day),
			reservedAt: Fields.instant(data.reservedAt),
			status: Fields.choice(data.status, ["pending", "accepted", "retry"]),
			retryAt:
				data.retryAt === undefined ? undefined : Fields.instant(data.retryAt),
			fingerprint:
				data.fingerprint === undefined
					? undefined
					: Fields.text(data.fingerprint, /^[a-f0-9]{64}$/),
			message:
				data.message === undefined
					? undefined
					: AttentionRecord.message(data.message),
		};
	}
	private static message(
		input: unknown,
	): NonNullable<NonNullable<AttentionState["post"]>["message"]> {
		const data = Fields.record(input);
		return {
			destination: Fields.text(data.destination, /^[a-zA-Z0-9._:-]{1,128}$/),
			messageId: Fields.text(data.messageId, /^[a-zA-Z0-9._:-]{1,128}$/),
		};
	}
}
