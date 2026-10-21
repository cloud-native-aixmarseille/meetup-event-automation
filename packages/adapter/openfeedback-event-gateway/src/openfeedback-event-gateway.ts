import { createHash } from "node:crypto";
import type {
	FeedbackAgenda,
	FeedbackEventGateway,
	FeedbackPolicy,
} from "@meetup-automation/publication";
import type { OpenFeedbackAgendaGateway } from "./openfeedback-agenda-gateway.js";
import type { OpenFeedbackClient } from "./openfeedback-client.js";
import type { OpenFeedbackResponse } from "./openfeedback-response.js";

export interface OpenFeedbackEventGatewayCollaborators {
	readonly feedbackPolicy: Pick<FeedbackPolicy, "pollUrl">;
	readonly openFeedbackResponse: Pick<OpenFeedbackResponse, "read">;
}

export class OpenFeedbackEventGateway implements FeedbackEventGateway {
	constructor(
		private readonly collaborators: OpenFeedbackEventGatewayCollaborators,
		private readonly client: OpenFeedbackClient,
		private readonly agendas: OpenFeedbackAgendaGateway,
	) {}

	async ensureEvent(input: {
		readonly key: string;
		readonly name: string;
		readonly scheduleUrl: string;
		readonly url?: string;
		readonly agenda?: FeedbackAgenda;
	}): Promise<string> {
		this.validateInput(input);
		const url =
			input.url === undefined
				? undefined
				: this.collaborators.feedbackPolicy.pollUrl(input.url);
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
		await this.collaborators.openFeedbackResponse.read(response, id);
		if (input.agenda) {
			await this.agendas.synchronize(id, input.key, input.agenda);
		}
		return url ?? `https://openfeedback.io/${id}`;
	}

	private validateInput(input: {
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
export type OpenFeedbackEventGatewayArguments =
	ConstructorParameters<typeof OpenFeedbackEventGateway> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
