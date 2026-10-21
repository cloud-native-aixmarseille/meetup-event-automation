import { randomUUID } from "node:crypto";
import {
	type ApprovalPresenter,
	type GithubApprovalClient,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import {
	ApprovalNotificationPolicy,
	type OrganizerApprovalNotification,
} from "@meetup-automation/journey";

/** Wire independent approval, follow-up, and attention capabilities per invocation. */
export class OrganizerApprovalComposition {
	static create(
		client: GithubApprovalClient,
		authorLogin: string,
		presenter: ApprovalPresenter,
		notificationPort: OrganizerApprovalNotification,
		organizerChannelId: string,
	) {
		const records =
			new GithubOrganizerApprovalComposition().approvalRecordFactory(
				randomUUID,
			);
		const notifications =
			new GithubOrganizerApprovalComposition().approvalNotifications(
				new ApprovalNotificationPolicy(),
				client,
				presenter,
				notificationPort,
				organizerChannelId,
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
			);
		return {
			approval:
				new GithubOrganizerApprovalComposition().githubOrganizerApproval(
					repository,
					records,
					finalizer,
					notifications,
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
}
