import { PublicationDomainComposition } from "@meetup-automation/publication";
import {
	KuttFeedbackLinkGateway,
	type KuttFeedbackLinkGatewayArguments,
} from "./kutt-feedback-link-gateway.js";
import { KuttLinkResponse } from "./kutt-link-response.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class KuttFeedbackLinkGatewayComposition {
	kuttFeedbackLinkGateway(
		...args: KuttFeedbackLinkGatewayArguments
	): KuttFeedbackLinkGateway {
		return new KuttFeedbackLinkGateway(
			{
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
				kuttLinkResponse: this.kuttLinkResponse(),
			},
			...args,
		);
	}
	kuttLinkResponse(): KuttLinkResponse {
		return new KuttLinkResponse();
	}
}
