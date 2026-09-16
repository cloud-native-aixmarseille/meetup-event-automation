import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
	type EventDiagnostic,
	ListActiveEvents,
} from "@meetup-automation/event";
import {
	type AutomationConfig,
	ManageMeetupEvent,
	type PublicDiagnostic,
	ResultEnvelopeFactory,
} from "@meetup-automation/journey";
import { ActionOutput } from "./action-output.js";
import { EventComposition, SERVICES } from "./composition.js";
import { RuntimeInput } from "./runtime-input.js";

export class EventActions {
	static async runEventReconcileAction(): Promise<void> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const mode = RuntimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
		const token = core.getInput("github-token", { required: true });
		const commentAuthorLogin = core.getInput("managed-comment-author", {
			required: true,
		});
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const container = EventComposition.createEventContainer({
			client: getOctokit(token),
			owner,
			repo,
			commentAuthorLogin,
		});
		const outcome = await container.get(ManageMeetupEvent).execute({
			identity: { repository, issueNumber },
			mode,
		});
		const data = outcome.skipped
			? { skipped: true }
			: {
					skipped: false,
					state: outcome.state,
					isReady: outcome.isReady,
					persisted: outcome.persisted,
					commentUpdated: outcome.commentUpdated,
				};

		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(data, outcome.diagnostics),
		);
		core.setOutput("state", outcome.skipped ? "skipped" : outcome.state);
		core.setOutput(
			"is-ready",
			outcome.skipped ? "false" : String(outcome.isReady),
		);
		ActionOutput.setDiagnosticsOutput(outcome.diagnostics);
	}

	static async runEventListActiveAction(): Promise<void> {
		const token = core.getInput("github-token", { required: true });
		const { owner, repo } = context.repo;
		const repository = `${owner}/${repo}`;
		const container = EventComposition.createEventContainer({
			client: getOctokit(token),
			owner,
			repo,
			commentAuthorLogin: "github-actions[bot]",
		});
		const config = container.get<AutomationConfig>(SERVICES.config);
		const outcome = await container.get(ListActiveEvents).execute({
			repository,
			label: config.event["issue-label"],
			includeClosed: true,
			pageSize: 100,
		});
		const issueNumbers = outcome.events.map(
			(event) => event.identity.issueNumber,
		);
		const diagnostics = outcome.diagnostics.map(
			EventActions.toPublicDiagnostic,
		);

		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(
				{ issueNumbers, count: issueNumbers.length },
				diagnostics,
			),
		);
		ActionOutput.setJsonOutput("issue-numbers", issueNumbers);
		ActionOutput.setDiagnosticsOutput(diagnostics);
	}

	static toPublicDiagnostic(diagnostic: EventDiagnostic): PublicDiagnostic {
		return {
			code: diagnostic.code,
			severity: diagnostic.severity,
			message: diagnostic.message,
			...(diagnostic.field ? { field: diagnostic.field } : {}),
		};
	}
}
