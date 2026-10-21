import type { OpenFeedbackResourceId } from "./openfeedback-resource-id.js";

export interface OpenFeedbackSpeaker {
	readonly id: string;
	readonly name: string;
}

export interface OpenFeedbackTalk {
	readonly id: string;
	readonly title: string;
	readonly speakers: readonly string[];
}

export interface OpenFeedbackAgendaData {
	readonly speakers: readonly OpenFeedbackSpeaker[];
	readonly talks: readonly OpenFeedbackTalk[];
}

export interface OpenFeedbackStoredAgenda extends OpenFeedbackAgendaData {
	readonly speakers: readonly (OpenFeedbackSpeaker & {
		readonly revision: string;
	})[];
	readonly talks: readonly (OpenFeedbackTalk & { readonly revision: string })[];
}

export interface OpenFeedbackAgendaSnapshotCollaborators {
	readonly openFeedbackResourceId: Pick<OpenFeedbackResourceId, "isValid">;
}

export class OpenFeedbackAgendaSnapshot {
	constructor(
		private readonly collaborators: OpenFeedbackAgendaSnapshotCollaborators,
	) {}

	parse(body: unknown): OpenFeedbackStoredAgenda {
		if (!this.object(body))
			throw new Error("Invalid OpenFeedback agenda response");
		const speakers = this.records(body.speakers).map((speaker) => ({
			id: speaker.id,
			revision: speaker.revision,
			name: this.text(speaker.name),
		}));
		const talks = this.records(body.talks).map((talk) => {
			const ids: unknown = talk.speakers;
			if (
				!Array.isArray(ids) ||
				!ids.every((id): id is string => typeof id === "string")
			)
				throw new Error("Invalid OpenFeedback agenda response");
			return {
				id: talk.id,
				revision: talk.revision,
				title: this.text(talk.title),
				speakers: [...ids],
			};
		});
		return { speakers, talks };
	}

	private records(
		value: unknown,
	): (Record<string, unknown> & { id: string; revision: string })[] {
		if (!Array.isArray(value) || value.length > 200)
			throw new Error("Invalid OpenFeedback agenda response");
		const ids = new Set<string>();
		return value.map((record: unknown) => {
			if (
				!this.object(record) ||
				!this.collaborators.openFeedbackResourceId.isValid(record.id) ||
				typeof record.revision !== "string" ||
				!/^[a-f0-9]{64}$/.test(record.revision) ||
				ids.has(record.id)
			)
				throw new Error("Invalid OpenFeedback agenda response");
			ids.add(record.id);
			return { ...record, id: record.id, revision: record.revision };
		});
	}

	private text(value: unknown): string {
		if (value === undefined) return "";
		if (typeof value !== "string")
			throw new Error("Invalid OpenFeedback agenda response");
		return value;
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
