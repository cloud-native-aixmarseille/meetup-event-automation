import * as core from "@actions/core";
import type { PublicDiagnostic } from "@meetup-automation/journey";

export class ActionOutput {
	setJsonOutput(name: string, value: unknown): void {
		core.setOutput(name, JSON.stringify(value));
	}

	setDiagnosticsOutput(diagnostics: readonly PublicDiagnostic[]): void {
		this.setJsonOutput("diagnostics", diagnostics);
	}
}
