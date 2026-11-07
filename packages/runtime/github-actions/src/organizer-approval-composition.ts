import { randomUUID } from "node:crypto";
import {
	type GitHubCommentVisibility,
	GithubEventCommentRepositoryComposition,
} from "@meetup-automation/github-event-comment-repository";
import {
	type ApprovalPresenter,
	type GithubApprovalClient,
	GithubEmailDeliveryReport,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import { GithubOrganizerAttentionComposition } from "@meetup-automation/github-organizer-attention";
import type { OrganizerApprovalNotification } from "@meetup-automation/journey";

/** Wire independent approval, follow-up, and attention capabilities per invocation. */
export class OrganizerApprovalComposition {
	static visibility(input: {
		readonly client: ConstructorParameters<typeof GitHubCommentVisibility>[0];
		readonly owner: string;
		readonly repo: string;
	}): GitHubCommentVisibility {
		return new GithubEventCommentRepositoryComposition().githubCommentVisibility(
			input.client,
			input.owner,
			input.repo,
		);
	}
	static create(
		client: GithubApprovalClient,
		authorLogin: string,
		presenter: ApprovalPresenter,
		notificationPort: OrganizerApprovalNotification,
		visibility: GitHubCommentVisibility,
	) {
		const records =
			new GithubOrganizerApprovalComposition().approvalRecordFactory(
				randomUUID,
			);
		const notifications = OrganizerApprovalComposition.notifications(
			client,
			presenter,
			notificationPort,
		);
		const repository =
			new GithubOrganizerApprovalComposition().githubApprovalRepository(
				client,
				new GithubOrganizerApprovalComposition().trustedApprovalState(
					client,
					authorLogin,
				),
				authorLogin,
				presenter,
			);
		const finalizer =
			new GithubOrganizerApprovalComposition().finalizeApprovalDecision(
				new GithubOrganizerApprovalComposition().resolveApprovalDecision(
					client,
					new GithubOrganizerApprovalComposition().approvalDecisionParser(
						new GithubOrganizerApprovalComposition()
							.approvalPresenterFactory()
							.supportedLocales(),
					),
				),
				repository,
				notifications,
				visibility,
				new GithubOrganizerAttentionComposition().attentionRecord(),
			);
		return {
			emailDeliveryReport: OrganizerApprovalComposition.deliveryReport(
				repository,
				finalizer,
				visibility,
			),
			approval:
				new GithubOrganizerApprovalComposition().githubOrganizerApproval(
					repository,
					records,
					finalizer,
					client,
				),
			followUp:
				new GithubOrganizerApprovalComposition().githubOrganizerFollowUp(
					repository,
					records,
					finalizer,
				),
			attention:
				new GithubOrganizerApprovalComposition().githubApprovalAttentionSource(
					repository,
					finalizer,
				),
		};
	}
	private static notifications(
		client: GithubApprovalClient,
		presenter: ApprovalPresenter,
		port: OrganizerApprovalNotification,
	) {
		return new GithubOrganizerApprovalComposition().approvalNotifications(
			client,
			presenter,
			port,
		);
	}

	private static deliveryReport(
		repository: ConstructorParameters<typeof GithubEmailDeliveryReport>[0],
		finalizer: ConstructorParameters<typeof GithubEmailDeliveryReport>[2],
		visibility: GitHubCommentVisibility,
	) {
		return (
			source: ConstructorParameters<typeof GithubEmailDeliveryReport>[1],
		) =>
			new GithubEmailDeliveryReport(repository, source, finalizer, visibility);
	}
}
