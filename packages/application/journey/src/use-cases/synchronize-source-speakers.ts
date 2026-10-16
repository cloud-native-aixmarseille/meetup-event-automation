import {
	MergeSourceSpeakers,
	ProposalSourceError,
	type ProposalSource,
	type SpeakerCatalogStore,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { IssueFormProjection } from "../ports/issue-form-projection.js";

export class SynchronizeSourceSpeakers {
	constructor(
		private readonly source: ProposalSource,
		private readonly store: SpeakerCatalogStore,
		private readonly form: IssueFormProjection,
	) {}
	async execute() {
		const original = await this.store.read();
		const snapshot = await this.source.load();
		const merged = new MergeSourceSpeakers().execute(
			original.rows,
			snapshot,
			original.state,
		);
		const validation = await new ValidateReferentialCatalog().execute(
			await this.store.candidate(merged.rows),
		);
		if (!validation.isValid) throw new ProposalSourceError("invalid");
		const projectionInput = {
			issueFormPath: ".github/ISSUE_TEMPLATE/meetup.yml",
			occurrenceStatusFieldId: "event_status",
			catalog: validation.catalog,
		};
		const check = await this.form.synchronize({
			...projectionInput,
			mode: "check",
		});
		if (check.diagnostics.some((item) => item.severity === "error"))
			throw new ProposalSourceError("invalid");
		const changed = await this.store.save(original, merged.rows, merged.state);
		const form = await this.form.synchronize({
			...projectionInput,
			mode: "fix",
		});
		if (form.diagnostics.some((item) => item.severity === "error"))
			throw new ProposalSourceError("invalid");
		return {
			changed: changed || form.changed,
			speakerCount: validation.catalog.speakers.length,
		};
	}
}
