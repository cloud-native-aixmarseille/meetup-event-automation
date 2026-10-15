import type { FeedbackAgenda } from "@meetup-automation/publication";
import type { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";
import { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";
import { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";

export class OpenFeedbackAgendaGateway {
	constructor(private readonly records: OpenFeedbackRecordsGateway) {}

	async synchronize(
		id: string,
		key: string,
		agenda: FeedbackAgenda,
	): Promise<void> {
		const speakers = await this.records.list(id, "speakers");
		const talks = await this.records.list(id, "talks");
		const current = OpenFeedbackAgendaSnapshot.parse({ speakers, talks });
		const changes = OpenFeedbackAgendaPlan.create(key, agenda, current);
		for (const speaker of changes.speakers)
			await this.records.synchronize(
				id,
				"speakers",
				speaker,
				current.speakers.find((item) => item.id === speaker.id),
			);
		for (const talk of changes.talks)
			await this.records.synchronize(
				id,
				"talks",
				talk,
				current.talks.find((item) => item.id === talk.id),
			);
	}
}
