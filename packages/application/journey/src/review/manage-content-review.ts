import type { SocialPostTiming } from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ApplyPromotionalContent } from "./apply-promotional-content.js";
import type { ContentReview } from "./content-review.js";
import type { ContentWorkspace } from "./content-workspace.js";
import type { SubmitPromotionalContent } from "./submit-promotional-content.js";

export class ManageContentReview {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly submissions: Pick<SubmitPromotionalContent, "execute">,
		private readonly workspace: Pick<ContentWorkspace, "read">,
		private readonly review: Pick<ContentReview, "review">,
		private readonly apply: Pick<ApplyPromotionalContent, "execute">,
		private readonly timing: Pick<SocialPostTiming, "expired">,
		private readonly now: () => string,
	) {}
	async execute(identity: EventIdentity): Promise<readonly PublicDiagnostic[]> {
		const diagnostics: PublicDiagnostic[] = [
			...(await this.submissions.execute(identity)),
		];
		const { proposals } = await this.store.load();
		const latest = new Map(
			proposals.map((proposal) => [proposal.plan.target, proposal]),
		);
		for (const proposal of latest.values()) {
			const context = await this.workspace.read(
				identity,
				proposal.plan.target,
				proposal.plan.language,
			);
			if (
				proposal.plan.target.includes(":") &&
				this.timing.expired(context?.plan ?? proposal.plan, this.now())
			)
				continue;
			if (!context) {
				diagnostics.push({
					code: "publication.content.stale",
					severity: "warning",
					field: this.field(proposal.plan.target),
					message: "Content source is no longer eligible",
				});
				continue;
			}
			const status = proposal.draft
				? await this.review.review(proposal, context.plan)
				: "recovery";
			const applied =
				status === "approved"
					? await this.apply.execute(identity, proposal)
					: status;
			if (applied === "accepted" || applied === "scheduled") continue;
			diagnostics.push({
				code: `publication.content.${applied}`,
				severity: "warning",
				field: this.field(proposal.plan.target),
				message: `Content ${proposal.plan.target}: ${applied}`,
			});
		}
		return diagnostics;
	}
	private field(target: string): string {
		return target.includes(":")
			? `social.${target.replace(":", ".")}`
			: target === "title" || target === "description"
				? target
				: "assets";
	}
}
