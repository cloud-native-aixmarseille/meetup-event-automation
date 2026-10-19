import type { ContentProposalFactory } from "./content-proposal-factory.js";
import type {
	ContentOrigin,
	ContentPlan,
	ContentProposal,
	ContentRecoveryRequest,
} from "./promotional-content.js";
import type { PromotionalContentPolicy } from "./promotional-content-policy.js";
import type { ContentProposalStore } from "./promotional-content-ports.js";

export class PreparePromotionalContent {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly factory: Pick<ContentProposalFactory, "create">,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"current" | "ready"
		>,
		private readonly authorizeIteration: (actor: string) => Promise<boolean>,
	) {}
	async execute(
		plan: ContentPlan,
		origin: ContentOrigin,
		guidance: string,
		destinationBefore: string | null,
		recoveries: readonly ContentRecoveryRequest[],
	): Promise<ContentProposal | undefined> {
		if (!this.policy.ready(plan)) return undefined;
		const snapshot = await this.store.load();
		const previous = [...snapshot.proposals]
			.reverse()
			.find((proposal) => proposal.plan.target === plan.target);
		const recovery = previous?.attempts.some(
			(attempt) => attempt.phase === "reserved",
		)
			? recoveries.find(
					(request) =>
						request.proposalId === previous.id &&
						!snapshot.proposals.some(
							(item) => item.recoveryRequest?.id === request.id,
						),
				)
			: undefined;
		if (
			previous &&
			!recovery &&
			(this.policy.current(previous, plan) ||
				previous.attempts.some((attempt) => attempt.phase === "reserved"))
		) {
			if (
				previous.decision?.status !== "iteration-requested" ||
				!(await this.authorizeIteration(previous.decision.actor))
			)
				return previous;
		}
		const proposal = {
			...this.factory.create(
				plan,
				origin,
				recovery?.guidance ?? guidance,
				destinationBefore,
			),
			...(recovery ? { recoveryRequest: recovery } : {}),
		};
		await this.store.save(snapshot, [...snapshot.proposals, proposal]);
		return proposal;
	}
}
