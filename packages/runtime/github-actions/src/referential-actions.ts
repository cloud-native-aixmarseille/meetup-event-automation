import * as core from "@actions/core";
import {
	ResultEnvelopeFactory,
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import { ActionOutput } from "./action-output.js";
import { EventComposition } from "./composition.js";
import { RuntimeInput } from "./runtime-input.js";

export class ReferentialActions {
	static async runReferentialValidateAction(): Promise<void> {
		const outcome = await EventComposition.createReferentialContainer()
			.get(ValidateMeetupReferentials)
			.execute();
		const counts = outcome.isValid
			? {
					hostCount: outcome.catalog.hosts.length,
					speakerCount: outcome.catalog.speakers.length,
				}
			: { hostCount: 0, speakerCount: 0 };

		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(
				{ isValid: outcome.isValid, ...counts },
				outcome.diagnostics,
			),
		);
		core.setOutput("is-valid", String(outcome.isValid));
		core.setOutput("host-count", String(counts.hostCount));
		core.setOutput("speaker-count", String(counts.speakerCount));
		ActionOutput.setDiagnosticsOutput(outcome.diagnostics);
	}

	static async runReferentialSyncIssueFormAction(): Promise<void> {
		const mode = RuntimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
		const outcome = await EventComposition.createReferentialContainer()
			.get(SynchronizeMeetupIssueForm)
			.execute({ mode });

		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(
				{ changed: outcome.changed, changedFiles: outcome.changedFiles },
				outcome.diagnostics,
			),
		);
		core.setOutput("changed", String(outcome.changed));
		ActionOutput.setJsonOutput("changed-files", outcome.changedFiles);
		ActionOutput.setDiagnosticsOutput(outcome.diagnostics);
	}
}
