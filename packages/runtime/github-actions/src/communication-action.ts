import { ConferenceHallInput } from "./conference-hall-input.js";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { CommunicationDiagnostic } from "@meetup-automation/communication";
import type { CommunicationJourneyDiagnostic } from "@meetup-automation/journey";
import type { PublicDiagnostic } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import { CommunicationRuntime } from "./communication.js";
import { CommunicationComposition } from "./communication-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { RuntimeInput } from "./runtime-input.js";

const COMMUNICATION_MESSAGES: Readonly<
	Record<CommunicationDiagnostic["code"], string>
> = {
	"duplicate-intent": "A duplicate communication intent was ignored.",
	"gateway-delivery-uncertain": "A gateway could not confirm delivery.",
	"gateway-delivery-rejected":
		"A gateway definitively rejected the delivery request.",
	"gateway-delivery-deferred":
		"A gateway deferred the request; a later retry remains safe.",
	"gateway-threw-ambiguous-error":
		"A gateway failed without a definitive delivery outcome.",
	"invalid-clock": "The communication clock is invalid.",
	"invalid-event-date": "The event date is invalid.",
	"invalid-identifier": "A stable communication identifier is invalid.",
	"invalid-readiness-window": "The readiness reminder window is invalid.",
	"invalid-time-zone": "The configured time zone is invalid.",
	"ledger-read-failed": "The delivery ledger could not be read.",
	"ledger-reservation-failed": "The delivery could not be reserved safely.",
	"ledger-status-write-failed": "The delivery status could not be recorded.",
	"missing-mail-destination": "An opted-in mail recipient has no destination.",
	"missing-notification-content": "Notification content is unavailable.",
	"occurrence-status-unknown": "The event occurrence status must be explicit.",
	"delivery-already-recorded":
		"The delivery ledger already contains this intent.",
};

const RUNTIME_MESSAGES: Readonly<
	Record<CommunicationJourneyDiagnostic["code"], string>
> = {
	"communication.feedback-unavailable":
		"Speaker thank-you emails require resolved feedback results for every talk.",
	"communication.slides-unavailable":
		"Email dispatch requires a valid presentation file URL and ready managed content. Resolve asset diagnostics and run reconciliation again.",
	"communication.approval-pending":
		"Email dispatch is waiting for approval on the meetup issue.",
	"communication.approval-rejected":
		"The email batch was rejected. The recorded decision is final for this batch revision.",
	"communication.approval-unavailable":
		"The organizer approval could not be verified or persisted; email dispatch is blocked.",
	"communication.approval-notification-failed":
		"The Slack approval notification or decision reaction was not confirmed. Review the request on the meetup issue.",
	"communication.dispatch-disabled-by-config":
		"Communication dispatch is disabled by repository configuration.",
	"communication.checklist-update-failed":
		"Delivery results are recorded but checklist completion could not be persisted.",
	"communication.event-skipped": "The issue is not a configured meetup event.",
	"communication.event-concurrently-modified":
		"The meetup issue changed while communications were being reconciled; no delivery was attempted.",
	"communication.event-references-unresolved":
		"Event participants could not be resolved to stable identifiers.",
	"communication.github-credential-missing":
		"The GitHub credential is unavailable.",
	"communication.referential-catalog-invalid":
		"Communications are disabled because the referential catalog is invalid.",
};

export class CommunicationAction {
	static async runCommunicationReconcileAction(
		messages = new ActionMessages(),
	): Promise<ActionReportData> {
		const reportErrorsToIssue = RuntimeInput.booleanInput(
			"report-errors-to-issue",
			core.getInput("report-errors-to-issue", { required: true }),
		);
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const slidesReady = RuntimeInput.booleanInput(
			"slides-ready",
			core.getInput("slides-ready", { required: true }),
		);
		const { owner, repo } = context.repo;
		const outcome = await CommunicationRuntime.runCommunicationReconcile({
			locale: messages.locale,
			...ConferenceHallInput.read(),
			issueNumber,
			slidesUrl: slidesReady
				? core.getInput("slides-url", { required: true })
				: undefined,
			slidesReady,
			openFeedbackApiKey: core.getInput("openfeedback-api-key", {
				required: true,
			}),

			githubToken: core.getInput("github-token", { required: true }),
			mailingsToken: core.getInput("mailings-token", { required: true }),
			slackToken: core.getInput("slack-token", { required: true }),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
			owner,
			repo,
			repositoryId: process.env.GITHUB_REPOSITORY_ID,
			managedCommentAuthor: core.getInput("managed-comment-author", {
				required: true,
			}),
		});
		const report = CommunicationAction.report(outcome, messages);
		return reportErrorsToIssue
			? CommunicationAction.reportToIssue(issueNumber, report, messages)
			: report;
	}

	private static async reportToIssue(
		issueNumber: number,
		report: ActionReportData,
		messages: ActionMessages,
	): Promise<ActionReportData> {
		return CommunicationComposition.createIssueReport({
			...context.repo,
			issueNumber,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
		}).reconcile(report);
	}

	static domainDiagnostic(
		diagnostic: CommunicationDiagnostic,
	): PublicDiagnostic {
		return {
			code: `communication.${diagnostic.code}`,
			severity: diagnostic.severity,
			message: COMMUNICATION_MESSAGES[diagnostic.code],
		};
	}

	static runtimeDiagnostic(
		diagnostic: CommunicationJourneyDiagnostic,
	): PublicDiagnostic {
		return {
			code: diagnostic.code,
			severity: diagnostic.severity,
			message: RUNTIME_MESSAGES[diagnostic.code],
		};
	}

	private static report(
		outcome: Awaited<
			ReturnType<typeof CommunicationRuntime.runCommunicationReconcile>
		>,
		messages: ActionMessages,
	): ActionReportData {
		const diagnostics = [
			...outcome.diagnostics.map(CommunicationAction.domainDiagnostic),
			...outcome.runtimeDiagnostics.map(CommunicationAction.runtimeDiagnostic),
		];

		return {
			details: [
				messages.t("report.communication.mode", { mode: outcome.mode }),
				messages.t("report.communication.planned", outcome.counts),
				messages.t("report.communication.accepted", {
					...outcome.counts,
					recorded: outcome.counts.alreadyRecorded,
				}),
				messages.t("report.communication.uncertain", outcome.counts),
				...(diagnostics.length > 0
					? [messages.t("report.communication.guidance")]
					: []),
				...(outcome.counts.uncertain > 0
					? [messages.t("report.communication.uncertain-guidance")]
					: []),
			],
			diagnostics,
			...(diagnostics.some(({ severity }) => severity === "error")
				? {
						failure: messages.t("report.communication.failed"),
					}
				: {}),
		};
	}
}
