import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import {
	AttentionCommentRetention,
	type AttentionCommentRetentionArguments,
} from "./attention-comment-retention.js";
import { AttentionDiagnosticChecklist } from "./attention-diagnostic-checklist.js";
import {
	AttentionPresenter,
	type AttentionPresenterArguments,
} from "./attention-presenter.js";
import { AttentionRecord } from "./attention-record.js";
import { AttentionRecordFields } from "./attention-record-fields.js";
import {
	GithubAttentionClient,
	type GithubAttentionClientArguments,
} from "./github-attention-client.js";
import {
	GithubAttentionRepository,
	type GithubAttentionRepositoryArguments,
} from "./github-attention-repository.js";
import { GithubAttentionResponse } from "./github-attention-response.js";
import {
	AttentionMessages,
	type AttentionMessagesArguments,
} from "./i18n/attention-messages.js";
import {
	TrustedAttentionState,
	type TrustedAttentionStateArguments,
} from "./trusted-attention-state.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubOrganizerAttentionComposition {
	attentionRecordFields(): AttentionRecordFields {
		return new AttentionRecordFields();
	}
	attentionCommentRetention(
		...args: AttentionCommentRetentionArguments
	): AttentionCommentRetention {
		return new AttentionCommentRetention(
			{
				attentionRecord: this.attentionRecord(),
				createGithubAttentionClient: (...args) =>
					this.githubAttentionClient(...args),
				createTrustedAttentionState: (...args) =>
					this.trustedAttentionState(...args),
			},
			...args,
		);
	}
	attentionDiagnosticChecklist(): AttentionDiagnosticChecklist {
		return new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) => this.attentionMessages(...args),
		});
	}
	attentionMessages(...args: AttentionMessagesArguments): AttentionMessages {
		return new AttentionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	attentionPresenter(...args: AttentionPresenterArguments): AttentionPresenter {
		return new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
				createAttentionMessages: (...args) => this.attentionMessages(...args),
			},
			...args,
		);
	}
	attentionRecord(): AttentionRecord {
		return new AttentionRecord({
			attentionRecordFields: this.attentionRecordFields(),
			attentionStateRules:
				new CommunicationDomainComposition().attentionStateRules(),
		});
	}
	githubAttentionClient(
		...args: GithubAttentionClientArguments
	): GithubAttentionClient {
		return new GithubAttentionClient(
			{ githubAttentionResponse: this.githubAttentionResponse() },
			...args,
		);
	}
	githubAttentionRepository(
		...args: GithubAttentionRepositoryArguments
	): GithubAttentionRepository {
		return new GithubAttentionRepository(
			{
				attentionRecord: this.attentionRecord(),
				attentionStateEquality:
					new CommunicationDomainComposition().attentionStateEquality(),
				createTrustedAttentionState: (...args) =>
					this.trustedAttentionState(...args),
			},
			...args,
		);
	}
	githubAttentionResponse(): GithubAttentionResponse {
		return new GithubAttentionResponse();
	}
	trustedAttentionState(
		...args: TrustedAttentionStateArguments
	): TrustedAttentionState {
		return new TrustedAttentionState(...args);
	}
}
