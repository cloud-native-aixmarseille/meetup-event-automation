import { LocalizationComposition } from "@meetup-automation/localization";
import {
	GithubDeliveryLedger,
	type GithubDeliveryLedgerArguments,
} from "./github-delivery-ledger.js";
import {
	LedgerMessages,
	type LedgerMessagesArguments,
} from "./i18n/ledger-messages.js";
import { LedgerCommentCodec } from "./ledger-comment-codec.js";
import {
	LedgerCommentPresenter,
	type LedgerCommentPresenterArguments,
} from "./ledger-comment-presenter.js";
import { LedgerEntryMapping } from "./ledger-entry-mapping.js";
import {
	ScopedGithubLedgerCommentClient,
	type ScopedGithubLedgerCommentClientArguments,
} from "./scoped-github-ledger-comment-client.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubDeliveryLedgerComposition {
	githubDeliveryLedger(
		...args: GithubDeliveryLedgerArguments
	): GithubDeliveryLedger {
		return new GithubDeliveryLedger(
			{
				ledgerEntryMapping: this.ledgerEntryMapping(),
				ledgerCommentCodec: this.ledgerCommentCodec(),
				createLedgerCommentPresenter: (...args) =>
					this.ledgerCommentPresenter(...args),
			},
			...args,
		);
	}
	ledgerCommentCodec(): LedgerCommentCodec {
		return new LedgerCommentCodec({
			ledgerEntryMapping: this.ledgerEntryMapping(),
		});
	}
	ledgerCommentPresenter(
		...args: LedgerCommentPresenterArguments
	): LedgerCommentPresenter {
		return new LedgerCommentPresenter(
			{
				ledgerCommentCodec: this.ledgerCommentCodec(),
				createLedgerMessages: (...args) => this.ledgerMessages(...args),
			},
			...args,
		);
	}
	ledgerEntryMapping(): LedgerEntryMapping {
		return new LedgerEntryMapping();
	}
	ledgerMessages(...args: LedgerMessagesArguments): LedgerMessages {
		return new LedgerMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	scopedGithubLedgerCommentClient(
		...args: ScopedGithubLedgerCommentClientArguments
	): ScopedGithubLedgerCommentClient {
		return new ScopedGithubLedgerCommentClient(...args);
	}
}
