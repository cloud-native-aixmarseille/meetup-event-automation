import type { ContentProposal } from "./promotional-content.js";
import type { PromotionalContentFingerprint } from "./promotional-content-fingerprint.js";

export class ContentProposalTransition {
	constructor(
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
	) {}
	validate(previous: ContentProposal, next: ContentProposal): void {
		for (const key of [
			"recoveryRequest",
			"destinationBefore",
			"id",
			"plan",
			"origin",
			"guidance",
			"createdAt",
			"promptVersion",
			"version",
		] as const)
			if (!this.same(previous[key], next[key]))
				throw new Error("Content proposal identity is immutable");
		for (const key of ["draft", "revision", "decision", "accepted"] as const)
			if (previous[key] !== null && !this.same(previous[key], next[key]))
				throw new Error("Final content evidence cannot be replaced");
		if (next.attempts.length < previous.attempts.length)
			throw new Error("Content reservations cannot be removed");
		for (const [index, attempt] of previous.attempts.entries()) {
			const updated = next.attempts[index];
			if (
				attempt.id !== updated?.id ||
				(attempt.phase !== "reserved" && !this.same(attempt, updated))
			)
				throw new Error("Content generation evidence cannot be replaced");
		}
	}
	private same(left: unknown, right: unknown): boolean {
		return this.fingerprints.digest(left) === this.fingerprints.digest(right);
	}
}
