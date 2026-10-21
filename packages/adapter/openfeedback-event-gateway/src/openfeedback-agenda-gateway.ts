import type { FeedbackAgenda } from "@meetup-automation/publication";
import type { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";
import type { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";
import type { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";

export interface OpenFeedbackAgendaGatewayCollaborators {
	readonly openFeedbackAgendaSnapshot: Pick<
		OpenFeedbackAgendaSnapshot,
		"parse"
	>;
	readonly openFeedbackAgendaPlan: Pick<OpenFeedbackAgendaPlan, "create">;
}

export class OpenFeedbackAgendaGateway {
	constructor(
		private readonly collaborators: OpenFeedbackAgendaGatewayCollaborators,
		private readonly records: OpenFeedbackRecordsGateway,
	) {}

	async synchronize(
		id: string,
		key: string,
		agenda: FeedbackAgenda,
	): Promise<void> {
		const speakers = await this.records.list(id, "speakers");
		const talks = await this.records.list(id, "talks");
		const current = this.collaborators.openFeedbackAgendaSnapshot.parse({
			speakers,
			talks,
		});
		const changes = this.collaborators.openFeedbackAgendaPlan.create(
			key,
			agenda,
			current,
		);
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
export type OpenFeedbackAgendaGatewayArguments =
	ConstructorParameters<typeof OpenFeedbackAgendaGateway> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
