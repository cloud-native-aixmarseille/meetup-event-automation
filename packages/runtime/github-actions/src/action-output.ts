import * as core from "@actions/core";
import type { PublicDiagnostic } from "@meetup-automation/journey";

export class ActionOutput {
	static setJsonOutput(name: string, value: unknown): void {
		core.setOutput(name, JSON.stringify(value));
	}

	static setDiagnosticsOutput(diagnostics: readonly PublicDiagnostic[]): void {
		ActionOutput.setJsonOutput("diagnostics", diagnostics);
	}
}
