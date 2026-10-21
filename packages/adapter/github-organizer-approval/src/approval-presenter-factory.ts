import type {
	ApprovalPresenter,
	ApprovalPresenterArguments,
} from "./approval-presenter.js";
import type {
	ApprovalMessages,
	ApprovalMessagesArguments,
} from "./i18n/approval-messages.js";
import { CATALOGS } from "./i18n/catalog.js";

export interface ApprovalPresenterFactoryCollaborators {
	readonly createApprovalPresenter: (
		...args: ApprovalPresenterArguments
	) => ApprovalPresenter;
	readonly createApprovalMessages: (
		...args: ApprovalMessagesArguments
	) => ApprovalMessages;
}

export class ApprovalPresenterFactory {
	constructor(
		private readonly collaborators: ApprovalPresenterFactoryCollaborators,
	) {}

	supportedLocales(): readonly ApprovalPresenter[] {
		return Object.keys(CATALOGS).map((locale) =>
			this.collaborators.createApprovalPresenter(
				this.collaborators.createApprovalMessages(locale),
			),
		);
	}
}
