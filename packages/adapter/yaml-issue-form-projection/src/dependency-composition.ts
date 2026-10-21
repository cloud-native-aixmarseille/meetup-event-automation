import { LocalizationComposition } from "@meetup-automation/localization";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import {
	IssueFormMessages,
	type IssueFormMessagesArguments,
} from "./i18n/issue-form-messages.js";
import {
	SpeakerReferencesPresenter,
	type SpeakerReferencesPresenterArguments,
} from "./speaker-references-presenter.js";
import { YamlIssueFormDocument } from "./yaml-issue-form-document.js";
import {
	YamlIssueFormProjection,
	type YamlIssueFormProjectionArguments,
} from "./yaml-issue-form-projection.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class YamlIssueFormProjectionComposition {
	issueFormMessages(...args: IssueFormMessagesArguments): IssueFormMessages {
		return new IssueFormMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	speakerReferencesPresenter(
		...args: SpeakerReferencesPresenterArguments
	): SpeakerReferencesPresenter {
		return new SpeakerReferencesPresenter(...args);
	}
	yamlIssueFormDocument(): YamlIssueFormDocument {
		return new YamlIssueFormDocument();
	}
	yamlIssueFormProjection(
		...args: YamlIssueFormProjectionArguments
	): YamlIssueFormProjection {
		return new YamlIssueFormProjection(
			{
				yamlIssueFormDocument: this.yamlIssueFormDocument(),
				createProjectReferentialChoices: (...args) =>
					new ReferentialDomainComposition().projectReferentialChoices(...args),
				createSpeakerReferencesPresenter: (...args) =>
					this.speakerReferencesPresenter(...args),
				createIssueFormMessages: (...args) => this.issueFormMessages(...args),
			},
			...args,
		);
	}
}
