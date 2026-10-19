import {
	GithubContentStoreComposition,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import { GoogleDriveContentMediaComposition } from "@meetup-automation/google-drive-asset-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	ApplyPromotionalContent,
	ContentReview,
	ManageContentReview,
	SubmitPromotionalContent,
} from "@meetup-automation/journey";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";
import type { DraftMediaInput } from "./draft-media-input.js";
import {
	type DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";
export class DraftReviewComposition {
	review(
		input: DraftSource & DraftMediaInput,
		slackToken: string,
		channelId: string,
	): ManageContentReview {
		const images =
			new HttpsAssetImageRepositoryComposition().contentImageLoader();
		const assets = new GoogleDriveContentMediaComposition();
		const names = new AssetFileNameComposition().create(input.locale);
		const media = assets.create(
			input.credentials,
			input.publicFolderId,
			images,
			names,
		);
		const announcement = assets.announcement(input.credentials, images, names);
		const base = new DraftWorkspaceComposition().create(input, async (event) =>
			input.settings.announcements[event.date]
				? announcement.read(
						event.date,
						input.settings.announcements[event.date],
					)
				: null,
		);
		const adapters = new GithubOrganizerApprovalComposition();
		const slack = new SlackNotificationGatewayComposition();
		const approvals = OrganizerApprovalComposition.create(
			base.client,
			input.commentAuthorLogin,
			adapters.approvalPresenter(adapters.approvalMessages(input.locale)),
			slack.slackApprovalNotification(
				slackToken,
				slack.slackApprovalPresenter(input.locale),
			),
			channelId,
		).approval;
		const review = new ContentReview(base.store, approvals, media, base.policy);
		return new ManageContentReview(
			base.store,
			new SubmitPromotionalContent(
				base.store,
				new GithubContentStoreComposition().submissions(base.client),
				base.workspace,
				base.factory,
				images,
				media,
				base.fingerprints,
				base.policy,
			),
			base.workspace,
			review,
			new ApplyPromotionalContent(
				base.store,
				base.workspace,
				base.eventCopy,
				review,
				base.policy,
				base.timing,
				() => new Date().toISOString(),
			),
		);
	}
}
