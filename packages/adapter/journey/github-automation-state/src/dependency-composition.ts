import { LocalizationComposition } from "@meetup-automation/localization";
import { AutomationStateCodec } from "./automation-state-codec.js";
import { AutomationStatePresenter } from "./automation-state-presenter.js";
import { GithubAutomationState } from "./github-automation-state.js";
import { StateMessages } from "./i18n/state-messages.js";
import type { StateCommentClient } from "./state-comment-client.js";
import { StateEditAuthority } from "./state-edit-authority.js";
import { TrustedStateComments } from "./trusted-state-comments.js";
export class GithubAutomationStateComposition {
	create(
		client: StateCommentClient,
		author: string,
		locale: string | undefined,
		visibility: ConstructorParameters<typeof GithubAutomationState>[4],
	): GithubAutomationState {
		const codec = new AutomationStateCodec();
		return new GithubAutomationState(
			client,
			new TrustedStateComments(
				client,
				codec,
				author,
				new StateEditAuthority(client, codec, author),
			),
			codec,
			new AutomationStatePresenter(
				codec,
				new StateMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			),
			visibility,
		);
	}
}
