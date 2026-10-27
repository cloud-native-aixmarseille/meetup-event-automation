import { isDeepStrictEqual } from "node:util";
import type {
	SocialDeliveryAttempt,
	SocialDeliveryRecord,
} from "@meetup-automation/communication";

/** Storage preserves identities and evidence independently of send planning. */
export class SocialJournalTransition {
	validate(
		previous: SocialDeliveryRecord | undefined,
		next: SocialDeliveryRecord,
	): void {
		if (previous?.manual && !isDeepStrictEqual(previous, next))
			throw new Error("Manual social completion cannot change");
		if (!previous) {
			this.initial(next);
			return;
		}
		if (
			previous.intentId !== next.intentId ||
			previous.occurrence !== next.occurrence ||
			previous.purpose !== next.purpose ||
			!isDeepStrictEqual(previous.destination, next.destination)
		)
			throw new Error("Social delivery identity cannot change");
		if (
			next.attempts.length < previous.attempts.length ||
			next.attempts.length > previous.attempts.length + 1
		)
			throw new Error("Social delivery history must be preserved");
		for (const [index, attempt] of previous.attempts.entries()) {
			const updated = next.attempts[index];
			if (isDeepStrictEqual(attempt, updated)) continue;
			if (!updated || index !== previous.attempts.length - 1)
				throw new Error("Earlier social delivery attempts cannot change");
			this.attempt(attempt, updated);
		}
		if (next.attempts.length > previous.attempts.length)
			this.append(previous, next);
	}

	private initial(next: SocialDeliveryRecord): void {
		if (
			next.attempts.length > 1 ||
			next.attempts.some(
				(attempt) =>
					attempt.status !== "reserved" || attempt.media || attempt.recovery,
			)
		)
			throw new Error("Social delivery must be reserved before effects");
	}

	private append(
		previous: SocialDeliveryRecord,
		next: SocialDeliveryRecord,
	): void {
		const last = previous.attempts.at(-1);
		if (
			last &&
			last.status !== "rejected" &&
			last.status !== "deferred" &&
			last.status !== "stale" &&
			last.recovery?.outcome !== "not-published"
		)
			throw new Error("Uncertain social delivery cannot be replayed");
		const added = next.attempts.at(-1);
		if (
			added?.status !== "reserved" ||
			added.receipt ||
			added.code ||
			added.retryAt ||
			added.recovery
		)
			throw new Error("Social delivery must be reserved before effects");
		if (
			added.media &&
			(!isDeepStrictEqual(last?.media, added.media) ||
				last?.revision !== added.revision)
		)
			throw new Error("Social delivery cannot reuse unreviewed media");
		if (last && Date.parse(added.reservedAt) < Date.parse(last.reservedAt))
			throw new Error("Social delivery attempt predates its history");
	}

	private attempt(
		previous: SocialDeliveryAttempt,
		next: SocialDeliveryAttempt,
	): void {
		if (previous.status === "accepted" || previous.recovery)
			throw new Error("Completed social delivery evidence cannot change");
		if (previous.status === "rejected" || previous.status === "deferred") {
			this.terminalRecovery(previous, next);
			return;
		}
		if (
			previous.id !== next.id ||
			previous.revision !== next.revision ||
			previous.reservedAt !== next.reservedAt ||
			(previous.media && !isDeepStrictEqual(previous.media, next.media))
		)
			throw new Error("Social delivery reservation cannot change");
		if (previous.status === "uncertain" && !next.recovery)
			throw new Error("Uncertain social delivery requires explicit recovery");
		if (next.recovery) {
			this.recovery(previous, next);
			return;
		}
		if (
			next.status === "reserved" ||
			(previous.status === "prepared" && next.status === "prepared")
		)
			throw new Error("Social delivery cannot return to an earlier stage");
	}

	private terminalRecovery(
		previous: SocialDeliveryAttempt,
		next: SocialDeliveryAttempt,
	): void {
		const { recovery, ...evidence } = next;
		if (
			recovery?.outcome !== "not-published" ||
			!isDeepStrictEqual(previous, evidence)
		)
			throw new Error("Completed social delivery evidence cannot change");
	}

	private recovery(
		previous: SocialDeliveryAttempt,
		next: SocialDeliveryAttempt,
	): void {
		const {
			status: previousStatus,
			receipt: previousReceipt,
			recovery: previousRecovery,
			...previousEvidence
		} = previous;
		const { status, receipt, recovery, ...evidence } = next;
		if (!isDeepStrictEqual(previousEvidence, evidence))
			throw new Error("Social recovery cannot change provider evidence");
		const validOutcome =
			recovery?.outcome === "published"
				? status === "accepted" && Boolean(receipt)
				: status === previousStatus &&
					isDeepStrictEqual(receipt, previousReceipt) &&
					!previousRecovery;
		if (!validOutcome)
			throw new Error("Invalid social delivery recovery transition");
	}
}
