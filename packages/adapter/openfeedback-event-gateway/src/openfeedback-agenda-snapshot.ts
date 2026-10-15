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
		const speakers =
			body.speakers as unknown as OpenFeedbackStoredAgenda["speakers"];
		const talks = body.talks as unknown as OpenFeedbackStoredAgenda["talks"];
		const ids = new Set(speakers.map((speaker) => speaker.id));
		if (
			talks.some(
				(talk) =>
					!Array.isArray(talk.speakers) ||
					new Set(talk.speakers).size !== talk.speakers.length ||
					talk.speakers.some((id) => !ids.has(id)),
			)
		)
			throw new Error("Invalid OpenFeedback agenda response");
		return { speakers, talks };
	}

	private static records(
		value: unknown,
		field: "name" | "title",
	): value is Record<string, unknown>[] {
		if (!Array.isArray(value) || value.length > 200) return false;
		const ids = new Set<string>();
		for (const record of value) {
			if (
				!record ||
				typeof record !== "object" ||
				typeof record.id !== "string" ||
				!/^(?!__.*__$)[a-zA-Z0-9_-]{1,100}$/.test(record.id) ||
				typeof record.revision !== "string" ||
				!/^[a-f0-9]{64}$/.test(record.revision) ||
				typeof record[field] !== "string" ||
				!record[field].trim() ||
				ids.has(record.id)
			)
				return false;
			ids.add(record.id);
		}
		return true;
	}
}
