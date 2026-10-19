import type { EventIdentity } from "@meetup-automation/event";
import type {
	ContentImageLoader,
	ContentMediaStore,
} from "@meetup-automation/publication";
import type {
	ContentSubmission,
	ContentSubmissions,
} from "../ports/content-submissions.js";
import type { ContentProposalFactory } from "../proposals/content-proposal-factory.js";
import type {
	ContentDraft,
	ContentPlan,
	ContentProposal,
} from "../proposals/promotional-content.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ContentWorkspace } from "./content-workspace.js";

export class SubmitPromotionalContent {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly submissions: ContentSubmissions,
		private readonly workspace: Pick<ContentWorkspace, "read">,
		private readonly factory: Pick<ContentProposalFactory, "create">,
		private readonly images: ContentImageLoader,
		private readonly media: ContentMediaStore,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"proposal"
		>,
		private readonly policy: Pick<PromotionalContentPolicy, "validDraft">,
	) {}
	async execute(identity: EventIdentity): Promise<readonly PublicDiagnostic[]> {
		const diagnostics: PublicDiagnostic[] = [];
		for (const submission of await this.submissions.read())
			if (!(await this.submit(identity, submission)))
				diagnostics.push({
					code: "publication.content.prerequisites",
					severity: "warning",
					field: "assets",
					message: "Submitted content does not satisfy the target contract",
				});
		return diagnostics;
	}
	private async submit(
		identity: EventIdentity,
		submission: ContentSubmission,
	): Promise<boolean> {
		let snapshot = await this.store.load();
		const existing = snapshot.proposals.find(
			(item) =>
				item.origin.kind === "organizer" &&
				item.origin.submissionId === submission.id,
		);
		if (existing?.draft) return true;
		const context = await this.workspace.read(
			identity,
			submission.target,
			submission.language,
		);
		if (!context) return false;
		if (existing) return this.resume(existing, submission, context.plan);
		if (!this.validSubmission(submission, context.plan)) return false;
		let proposal = this.factory.create(
			context.plan,
			{
				kind: "organizer",
				login: submission.actor,
				submissionId: submission.id,
			},
			"",
			context.destination,
		);
		const mediaId = submission.image ? await this.media.reserve() : undefined;
		if (mediaId)
			proposal = {
				...proposal,
				attempts: [{ id: mediaId, phase: "reserved" }],
			};
		if (!(await this.submissions.verify(submission)))
			throw new Error("Content submission changed");
		snapshot = await this.store.save(snapshot, [
			...snapshot.proposals,
			proposal,
		]);
		const draft = await this.draft(submission, mediaId, context.plan);
		if (!this.policy.validDraft(context.plan, draft)) return false;
		if (!(await this.submissions.verify(submission)))
			throw new Error("Content submission changed during import");
		proposal = {
			...proposal,
			draft,
			revision: this.fingerprints.proposal(proposal, draft),
			attempts:
				mediaId && draft.media[0]
					? [{ id: mediaId, phase: "complete", media: draft.media[0] }]
					: [],
		};
		await this.store.save(
			snapshot,
			snapshot.proposals.map((item) =>
				item.id === proposal.id ? proposal : item,
			),
		);
		return true;
	}
	private validSubmission(
		submission: ContentSubmission,
		plan: ContentPlan,
	): boolean {
		if (plan.target === "cover")
			return submission.text === "" && Boolean(submission.image);
		if (submission.image) return false;
		return this.policy.validDraft(plan, {
			text: submission.text,
			media:
				plan.target.startsWith("linkedin:") && plan.facts.announcement
					? [plan.facts.announcement]
					: [],
		});
	}
	private async resume(
		proposal: ContentProposal,
		submission: ContentSubmission,
		plan: ContentPlan,
	): Promise<boolean> {
		if (proposal.plan.sourceFingerprint !== plan.sourceFingerprint) return true;
		const attempt = proposal.attempts[0];
		const image = attempt ? await this.media.read(attempt.id) : undefined;
		if (attempt && !image) return true;
		const draft = image
			? { text: submission.text, media: [image] }
			: await this.draft(submission, undefined, plan);
		if (!this.policy.validDraft(plan, draft)) return false;
		if (!(await this.submissions.verify(submission)))
			throw new Error("Content submission changed during recovery");
		const snapshot = await this.store.load();
		await this.store.save(
			snapshot,
			snapshot.proposals.map((item) =>
				item.id === proposal.id
					? {
							...item,
							draft,
							revision: this.fingerprints.proposal(item, draft),
							attempts:
								image && attempt
									? [{ id: attempt.id, phase: "complete", media: image }]
									: [],
						}
					: item,
			),
		);
		return true;
	}
	private async draft(
		submission: ContentSubmission,
		mediaId: string | undefined,
		plan: ContentPlan,
	): Promise<ContentDraft> {
		const image =
			submission.image && mediaId
				? await this.media.persist(
						mediaId,
						await this.images.load(submission.image.url),
						submission.image.description,
					)
				: undefined;
		return {
			text: submission.text,
			media: image
				? [image]
				: plan.target.startsWith("linkedin:") && plan.facts.announcement
					? [plan.facts.announcement]
					: [],
		};
	}
}
