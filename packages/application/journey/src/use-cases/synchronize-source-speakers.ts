import type {
	MergeSourceSpeakers,
	ProposalSource,
	ReferentialCatalog,
	SpeakerCatalogStore,
	ValidateReferentialCatalog,
	ValidateReferentialCatalogArguments,
} from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type {
	IssueFormProjection,
	IssueFormProjectionMode,
} from "../ports/issue-form-projection.js";
import { SpeakerSynchronizationError } from "./speaker-synchronization-error.js";
import type { SpeakerSynchronizationStageRunner } from "./speaker-synchronization-stage-runner.js";

export interface SynchronizeSourceSpeakersCollaborators {
	readonly speakerSynchronizationStageRunner: Pick<
		SpeakerSynchronizationStageRunner,
		"at"
	>;
	readonly createMergeSourceSpeakers: () => MergeSourceSpeakers;
	readonly createValidateReferentialCatalog: (
		...args: ValidateReferentialCatalogArguments
	) => ValidateReferentialCatalog;
}

export class SynchronizeSourceSpeakers {
	constructor(
		private readonly collaborators: SynchronizeSourceSpeakersCollaborators,
		private readonly source: ProposalSource,
		private readonly store: SpeakerCatalogStore,
		private readonly form: IssueFormProjection,
		private readonly config: Pick<
			AutomationConfig["event"],
			"issue-form" | "occurrence-status-field"
		>,
	) {}
	async execute() {
		const original =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"read-catalog",
				() => this.store.read(),
			);
		const snapshot =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"load-source",
				() => this.source.load(),
			);
		const merged =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"merge-speakers",
				() =>
					this.collaborators
						.createMergeSourceSpeakers()
						.execute(original.entries, snapshot, original.reservedIds),
			);
		const catalog =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"validate-catalog",
				async () => this.validate(await this.store.candidate(merged.entries)),
			);
		await this.collaborators.speakerSynchronizationStageRunner.at(
			"check-form",
			() => this.project(catalog, "check"),
		);
		const changed =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"save-catalog",
				() => this.store.save(original, merged.entries, merged.reservedIds),
			);
		const form = await this.collaborators.speakerSynchronizationStageRunner.at(
			"update-form",
			() => this.project(catalog, "fix"),
		);
		return {
			changed: changed || form.changed,
			speakerCount: catalog.speakers.length,
		};
	}
	private async validate(
		input: Parameters<ValidateReferentialCatalog["execute"]>[0],
	) {
		const validation = await this.collaborators
			.createValidateReferentialCatalog()
			.execute(input);
		if (!validation.isValid)
			throw new SpeakerSynchronizationError(
				"validate-catalog",
				undefined,
				validation.diagnostics.map(({ path, ...item }) => ({
					...item,
					field: path,
				})),
			);
		return validation.catalog;
	}
	private async project(
		catalog: ReferentialCatalog,
		mode: IssueFormProjectionMode,
	) {
		const result = await this.form.synchronize({
			issueFormPath: this.config["issue-form"],
			occurrenceStatusFieldId: this.config["occurrence-status-field"],
			catalog,
			mode,
		});
		if (result.diagnostics.some((item) => item.severity === "error"))
			throw new SpeakerSynchronizationError(
				mode === "check" ? "check-form" : "update-form",
				undefined,
				result.diagnostics,
			);
		return result;
	}
}
export type SynchronizeSourceSpeakersArguments =
	ConstructorParameters<typeof SynchronizeSourceSpeakers> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
