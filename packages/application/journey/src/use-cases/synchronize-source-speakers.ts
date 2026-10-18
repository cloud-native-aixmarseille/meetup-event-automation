import {
	MergeSourceSpeakers,
	type ReferentialCatalog,
	type ProposalSource,
	type SpeakerCatalogStore,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type {
	IssueFormProjection,
	IssueFormProjectionMode,
} from "../ports/issue-form-projection.js";
import { SpeakerSynchronizationError } from "./speaker-synchronization-error.js";

export class SynchronizeSourceSpeakers {
	constructor(
		private readonly source: ProposalSource,
		private readonly store: SpeakerCatalogStore,
		private readonly form: IssueFormProjection,
	) {}
	async execute() {
		const original = await SpeakerSynchronizationError.at("read-catalog", () =>
			this.store.read(),
		);
		const snapshot = await SpeakerSynchronizationError.at("load-source", () =>
			this.source.load(),
		);
		const merged = await SpeakerSynchronizationError.at("merge-speakers", () =>
			new MergeSourceSpeakers().execute(
				original.rows,
				snapshot,
				original.state,
			),
		);
		const catalog = await SpeakerSynchronizationError.at(
			"validate-catalog",
			async () => this.validate(await this.store.candidate(merged.rows)),
		);
		await SpeakerSynchronizationError.at("check-form", () =>
			this.project(catalog, "check"),
		);
		const changed = await SpeakerSynchronizationError.at("save-catalog", () =>
			this.store.save(original, merged.rows, merged.state),
		);
		const form = await SpeakerSynchronizationError.at("update-form", () =>
			this.project(catalog, "fix"),
		);
		return {
			changed: changed || form.changed,
			speakerCount: catalog.speakers.length,
		};
	}
	private async validate(
		input: Parameters<ValidateReferentialCatalog["execute"]>[0],
	) {
		const validation = await new ValidateReferentialCatalog().execute(input);
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
			issueFormPath: ".github/ISSUE_TEMPLATE/meetup.yml",
			occurrenceStatusFieldId: "event_status",
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
