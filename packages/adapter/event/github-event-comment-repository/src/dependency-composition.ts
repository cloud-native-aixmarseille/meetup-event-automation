import { JourneyPolicyComposition } from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { DiagnosticCommentPresenter } from "./diagnostic-comment-presenter.js";
import { DiagnosticCommentSections } from "./diagnostic-comment-sections.js";
import { DiagnosticPresenter } from "./diagnostic-presentation.js";
import {
	GitHubEventCommentRepository,
	type GitHubEventCommentRepositoryArguments,
} from "./github-event-comment-repository.js";
import {
	EventCommentMessages,
	type EventCommentMessagesArguments,
} from "./i18n/event-comment-messages.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubEventCommentRepositoryComposition {
	diagnosticCommentSections(): DiagnosticCommentSections {
		return new DiagnosticCommentSections();
	}
	diagnosticCommentPresenter(): DiagnosticCommentPresenter {
		return new DiagnosticCommentPresenter({
			organizerDiagnosticPolicy:
				new JourneyPolicyComposition().organizerDiagnosticPolicy(),
			diagnosticPresenter: this.diagnosticPresenter(),
		});
	}
	diagnosticPresenter(): DiagnosticPresenter {
		return new DiagnosticPresenter();
	}
	eventCommentMessages(
		...args: EventCommentMessagesArguments
	): EventCommentMessages {
		return new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	gitHubEventCommentRepository(
		...args: GitHubEventCommentRepositoryArguments
	): GitHubEventCommentRepository {
		return new GitHubEventCommentRepository(
			{
				diagnosticCommentSections: this.diagnosticCommentSections(),
				diagnosticCommentPresenter: this.diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					this.eventCommentMessages(...args),
			},
			...args,
		);
	}
}
