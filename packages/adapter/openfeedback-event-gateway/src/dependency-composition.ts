import { PublicationDomainComposition } from "@meetup-automation/publication";
import {
	OpenFeedbackAgendaGateway,
	type OpenFeedbackAgendaGatewayArguments,
} from "./openfeedback-agenda-gateway.js";
import { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";
import { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";
import {
	OpenFeedbackClient,
	type OpenFeedbackClientArguments,
} from "./openfeedback-client.js";
import {
	OpenFeedbackEventGateway,
	type OpenFeedbackEventGatewayArguments,
} from "./openfeedback-event-gateway.js";
import { OpenFeedbackEventGatewayFactory } from "./openfeedback-event-gateway-factory.js";
import { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";
import {
	OpenFeedbackRecordsGateway,
	type OpenFeedbackRecordsGatewayArguments,
} from "./openfeedback-records-gateway.js";
import { OpenFeedbackResourceId } from "./openfeedback-resource-id.js";
import { OpenFeedbackResponse } from "./openfeedback-response.js";
import {
	OpenFeedbackTalkResultsGateway,
	type OpenFeedbackTalkResultsGatewayArguments,
} from "./openfeedback-talk-results-gateway.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class OpenfeedbackEventGatewayComposition {
	openFeedbackAgendaGateway(
		...args: OpenFeedbackAgendaGatewayArguments
	): OpenFeedbackAgendaGateway {
		return new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot: this.openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan: this.openFeedbackAgendaPlan(),
			},
			...args,
		);
	}
	openFeedbackAgendaPlan(): OpenFeedbackAgendaPlan {
		return new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality: this.openFeedbackRecordEquality(),
		});
	}
	openFeedbackAgendaSnapshot(): OpenFeedbackAgendaSnapshot {
		return new OpenFeedbackAgendaSnapshot({
			openFeedbackResourceId: this.openFeedbackResourceId(),
		});
	}
	openFeedbackClient(...args: OpenFeedbackClientArguments): OpenFeedbackClient {
		return new OpenFeedbackClient(...args);
	}
	openFeedbackEventGateway(
		...args: OpenFeedbackEventGatewayArguments
	): OpenFeedbackEventGateway {
		return new OpenFeedbackEventGateway(
			{
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
				openFeedbackResponse: this.openFeedbackResponse(),
			},
			...args,
		);
	}
	openFeedbackEventGatewayFactory(): OpenFeedbackEventGatewayFactory {
		return new OpenFeedbackEventGatewayFactory({
			createOpenFeedbackClient: (...args) => this.openFeedbackClient(...args),
			createOpenFeedbackEventGateway: (...args) =>
				this.openFeedbackEventGateway(...args),
			createOpenFeedbackAgendaGateway: (...args) =>
				this.openFeedbackAgendaGateway(...args),
			createOpenFeedbackRecordsGateway: (...args) =>
				this.openFeedbackRecordsGateway(...args),
		});
	}
	openFeedbackRecordEquality(): OpenFeedbackRecordEquality {
		return new OpenFeedbackRecordEquality();
	}
	openFeedbackRecordsGateway(
		...args: OpenFeedbackRecordsGatewayArguments
	): OpenFeedbackRecordsGateway {
		return new OpenFeedbackRecordsGateway(
			{
				openFeedbackResponse: this.openFeedbackResponse(),
				openFeedbackRecordEquality: this.openFeedbackRecordEquality(),
				openFeedbackResourceId: this.openFeedbackResourceId(),
			},
			...args,
		);
	}
	openFeedbackResourceId(): OpenFeedbackResourceId {
		return new OpenFeedbackResourceId();
	}
	openFeedbackResponse(): OpenFeedbackResponse {
		return new OpenFeedbackResponse();
	}
	openFeedbackTalkResultsGateway(
		...args: OpenFeedbackTalkResultsGatewayArguments
	): OpenFeedbackTalkResultsGateway {
		return new OpenFeedbackTalkResultsGateway(
			{
				openFeedbackAgendaSnapshot: this.openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan: this.openFeedbackAgendaPlan(),
				openFeedbackRecordEquality: this.openFeedbackRecordEquality(),
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
				createOpenFeedbackRecordsGateway: (...args) =>
					this.openFeedbackRecordsGateway(...args),
				createOpenFeedbackClient: (...args) => this.openFeedbackClient(...args),
			},
			...args,
		);
	}
}
