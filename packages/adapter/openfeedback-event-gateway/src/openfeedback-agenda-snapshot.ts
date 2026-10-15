import { OpenFeedbackResourceId } from "./openfeedback-resource-id.js";

type StoredRecord = Record<string, unknown> & { id: string; revision: string };

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

export class OpenFeedbackAgendaSnapshot {
	static parse(body: Record<string, unknown>): OpenFeedbackStoredAgenda {
		if (
			!OpenFeedbackAgendaSnapshot.records(body.speakers, "name") ||
			!OpenFeedbackAgendaSnapshot.records(body.talks, "title")
		)
			throw new Error("Invalid OpenFeedback agenda response");
		if (
			body.talks.some(
				(talk) =>
					!Array.isArray(talk.speakers) ||
					talk.speakers.some((id) => typeof id !== "string"),
			)
		)
			throw new Error("Invalid OpenFeedback agenda response");
		return {
			speakers: body.speakers.map((speaker) => ({
				id: speaker.id,
				revision: speaker.revision,
				name: (speaker.name as string | undefined) ?? "",
			})),
			talks: body.talks.map((talk) => ({
				id: talk.id,
				revision: talk.revision,
				title: (talk.title as string | undefined) ?? "",
				speakers: talk.speakers as string[],
			})),
		};
	}

	private static records(
		value: unknown,
		field: "name" | "title",
	): value is StoredRecord[] {
		if (!Array.isArray(value) || value.length > 200) return false;
		const ids = new Set<string>();
		for (const record of value) {
			if (
				!record ||
				typeof record !== "object" ||
				!OpenFeedbackResourceId.isValid(record.id) ||
				typeof record.revision !== "string" ||
				!/^[a-f0-9]{64}$/.test(record.revision) ||
				(record[field] !== undefined && typeof record[field] !== "string") ||
				ids.has(record.id)
			)
				return false;
			ids.add(record.id);
		}
		return true;
	}
}
