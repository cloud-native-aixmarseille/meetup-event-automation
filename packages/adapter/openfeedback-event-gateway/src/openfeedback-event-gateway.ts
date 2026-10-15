import { createHash } from "node:crypto";
import {
	type FeedbackAgenda,
	type FeedbackEventGateway,
	FeedbackPolicy,
} from "@meetup-automation/publication";
import { OpenFeedbackClient } from "./openfeedback-client.js";
import { OpenFeedbackAgendaGateway } from "./openfeedback-agenda-gateway.js";
import { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";

export class OpenFeedbackEventGateway implements FeedbackEventGateway {
	constructor(
		private readonly client: OpenFeedbackClient,
		private readonly agendas: OpenFeedbackAgendaGateway,
	) {}

	static create(
		apiKey: string,
		fetcher: typeof fetch = fetch,
	): OpenFeedbackEventGateway {
		const client = new OpenFeedbackClient(apiKey, fetcher);
		return new OpenFeedbackEventGateway(
			client,
			new OpenFeedbackAgendaGateway(new OpenFeedbackRecordsGateway(client)),
		);
	}

	async ensureEvent(input: {
		readonly key: string;
		readonly name: string;
		readonly scheduleUrl: string;
		readonly url?: string;
		readonly agenda?: FeedbackAgenda;
	}): Promise<string> {
		OpenFeedbackEventGateway.validateInput(input);
		const url =
			input.url === undefined ? undefined : FeedbackPolicy.pollUrl(input.url);
		const id = url
			? new URL(url).pathname.split("/")[1]
			: `meetup-${createHash("sha256").update(input.key).digest("hex")}`;
		const details = { name: input.name, scheduleLink: input.scheduleUrl };
		let response = url
			? await this.client.request(`/events/${id}`, "PATCH", details)
			: await this.client.request("/events/", "POST", {
					id,
					...details,
					setupType: "openfeedbackv1",
				});
		if (!url && response.status === 409) {
			// PATCH verifies organization access and preserves all omitted settings.
			response = await this.client.request(`/events/${id}`, "PATCH", details);
		}
		await OpenFeedbackClient.read(response, id);
		if (input.agenda) {
			await this.agendas.synchronize(id, input.key, input.agenda);
		}
		return url ?? `https://openfeedback.io/${id}`;
	}

	private static validateInput(input: {
		readonly key: string;
		readonly name: string;
		readonly scheduleUrl: string;
	}): void {
		if (!input.key.trim() || !input.name.trim() || input.name.length > 100)
			throw new Error("Invalid OpenFeedback event identity or name");
		let scheduleUrl: URL;
		try {
			scheduleUrl = new URL(input.scheduleUrl);
		} catch {
			throw new Error("Invalid OpenFeedback event schedule URL");
		}
		if (
			scheduleUrl.protocol !== "https:" ||
			scheduleUrl.username ||
			scheduleUrl.password
		)
			throw new Error("Invalid OpenFeedback event schedule URL");
	}
}
