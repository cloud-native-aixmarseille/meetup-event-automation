import {
	FeedbackPolicy,
	FeedbackResolutionError,
	type FeedbackTalkResult,
	type FeedbackTalkResultsGateway,
} from "@meetup-automation/publication";
import { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";
import { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";
import { OpenFeedbackClient } from "./openfeedback-client.js";
import { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";
import { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";

export class OpenFeedbackTalkResultsGateway
	implements FeedbackTalkResultsGateway
{
	constructor(
		private readonly apiKey: string,
		private readonly fetcher: typeof fetch = fetch,
	) {}

	async resolve(
		input: Parameters<FeedbackTalkResultsGateway["resolve"]>[0],
	): Promise<readonly FeedbackTalkResult[]> {
		const eventId = OpenFeedbackTalkResultsGateway.eventId(input.url);
		const records = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient(this.apiKey, this.fetcher),
		);
		const speakers = await records.list(eventId, "speakers");
		const talks = await records.list(eventId, "talks");
		const current = OpenFeedbackAgendaSnapshot.parse({ speakers, talks });
		const matched = OpenFeedbackAgendaPlan.create(
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
				!OpenFeedbackRecordEquality.sameSpeakers(stored, talk)
			)
				throw new FeedbackResolutionError("unavailable");
			return {
				title: talk.title,
				url: `https://openfeedback.io/${eventId}/0/${encodeURIComponent(talk.id)}?displayVotes=true`,
				speakerIds: source.speakers.map((speaker) => speaker.id),
			};
		});
	}

	private static eventId(url: string): string {
		try {
			const id = new URL(FeedbackPolicy.pollUrl(url)).pathname.split("/")[1];
			if (id) return id;
		} catch {
			// Invalid organizer input does not indicate a failed provider request.
		}
		throw new FeedbackResolutionError("unavailable");
	}
}
