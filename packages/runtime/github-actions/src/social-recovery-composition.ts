import type { getOctokit } from "@actions/github";
import {
	SocialPostTiming,
	SocialRecoveryReference,
} from "@meetup-automation/communication";
import {
	GithubContentStoreComposition,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import { GithubSocialDeliveryJournalComposition } from "@meetup-automation/github-social-delivery-journal";
import {
	DraftProposalComposition,
	RecoverSocialPublication,
	SocialPublicationApprovalRequest,
} from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";

export class SocialRecoveryComposition {
	create(input: {
		readonly client: ReturnType<typeof getOctokit>;
		readonly owner: string;
		readonly repo: string;
		readonly issueNumber: number;
		readonly locale: Locale;
		readonly commentAuthorLogin: string;
		readonly slackToken: string;
		readonly slackOrganizerChannelId: string;
	}): RecoverSocialPublication {
		const adapters = new GithubOrganizerApprovalComposition();
		const client = adapters.githubApprovalClient(
			input.client,
			input.owner,
			input.repo,
			input.issueNumber,
		);
		const slack = new SlackNotificationGatewayComposition();
		const approvals = OrganizerApprovalComposition.create(
			client,
			input.commentAuthorLogin,
			adapters.approvalPresenter(adapters.approvalMessages(input.locale)),
			slack.slackApprovalNotification(
				input.slackToken,
				slack.slackApprovalPresenter(input.locale),
			),
			input.slackOrganizerChannelId,
		).approval;
		const fingerprints = new DraftProposalComposition().fingerprints();
		return new RecoverSocialPublication(
			new GithubSocialDeliveryJournalComposition().create(
				client,
				input.commentAuthorLogin,
			),
			new GithubContentStoreComposition().store(
				client,
				input.commentAuthorLogin,
			),
			approvals,
			new SocialPublicationApprovalRequest(
				new SocialPostTiming(),
				fingerprints,
			),
			new SocialRecoveryReference(),
			fingerprints,
		);
	}
}
