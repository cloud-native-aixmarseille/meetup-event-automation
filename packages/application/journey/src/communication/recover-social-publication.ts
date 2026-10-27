import type {
	SocialDeliveryAttempt,
	SocialDeliveryJournal,
	SocialDeliveryRecord,
	SocialPostReceipt,
	SocialRecoveryReference,
} from "@meetup-automation/communication";
import type {
	OrganizerApproval,
	OrganizerApprovalResult,
} from "../ports/organizer-approval.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";

export interface SocialRecoveryInput {
	readonly intentId: string;
	readonly outcome: "published" | "not-published";
	readonly reference: string;
}
export class RecoverSocialPublication {
	constructor(
		private readonly journal: SocialDeliveryJournal,
		private readonly store: ContentProposalStore,
		private readonly approvals: OrganizerApproval,
		private readonly review: Pick<SocialPublicationApprovalRequest, "request">,
		private readonly references: Pick<
			SocialRecoveryReference,
			"receipt" | "evidence"
		>,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
	) {}
	async execute(
		input: SocialRecoveryInput,
	): Promise<"pending" | "rejected" | "recovered" | "complete"> {
		const record = await this.journal.load(input.intentId);
		if (record?.manual) return "complete";
		const attempt = record?.attempts.at(-1);
		if (!record || !attempt)
			throw new Error("Social recovery requires a recorded attempt");
		if (attempt.status === "accepted") return "complete";
		if (
			["rejected", "deferred"].includes(attempt.status) &&
			input.outcome === "published"
		)
			throw new Error(
				"Definitive non-acceptance requires non-publication recovery",
			);
		if (attempt.recovery) {
			if (
				attempt.recovery.outcome !== input.outcome ||
				attempt.recovery.reference !== input.reference
			)
				throw new Error("Social recovery evidence cannot change");
			return "recovered";
		}
		const receipt =
			input.outcome === "published"
				? this.references.receipt(record.destination, input.reference)
				: undefined;
		if (input.outcome === "not-published")
			this.references.evidence(input.reference);
		const decision = await this.request(input, record, attempt);
		if (decision.status !== "approved")
			return decision.status === "pending" ? "pending" : "rejected";
		await this.persist(input, record, attempt, decision, receipt);
		return "recovered";
	}

	private async request(
		input: SocialRecoveryInput,
		record: SocialDeliveryRecord,
		attempt: SocialDeliveryAttempt,
	): Promise<OrganizerApprovalResult> {
		const proposal = (await this.store.load()).proposals.find(
			(item) =>
				item.publicationIntent === record.intentId &&
				item.revision === attempt.revision,
		);
		if (!proposal) throw new Error("Social recovery draft evidence is missing");
		const original = this.review.request(proposal, record);
		const social = {
			...original.social,
			recovery: { outcome: input.outcome, reference: input.reference },
		};
		const request = {
			...original,
			social,
			revision: this.fingerprints.digest({
				social,
				attemptId: attempt.id,
				revision: attempt.revision,
			}),
		};
		return this.approvals.request(request);
	}

	private async persist(
		input: SocialRecoveryInput,
		record: SocialDeliveryRecord,
		attempt: SocialDeliveryAttempt,
		decision: OrganizerApprovalResult,
		receipt: SocialPostReceipt | undefined,
	): Promise<void> {
		if (
			!decision.actor ||
			!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(decision.actor) ||
			!decision.decidedAt ||
			!Number.isFinite(Date.parse(decision.decidedAt)) ||
			Date.parse(decision.decidedAt) < Date.parse(attempt.reservedAt)
		)
			throw new Error("Recovery decision provenance is unavailable");
		const current = await this.journal.load(record.intentId);
		if (this.fingerprints.digest(current) !== this.fingerprints.digest(record))
			throw new Error("Social delivery changed during recovery");
		const recovery = {
			actor: decision.actor,
			decidedAt: decision.decidedAt,
			outcome: input.outcome,
			reference: input.reference,
		};
		await this.journal.save(record, {
			...record,
			attempts: [
				...record.attempts.slice(0, -1),
				{
					...attempt,
					status: receipt ? "accepted" : attempt.status,
					recovery,
					...(receipt ? { receipt } : {}),
				},
			],
		});
	}
}
