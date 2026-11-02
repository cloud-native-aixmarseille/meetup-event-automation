import type {
	DeliveryStatus,
	MailCommunicationKind,
} from "@meetup-automation/communication";
import type {
	EmailDeliveryReport,
	EmailDeliverySummary,
} from "@meetup-automation/journey";
import type { FinalizeApprovalDecision } from "./finalize-approval-decision.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

interface DeliverySnapshot {
	readonly commentId?: number;
	readonly hasOtherDeliveries: boolean;
	readonly body?: string;
	readonly entries: readonly {
		readonly kind: MailCommunicationKind;
		readonly status: DeliveryStatus;
	}[];
}

/** Keep the ledger authoritative; hide its duplicate view only after saving reviews. */
export class GithubEmailDeliveryReport implements EmailDeliveryReport {
	constructor(
		private readonly approvals: Pick<
			GithubApprovalRepository,
			"states" | "save"
		>,
		private readonly source: { readEmailReport(): Promise<DeliverySnapshot> },
		private readonly finalizer: Pick<
			FinalizeApprovalDecision,
			"refreshVisibility"
		>,
		private readonly visibility: {
			synchronize(id: number, body: string, resolved: boolean): Promise<void>;
		},
	) {}

	async synchronize(): Promise<void> {
		const snapshot = await this.source.readEmailReport();
		const covered = new Set<MailCommunicationKind>();
		for (const state of await this.approvals.states()) {
			const record = state.record;
			if (!record.details || record.decision?.status !== "approved") continue;
			const kinds = new Set(record.details.emails.map((email) => email.kind));
			const delivery = [...kinds].flatMap((kind) =>
				this.summary(
					kind,
					snapshot.entries,
					record.details?.mailKind
						? record.recipientCount
						: (record.details?.emails.filter((email) => email.kind === kind)
								.length ?? 0),
				),
			);
			for (const kind of kinds) covered.add(kind);
			const persisted = await this.approvals.save(
				{ ...record, delivery },
				state,
			);
			await this.finalizer.refreshVisibility(persisted);
		}
		if (snapshot.commentId && snapshot.body)
			await this.visibility.synchronize(
				snapshot.commentId,
				snapshot.body,
				snapshot.entries.length > 0 &&
					!snapshot.hasOtherDeliveries &&
					snapshot.entries.every(({ kind }) => covered.has(kind)),
			);
	}

	private summary(
		kind: MailCommunicationKind,
		entries: DeliverySnapshot["entries"],
		expected: number,
	): EmailDeliverySummary[] {
		const matching = entries.filter((entry) => entry.kind === kind);
		if (!matching.length)
			return [{ kind, status: "not-sent", count: expected }];
		const counts = new Map<DeliveryStatus, number>();
		for (const entry of matching)
			counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
		const summary: EmailDeliverySummary[] = [...counts].map(
			([status, count]) => ({ kind, status, count }),
		);
		if (matching.length < expected)
			summary.push({
				kind,
				status: "not-sent",
				count: expected - matching.length,
			});
		return summary;
	}
}
