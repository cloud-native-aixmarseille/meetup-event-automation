import { fileURLToPath } from "node:url";
import type { EventClock } from "@meetup-automation/event";
import { GithubPublicationJournalComposition } from "@meetup-automation/github-publication-journal";
import { HcaptchaCaptchaResolverComposition } from "@meetup-automation/hcaptcha-captcha-resolver";
import {
	type OrganizerApproval,
	PublicationDestinationComposition,
} from "@meetup-automation/journey";
import { MeetupEventGatewayComposition } from "@meetup-automation/meetup-event-gateway";
import { OcgroupsEventGatewayComposition } from "@meetup-automation/ocgroups-event-gateway";
import {
	CommunityGroupUrl,
	MeetupGroupUrl,
} from "@meetup-automation/publication";
import type { EventCompositionInput } from "./composition.js";
import type { ConfiguredPublicationAdapter } from "./publication-credentials-input.js";

type PublicationAdapterInput = EventCompositionInput & {
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
		return new PublicationDestinationComposition().meetup(
			{
				settings: adapter.settings,
				clock: input.clock,
				approval: input.approval,
				journal:
					new GithubPublicationJournalComposition().githubPublicationJournal(
						input.client,
						{
							owner: input.owner,
							repo: input.repo,
							issue_number: input.issueNumber,
						},
						input.commentAuthorLogin,
					),
				gateway: new MeetupEventGatewayComposition()
					.meetupEventGatewayFactory()
					.create({ email, password }, resolver, group.value),
			},
			group,
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
				gateway: new OcgroupsEventGatewayComposition().create(
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
