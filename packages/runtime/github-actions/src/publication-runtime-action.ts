import * as core from "@actions/core";
import type { ActionReportData } from "./action-report.js";
import type { EventPublicationConfiguration } from "./event-publication-configuration.js";

export class PublicationRuntimeAction {
	constructor(
		private readonly configuration: Pick<EventPublicationConfiguration, "load">,
		private readonly runtimeDirectory: string,
	) {}
	async run(): Promise<ActionReportData> {
		const configuration = await this.configuration.load(process.cwd());
		core.setOutput("runtime-directory", this.runtimeDirectory);
		core.setOutput(
			"requires-challenge-solver",
			configuration.destinations.some(
				(destination) => destination.provider === "meetup",
			),
		);
		return { details: [], diagnostics: [] };
	}
}
