import type {
	OpenFeedbackAgendaGateway,
	OpenFeedbackAgendaGatewayArguments,
} from "./openfeedback-agenda-gateway.js";
import type {
	OpenFeedbackClient,
	OpenFeedbackClientArguments,
} from "./openfeedback-client.js";
import type {
	OpenFeedbackEventGateway,
	OpenFeedbackEventGatewayArguments,
} from "./openfeedback-event-gateway.js";
import type {
	OpenFeedbackRecordsGateway,
	OpenFeedbackRecordsGatewayArguments,
} from "./openfeedback-records-gateway.js";

export interface OpenFeedbackEventGatewayFactoryCollaborators {
	readonly createOpenFeedbackClient: (
		...args: OpenFeedbackClientArguments
	) => OpenFeedbackClient;
	readonly createOpenFeedbackEventGateway: (
		...args: OpenFeedbackEventGatewayArguments
	) => OpenFeedbackEventGateway;
	readonly createOpenFeedbackAgendaGateway: (
		...args: OpenFeedbackAgendaGatewayArguments
	) => OpenFeedbackAgendaGateway;
	readonly createOpenFeedbackRecordsGateway: (
		...args: OpenFeedbackRecordsGatewayArguments
	) => OpenFeedbackRecordsGateway;
}

export class OpenFeedbackEventGatewayFactory {
	constructor(
		private readonly collaborators: OpenFeedbackEventGatewayFactoryCollaborators,
	) {}

	create(apiKey: string, fetcher: typeof fetch): OpenFeedbackEventGateway {
		const client = this.collaborators.createOpenFeedbackClient(apiKey, fetcher);
		return this.collaborators.createOpenFeedbackEventGateway(
			client,
			this.collaborators.createOpenFeedbackAgendaGateway(
				this.collaborators.createOpenFeedbackRecordsGateway(client),
			),
		);
	}
}
