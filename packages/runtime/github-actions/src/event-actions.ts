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
	resultEnvelope,
} from "@meetup-automation/journey";
import { setDiagnosticsOutput, setJsonOutput } from "./action-output.js";
import { createEventContainer, SERVICES } from "./composition.js";
import { enumInput, positiveIntegerInput } from "./runtime-input.js";

export async function runEventReconcileAction(): Promise<void> {
	const issueNumber = positiveIntegerInput(
		"issue-number",
		core.getInput("issue-number", { required: true }),
	);
	const mode = enumInput("mode", core.getInput("mode", { required: true }), [
		"check",
		"fix",
	] as const);
	const token = core.getInput("github-token", { required: true });
	const commentAuthorLogin = core.getInput("managed-comment-author", {
		required: true,
	});
	const { owner, repo } = context.repo;
	const repository = `${owner}/${repo}`;
	const container = createEventContainer({
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

	setJsonOutput("result", resultEnvelope(data, outcome.diagnostics));
	core.setOutput("state", outcome.skipped ? "skipped" : outcome.state);
	core.setOutput(
		"is-ready",
		outcome.skipped ? "false" : String(outcome.isReady),
	);
	setDiagnosticsOutput(outcome.diagnostics);
}

export async function runEventListActiveAction(): Promise<void> {
	const token = core.getInput("github-token", { required: true });
	const { owner, repo } = context.repo;
	const repository = `${owner}/${repo}`;
	const container = createEventContainer({
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
	const diagnostics = outcome.diagnostics.map(toPublicDiagnostic);

	setJsonOutput(
		"result",
		resultEnvelope({ issueNumbers, count: issueNumbers.length }, diagnostics),
	);
	setJsonOutput("issue-numbers", issueNumbers);
	setDiagnosticsOutput(diagnostics);
}

function toPublicDiagnostic(diagnostic: EventDiagnostic): PublicDiagnostic {
	return {
		code: diagnostic.code,
		severity: diagnostic.severity,
		message: diagnostic.message,
		...(diagnostic.field ? { field: diagnostic.field } : {}),
	};
}
