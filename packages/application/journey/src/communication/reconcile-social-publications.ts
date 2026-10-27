import type { SocialDeliveryRecord } from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";
import type {
	SocialPublicationDependencies,
	SocialPublicationResult,
	SocialPublicationStatus,
} from "./social-publication-contracts.js";
import type { SocialPublicationDelivery } from "./social-publication-delivery.js";
import type { SocialPublicationIntents } from "./social-publication-intents.js";
import type { SocialPublicationReview } from "./social-publication-review.js";

export class ReconcileSocialPublications {
	constructor(
		private readonly dependencies: SocialPublicationDependencies,
		private readonly review: SocialPublicationReview,
		private readonly requests: SocialPublicationApprovalRequest,
		private readonly intents: SocialPublicationIntents,
		private readonly delivery: SocialPublicationDelivery,
	) {}
	async execute(identity: EventIdentity) {
		const snapshot = await this.dependencies.store.load();
		const configured = await this.dependencies.configuration();
		const latest = new Map<string, ContentProposal>();
		for (const proposal of snapshot.proposals)
			if (
				configured.some((item) =>
					proposal.plan.target.startsWith(`${item.key}:`),
				)
			)
				latest.set(proposal.plan.target, proposal);
		const publications: SocialPublicationResult[] = [];
		for (const proposal of latest.values()) {
			try {
				publications.push(
					this.result(proposal, await this.reconcile(identity, proposal)),
				);
			} catch {
				publications.push({
					...this.result(proposal, "uncertain"),
					diagnostics: [
						{
							code: "communication.social.evaluation-failed",
							severity: "error",
							category: "incomplete",
							field: `social.${proposal.plan.target.replace(":", ".")}`,
							message: "Social publication evaluation failed",
						},
					],
				});
			}
		}
		await this.dependencies.completion.record(identity, publications);
		return {
			publications,
			diagnostics: publications.flatMap((item) => item.diagnostics),
		};
	}
	private async reconcile(
		identity: EventIdentity,
		proposal: ContentProposal,
	): Promise<SocialPublicationStatus> {
		if (!proposal.plan.destination) return "blocked";
		const record = await this.intents.anchor(identity, proposal);
		if (record.manual) return "manual";
		const attempt = record.attempts.at(-1);
		if (attempt?.status === "accepted") return "complete";
		const context = await this.review.context(identity, proposal);
		if (!context) return "blocked";
		if (
			!attempt &&
			record.purpose === "announcement" &&
			context.event.operationalChecklists.communication.some(
				(item) => item.name === record.destination.label && item.completed,
			)
		) {
			await this.dependencies.journal.save(record, {
				...record,
				manual: {
					recordedAt: this.dependencies.now(),
					reference: `https://github.com/${identity.repository}/issues/${identity.issueNumber}`,
				},
			});
			return "manual";
		}
		const status = this.attemptStatus(record, proposal);
		if (status) return status;
		if (this.dependencies.timing.expired(context.plan, this.dependencies.now()))
			return "expired";
		if (
			attempt?.retryAt &&
			Date.parse(attempt.retryAt) > Date.parse(this.dependencies.now())
		)
			return "scheduled";
		const approval = await this.dependencies.approvals.request(
			this.requests.request(proposal, record),
		);
		if (approval.status !== "approved")
			return approval.status === "pending" ? "pending" : "blocked";
		if (
			!this.dependencies.timing.publicationEligible(
				context.plan,
				this.dependencies.now(),
			)
		)
			return "scheduled";
		return await this.delivery.publish(identity, proposal, record);
	}
	private attemptStatus(
		record: SocialDeliveryRecord,
		proposal: ContentProposal,
	): SocialPublicationStatus | undefined {
		const attempt = record.attempts.at(-1);
		if (!attempt || attempt.recovery?.outcome === "not-published")
			return undefined;
		if (["reserved", "prepared", "uncertain"].includes(attempt.status))
			return "uncertain";
		if (attempt.status === "stale")
			return attempt.revision === proposal.revision ? "blocked" : undefined;
		if (
			attempt.status === "rejected" ||
			record.attempts.filter((item) => item.status !== "stale").length >= 10
		)
			return "blocked";
		return undefined;
	}

	private result(
		proposal: ContentProposal,
		status: SocialPublicationStatus,
	): SocialPublicationResult {
		return {
			target: proposal.plan.target,
			occurrence: proposal.plan.facts.date,
			status,
			diagnostics: ["published", "complete", "manual", "scheduled"].includes(
				status,
			)
				? []
				: [
						{
							code: `communication.social.${status}`,
							severity: "warning",
							category: "incomplete",
							field: `social.${proposal.plan.target.replace(":", ".")}`,
							message: `Social publication requires organizer action: ${status}`,
						},
					],
		};
	}
}
