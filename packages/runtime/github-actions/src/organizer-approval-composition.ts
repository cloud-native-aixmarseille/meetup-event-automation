import { randomUUID } from "node:crypto";
import {
	ApprovalDecisionParser,
	ApprovalNotifications,
	ApprovalPresenter,
	ApprovalRecordFactory,
	FinalizeApprovalDecision,
	GithubApprovalAttentionSource,
	type GithubApprovalClient,
	GithubApprovalRepository,
	GithubOrganizerApproval,
	GithubOrganizerFollowUp,
	ResolveApprovalDecision,
	TrustedApprovalState,
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
		const records = new ApprovalRecordFactory(randomUUID);
		const notifications = new ApprovalNotifications(
			new ApprovalNotificationPolicy(),
			client,
			presenter,
			notificationPort,
			organizerChannelId,
		);
		const repository = new GithubApprovalRepository(
			client,
			new TrustedApprovalState(client, authorLogin),
			authorLogin,
			presenter,
		);
		const finalizer = new FinalizeApprovalDecision(
			new ResolveApprovalDecision(
				client,
				new ApprovalDecisionParser(ApprovalPresenter.supportedLocales()),
			),
			repository,
			notifications,
		);
		return {
			approval: new GithubOrganizerApproval(
				repository,
				records,
				finalizer,
				notifications,
				client,
			),
			followUp: new GithubOrganizerFollowUp(repository, records, finalizer),
			attention: new GithubApprovalAttentionSource(repository, finalizer),
		};
	}
}
