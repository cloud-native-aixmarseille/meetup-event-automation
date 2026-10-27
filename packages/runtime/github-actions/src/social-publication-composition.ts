import { randomUUID } from "node:crypto";
import {
	EventDocumentConcurrency,
	type MeetupEvent,
} from "@meetup-automation/event";
import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import { GithubSocialDeliveryJournalComposition } from "@meetup-automation/github-social-delivery-journal";
import { GoogleDriveContentMediaComposition } from "@meetup-automation/google-drive-asset-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	SocialPublicationComposition as JourneySocialPublicationComposition,
	SocialPublicationCompletion,
} from "@meetup-automation/journey";
import {
	ContentFingerprint,
	type ContentImageLoader,
	type ContentMedia,
} from "@meetup-automation/publication";
import { SlackNotificationGatewayComposition } from "@meetup-automation/slack-notification-gateway";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";
import {
	type DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";
import { OrganizerApprovalComposition } from "./organizer-approval-composition.js";
import { RuntimeInput } from "./runtime-input.js";
import type { SocialCredentials } from "./social-credentials-input.js";
import { SocialGatewayComposition } from "./social-gateway-composition.js";
import { SocialPublicationConfiguration } from "./social-publication-configuration.js";

export interface SocialPublicationInput extends DraftSource {
	readonly credentials: SocialCredentials;
	readonly slackToken: string;
	readonly slackOrganizerChannelId: string;
}
export class SocialPublicationComposition {
	create(input: SocialPublicationInput) {
		const images =
			new HttpsAssetImageRepositoryComposition().contentImageLoader();
		const base = new DraftWorkspaceComposition().create(
			input,
			this.announcement(input, images),
		);
		const adapters = new GithubOrganizerApprovalComposition();
		const slack = new SlackNotificationGatewayComposition();
		const approvals = OrganizerApprovalComposition.create(
			base.client,
			input.commentAuthorLogin,
			adapters.approvalPresenter(adapters.approvalMessages(input.locale)),
			slack.slackApprovalNotification(
				input.slackToken,
				slack.slackApprovalPresenter(input.locale),
			),
			input.slackOrganizerChannelId,
		).approval;
		const settings = new SocialPublicationConfiguration(new RuntimeInput());
		const configuration = async () =>
			(await settings.load(process.cwd())).destinations;
		return new JourneySocialPublicationComposition().create({
			store: base.store,
			workspace: base.workspace,
			policy: base.policy,
			fingerprints: base.fingerprints,
			timing: base.timing,
			approvals,
			journal: new GithubSocialDeliveryJournalComposition().create(
				base.client,
				input.commentAuthorLogin,
			),
			configuration,
			canApprove: base.client.canApprove.bind(base.client),
			gateways: new SocialGatewayComposition().create(
				input.destinations,
				input.credentials,
			),
			imageLoader: images,
			imageFingerprint: new ContentFingerprint(),
			now: () => new Date().toISOString(),
			createId: randomUUID,
			completion: new SocialPublicationCompletion(
				base.repository,
				base.codec,
				new EventDocumentConcurrency(),
				configuration,
			),
		});
	}
	private announcement(
		input: SocialPublicationInput,
		images: ContentImageLoader,
	): (event: MeetupEvent) => Promise<ContentMedia | null> {
		if (!input.credentials.linkedin) return async () => null;
		const announcement = new GoogleDriveContentMediaComposition().announcement(
			input.credentials.linkedin.googleCredentials,
			images,
			new AssetFileNameComposition().create(input.locale),
		);
		return async (event) =>
			input.settings.announcements[event.date]
				? announcement.read(
						event.date,
						input.settings.announcements[event.date],
					)
				: null;
	}
}
