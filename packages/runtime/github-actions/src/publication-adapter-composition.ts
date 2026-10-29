import { fileURLToPath } from "node:url";
import { CommunicationDomainComposition } from "@meetup-automation/communication";
import {
	type EventClock,
	type EventDocumentCodec,
	EventDomainComposition,
	type EventRepository,
} from "@meetup-automation/event";
import { GithubDeliveryLedgerComposition } from "@meetup-automation/github-delivery-ledger";
import { GithubPublicationJournalComposition } from "@meetup-automation/github-publication-journal";
import { HcaptchaCaptchaResolverComposition } from "@meetup-automation/hcaptcha-captcha-resolver";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	EventPublicationResults,
	type OrganizerApproval,
	PublicationDestinationComposition,
	ReconcileMeetupSlidesDelivery,
} from "@meetup-automation/journey";
import { MeetupEventGatewayComposition } from "@meetup-automation/meetup-event-gateway";
import { OcgroupsEventGatewayComposition } from "@meetup-automation/ocgroups-event-gateway";
import {
	CommunityGroupUrl,
	MeetupEventIdentityPolicy,
	MeetupGroupUrl,
	PresentationFileUrl,
} from "@meetup-automation/publication";
import type { EventCompositionInput } from "./composition.js";
import { ContentGateComposition } from "./content-gate-composition.js";
import type { ConfiguredPublicationAdapter } from "./publication-credentials-input.js";

type PublicationAdapterInput = EventCompositionInput & {
	locale: string;
	issueNumber: number;
	commentAuthorLogin: string;
	approval: OrganizerApproval;
	clock: EventClock;
};

/** Provider selection and credentials terminate here; the journey sees owned ports. */
export class PublicationAdapterComposition {
	create(
		input: PublicationAdapterInput,
		adapter: ConfiguredPublicationAdapter,
	) {
		return adapter.provider === "meetup"
			? this.meetup(input, adapter)
			: this.ocgroups(input, adapter);
	}
	private meetup(
		input: PublicationAdapterInput,
		adapter: Extract<ConfiguredPublicationAdapter, { provider: "meetup" }>,
	) {
		const group = MeetupGroupUrl.fromEventUrlPrefix(input.meetupEventUrlPrefix);
		if (!group) throw new Error("Invalid Meetup event URL prefix");
		return new PublicationDestinationComposition().meetup(
			{
				settings: adapter.settings,
				clock: input.clock,
				approval: input.approval,
				artwork: new ContentGateComposition().create(
					input,
					input.issueNumber,
					input.commentAuthorLogin,
				),
				journal: this.journal(input),
				gateway: this.meetupGateway(input, adapter, group),
			},
			group,
		);
	}

	slides(
		input: PublicationAdapterInput,
		adapter: Extract<ConfiguredPublicationAdapter, { provider: "meetup" }>,
		source: { repository: EventRepository; codec: EventDocumentCodec },
	): ReconcileMeetupSlidesDelivery {
		const group = MeetupGroupUrl.fromEventUrlPrefix(input.meetupEventUrlPrefix);
		if (!group) throw new Error("Invalid Meetup event URL prefix");
		const ledger = new GithubDeliveryLedgerComposition();
		return new ReconcileMeetupSlidesDelivery(
			{
				...source,
				clock: input.clock,
				concurrency: new EventDomainComposition().eventDocumentConcurrency(),
				postEvent: new CommunicationDomainComposition().postEventPolicy(),
				ledger: ledger.githubDeliveryLedger(
					ledger.scopedGithubLedgerCommentClient(
						input.client,
						input.owner,
						input.repo,
						input.issueNumber,
					),
					{ dispatchAuthorized: true, authorLogin: input.commentAuthorLogin },
					ledger.ledgerCommentPresenter(ledger.ledgerMessages(input.locale)),
				),
				gateway: this.meetupGateway(input, adapter, group),
				identity: new MeetupEventIdentityPolicy(group),
				presentationUrl: new PresentationFileUrl(),
				results: new EventPublicationResults("meetup", "Meetup"),
			},
			{ provider: "meetup", target: group.eventUrlPrefix },
		);
	}
	private meetupGateway(
		input: PublicationAdapterInput,
		adapter: Extract<ConfiguredPublicationAdapter, { provider: "meetup" }>,
		group: MeetupGroupUrl,
	) {
		const { ai, email, password } = adapter.credentials;
		const resolver =
			new HcaptchaCaptchaResolverComposition().captchaResolverFactory(
				fileURLToPath(
					new URL(
						"../../../../packages/adapter/browser-authentication/hcaptcha-captcha-resolver/python/",
						import.meta.url,
					),
				),
				ai.apiKey,
				ai.model,
			);

		return new MeetupEventGatewayComposition(
			input.locale,
			new HttpsAssetImageRepositoryComposition().contentImageLoader(),
			this.journal(input),
		)
			.meetupEventGatewayFactory()
			.create({ email, password }, resolver, group.value);
	}
	private journal(input: PublicationAdapterInput) {
		return new GithubPublicationJournalComposition().githubPublicationJournal(
			input.client,
			{ owner: input.owner, repo: input.repo, issue_number: input.issueNumber },
			input.commentAuthorLogin,
		);
	}

	private ocgroups(
		input: PublicationAdapterInput,
		adapter: Extract<ConfiguredPublicationAdapter, { provider: "ocgroups" }>,
	) {
		const settings = adapter.settings;
		const group = CommunityGroupUrl.parse(settings.eventUrlPrefix);
		if (
			!group ||
			!input.communityEventUrlPrefixes.includes(settings.eventUrlPrefix)
		)
			throw new Error("Invalid OCGroups event URL prefix");
		const target = `${settings.eventUrlPrefix}|${settings.communityId}|${settings.groupId}`;
		return new PublicationDestinationComposition().community(
			{
				settings,
				clock: input.clock,
				approval: input.approval,
				target,
				artwork: new ContentGateComposition().create(
					input,
					input.issueNumber,
					input.commentAuthorLogin,
				),
				journal: new GithubPublicationJournalComposition().communityJournal(
					group,
					target,
					input.client,
					{
						owner: input.owner,
						repo: input.repo,
						issue_number: input.issueNumber,
					},
					input.commentAuthorLogin,
				),
				gateway: new OcgroupsEventGatewayComposition(
					new HttpsAssetImageRepositoryComposition().contentImageLoader(),
				).create(
					{
						group,
						communityId: settings.communityId,
						groupId: settings.groupId,
					},
					adapter.credentials,
				),
			},
			group,
		);
	}
}
