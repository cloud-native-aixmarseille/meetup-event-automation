import {
	type FeedbackPolicy,
	FeedbackResolutionError,
	type FeedbackTalkResult,
	type FeedbackTalkResultsGateway,
} from "@meetup-automation/publication";
import type { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";
import type { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";
import type {
	OpenFeedbackClient,
	OpenFeedbackClientArguments,
} from "./openfeedback-client.js";
import type { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";
import type {
	OpenFeedbackRecordsGateway,
	OpenFeedbackRecordsGatewayArguments,
} from "./openfeedback-records-gateway.js";

export interface OpenFeedbackTalkResultsGatewayCollaborators {
	readonly openFeedbackAgendaSnapshot: Pick<
		OpenFeedbackAgendaSnapshot,
		"parse"
	>;
	readonly openFeedbackAgendaPlan: Pick<OpenFeedbackAgendaPlan, "create">;
	readonly openFeedbackRecordEquality: Pick<
		OpenFeedbackRecordEquality,
		"sameSpeakers"
	>;
	readonly feedbackPolicy: Pick<FeedbackPolicy, "pollUrl">;
	readonly createOpenFeedbackRecordsGateway: (
		...args: OpenFeedbackRecordsGatewayArguments
	) => OpenFeedbackRecordsGateway;
	readonly createOpenFeedbackClient: (
		...args: OpenFeedbackClientArguments
	) => OpenFeedbackClient;
}

export class OpenFeedbackTalkResultsGateway
	implements FeedbackTalkResultsGateway
{
	constructor(
		private readonly collaborators: OpenFeedbackTalkResultsGatewayCollaborators,
		private readonly apiKey: string,
		private readonly fetcher: typeof fetch = fetch,
	) {}

	async resolve(
		input: Parameters<FeedbackTalkResultsGateway["resolve"]>[0],
	): Promise<readonly FeedbackTalkResult[]> {
		const eventId = this.eventId(input.url);
		const records = this.collaborators.createOpenFeedbackRecordsGateway(
			this.collaborators.createOpenFeedbackClient(this.apiKey, this.fetcher),
		);
		const speakers = await records.list(eventId, "speakers");
		const talks = await records.list(eventId, "talks");
		const current = this.collaborators.openFeedbackAgendaSnapshot.parse({
			speakers,
			talks,
		});
		const matched = this.collaborators.openFeedbackAgendaPlan.create(
			input.key,
			input.agenda,
			current,
		);
		return input.agenda.talks.map((source, index) => {
			const talk = matched.talks[index];
			const stored = current.talks.find((item) => item.id === talk?.id);
			if (
				!talk ||
				!stored ||
				!this.collaborators.openFeedbackRecordEquality.sameSpeakers(
					stored,
					talk,
				)
			)
				throw new FeedbackResolutionError("unavailable");
			return {
				title: talk.title,
				url: `https://openfeedback.io/${eventId}/0/${encodeURIComponent(talk.id)}?displayVotes=true`,
				speakerIds: source.speakers.map((speaker) => speaker.id),
			};
		});
	}

	private eventId(url: string): string {
		try {
			const id = new URL(
				this.collaborators.feedbackPolicy.pollUrl(url),
			).pathname.split("/")[1];
			if (id) return id;
		} catch {
			// Invalid organizer input does not indicate a failed provider request.
		}
		throw new FeedbackResolutionError("unavailable");
	}
}
export type OpenFeedbackTalkResultsGatewayArguments =
	ConstructorParameters<typeof OpenFeedbackTalkResultsGateway> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
