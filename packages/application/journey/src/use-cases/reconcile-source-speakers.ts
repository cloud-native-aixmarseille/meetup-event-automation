import type {
	MergeSourceSpeakers,
	ProposalSource,
	SpeakerCatalogStore,
	ValidateReferentialCatalog,
	ValidateReferentialCatalogArguments,
} from "@meetup-automation/referential";
import { SpeakerSynchronizationError } from "./speaker-synchronization-error.js";
import type { SpeakerSynchronizationStageRunner } from "./speaker-synchronization-stage-runner.js";

export interface ReconcileSourceSpeakersCollaborators {
	readonly speakerSynchronizationStageRunner: Pick<
		SpeakerSynchronizationStageRunner,
		"at"
	>;
	readonly mergeSourceSpeakers: Pick<MergeSourceSpeakers, "execute">;
	readonly createValidateReferentialCatalog: (
		...args: ValidateReferentialCatalogArguments
	) => ValidateReferentialCatalog;
}

export class ReconcileSourceSpeakers {
	constructor(
		private readonly collaborators: ReconcileSourceSpeakersCollaborators,
		private readonly source: ProposalSource,
		private readonly store: SpeakerCatalogStore,
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
					this.collaborators.mergeSourceSpeakers.execute(
						original.entries,
						snapshot,
						original.reservedIds,
					),
			);
		const catalog =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"validate-catalog",
				async () => this.validate(await this.store.candidate(merged.entries)),
			);
		const changed =
			await this.collaborators.speakerSynchronizationStageRunner.at(
				"save-catalog",
				() => this.store.save(original, merged.entries, merged.reservedIds),
			);
		return {
			changed,
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
}
export type ReconcileSourceSpeakersArguments =
	ConstructorParameters<typeof ReconcileSourceSpeakers> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
