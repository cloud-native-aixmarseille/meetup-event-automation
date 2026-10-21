import {
	FollowUpApprovalPolicy,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { ApprovalCommentCodec } from "./approval-comment-codec.js";
import {
	ApprovalDecisionParser,
	type ApprovalDecisionParserArguments,
} from "./approval-decision-parser.js";
import {
	ApprovalDetailsPresenter,
	type ApprovalDetailsPresenterArguments,
} from "./approval-details-presenter.js";
import { ApprovalDetailsPreview } from "./approval-details-preview.js";
import {
	ApprovalNotifications,
	type ApprovalNotificationsArguments,
} from "./approval-notifications.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { ApprovalPresenterFactory } from "./approval-presenter-factory.js";
import {
	ApprovalRecordFactory,
	type ApprovalRecordFactoryArguments,
} from "./approval-record-factory.js";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import { ApprovalSchema } from "./approval-schema.js";
import { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";
import {
	EmailApprovalPresenter,
	type EmailApprovalPresenterArguments,
} from "./email-approval-presenter.js";
import {
	FinalizeApprovalDecision,
	type FinalizeApprovalDecisionArguments,
} from "./finalize-approval-decision.js";
import {
	FollowUpPresenter,
	type FollowUpPresenterArguments,
} from "./follow-up-presenter.js";
import { FollowUpSchema } from "./follow-up-schema.js";
import {
	GithubApprovalAttentionSource,
	type GithubApprovalAttentionSourceArguments,
} from "./github-approval-attention-source.js";
import {
	GithubApprovalClient,
	type GithubApprovalClientArguments,
} from "./github-approval-client.js";
import {
	GithubApprovalRepository,
	type GithubApprovalRepositoryArguments,
} from "./github-approval-repository.js";
import { GithubApprovalResponse } from "./github-approval-response.js";
import {
	GithubFollowUpAttentionRepository,
	type GithubFollowUpAttentionRepositoryArguments,
} from "./github-follow-up-attention-repository.js";
import {
	GithubOrganizerApproval,
	type GithubOrganizerApprovalArguments,
} from "./github-organizer-approval.js";
import {
	GithubOrganizerFollowUp,
	type GithubOrganizerFollowUpArguments,
} from "./github-organizer-follow-up.js";
import {
	ApprovalMessages,
	type ApprovalMessagesArguments,
} from "./i18n/approval-messages.js";
import { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";
import {
	MeetupApprovalPresenter,
	type MeetupApprovalPresenterArguments,
} from "./meetup-approval-presenter.js";
import {
	ResolveApprovalDecision,
	type ResolveApprovalDecisionArguments,
} from "./resolve-approval-decision.js";
import { StoredApprovalSchema } from "./stored-approval-schema.js";
import {
	TrustedApprovalState,
	type TrustedApprovalStateArguments,
} from "./trusted-approval-state.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubOrganizerApprovalComposition {
	approvalCommentCodec(): ApprovalCommentCodec {
		return new ApprovalCommentCodec({
			storedApprovalSchema: this.storedApprovalSchema(),
		});
	}
	approvalDecisionParser(
		...args: ApprovalDecisionParserArguments
	): ApprovalDecisionParser {
		return new ApprovalDecisionParser(
			new JourneyPolicyComposition().approvalRequestPolicy(),
			...args,
		);
	}
	approvalDetailsPresenter(
		...args: ApprovalDetailsPresenterArguments
	): ApprovalDetailsPresenter {
		return new ApprovalDetailsPresenter(...args);
	}
	approvalDetailsPreview(): ApprovalDetailsPreview {
		return new ApprovalDetailsPreview();
	}
	approvalMessages(...args: ApprovalMessagesArguments): ApprovalMessages {
		return new ApprovalMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	approvalNotifications(
		...args: ApprovalNotificationsArguments
	): ApprovalNotifications {
		return new ApprovalNotifications(...args);
	}
	approvalPresenter(messages: ApprovalMessages): ApprovalPresenter {
		const email = this.emailApprovalPresenter(messages);
		return new ApprovalPresenter(this.approvalCommentCodec(), {
			"email-introduction": email,
			"email-thanks": email,
			"meetup-publication": this.meetupApprovalPresenter(messages),
		});
	}

	approvalPresenterFactory(): ApprovalPresenterFactory {
		return new ApprovalPresenterFactory({
			createApprovalPresenter: (...args) => this.approvalPresenter(...args),
			createApprovalMessages: (...args) => this.approvalMessages(...args),
		});
	}
	approvalRecordFactory(
		...args: ApprovalRecordFactoryArguments
	): ApprovalRecordFactory {
		return new ApprovalRecordFactory(
			{
				approvalRequestSchema: this.approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				storedApprovalSchema: this.storedApprovalSchema(),
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
			},
			...args,
		);
	}
	approvalRequestSchema(): ApprovalRequestSchema {
		return new ApprovalRequestSchema({
			approvalSchema: this.approvalSchema(),
			meetupApprovalDetailsSchema: this.meetupApprovalDetailsSchema(),
			emailApprovalDetailsSchema: this.emailApprovalDetailsSchema(),
		});
	}
	approvalSchema(): ApprovalSchema {
		return new ApprovalSchema();
	}
	emailApprovalDetailsSchema(): EmailApprovalDetailsSchema {
		return new EmailApprovalDetailsSchema({
			approvalSchema: this.approvalSchema(),
		});
	}
	emailApprovalPresenter(
		...args: EmailApprovalPresenterArguments
	): EmailApprovalPresenter {
		return new EmailApprovalPresenter(
			{
				followUpPresenter: this.followUpPresenter(args[0]),
				approvalDetailsPresenter: this.approvalDetailsPresenter(args[0]),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
			},
			...args,
		);
	}
	finalizeApprovalDecision(
		...args: FinalizeApprovalDecisionArguments
	): FinalizeApprovalDecision {
		return new FinalizeApprovalDecision(...args);
	}
	followUpPresenter(...args: FollowUpPresenterArguments): FollowUpPresenter {
		return new FollowUpPresenter(new FollowUpApprovalPolicy(), ...args);
	}
	followUpSchema(): FollowUpSchema {
		return new FollowUpSchema({ approvalSchema: this.approvalSchema() });
	}
	githubApprovalAttentionSource(
		...args: GithubApprovalAttentionSourceArguments
	): GithubApprovalAttentionSource {
		return new GithubApprovalAttentionSource(...args);
	}
	githubApprovalClient(
		...args: GithubApprovalClientArguments
	): GithubApprovalClient {
		return new GithubApprovalClient(
			{ githubApprovalResponse: this.githubApprovalResponse() },
			...args,
		);
	}
	githubApprovalRepository(
		...args: GithubApprovalRepositoryArguments
	): GithubApprovalRepository {
		return new GithubApprovalRepository(
			{ storedApprovalSchema: this.storedApprovalSchema() },
			...args,
		);
	}
	githubApprovalResponse(): GithubApprovalResponse {
		return new GithubApprovalResponse({
			approvalSchema: this.approvalSchema(),
		});
	}
	githubFollowUpAttentionRepository(
		...args: GithubFollowUpAttentionRepositoryArguments
	): GithubFollowUpAttentionRepository {
		return new GithubFollowUpAttentionRepository(...args);
	}
	githubOrganizerApproval(
		...args: GithubOrganizerApprovalArguments
	): GithubOrganizerApproval {
		return new GithubOrganizerApproval(
			{
				approvalRequestSchema: this.approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview: this.approvalDetailsPreview(),
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
			},
			...args,
		);
	}
	githubOrganizerFollowUp(
		...args: GithubOrganizerFollowUpArguments
	): GithubOrganizerFollowUp {
		return new GithubOrganizerFollowUp(new FollowUpApprovalPolicy(), ...args);
	}
	meetupApprovalDetailsSchema(): MeetupApprovalDetailsSchema {
		return new MeetupApprovalDetailsSchema({
			approvalSchema: this.approvalSchema(),
			scheduledEventPolicy:
				new PublicationDomainComposition().scheduledEventPolicy(),
		});
	}
	meetupApprovalPresenter(
		...args: MeetupApprovalPresenterArguments
	): MeetupApprovalPresenter {
		return new MeetupApprovalPresenter(...args);
	}
	resolveApprovalDecision(
		...args: ResolveApprovalDecisionArguments
	): ResolveApprovalDecision {
		return new ResolveApprovalDecision(...args);
	}
	storedApprovalSchema(): StoredApprovalSchema {
		return new StoredApprovalSchema({
			approvalSchema: this.approvalSchema(),
			approvalRequestSchema: this.approvalRequestSchema(),
			followUpSchema: this.followUpSchema(),
			approvalRequestPolicy:
				new JourneyPolicyComposition().approvalRequestPolicy(),
		});
	}
	trustedApprovalState(
		...args: TrustedApprovalStateArguments
	): TrustedApprovalState {
		return new TrustedApprovalState(
			{ approvalCommentCodec: this.approvalCommentCodec() },
			...args,
		);
	}
}
