import { PublicationDomainComposition } from "@meetup-automation/publication";
import { KuttFeedbackLinkGateway } from "./kutt-feedback-link-gateway.js";
import { KuttLinkResponse } from "./kutt-link-response.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class KuttFeedbackLinkGatewayComposition {
	kuttFeedbackLinkGateway(
		apiKey: string,
		linkId: string,
		baseUrl: string,
		fetcher: typeof fetch = fetch,
	): KuttFeedbackLinkGateway {
		return new KuttFeedbackLinkGateway(
			{
				feedbackPolicy: new PublicationDomainComposition().feedbackPolicy(),
				kuttLinkResponse: this.kuttLinkResponse(),
			},
			apiKey,
			linkId,
			baseUrl,
			fetcher,
		);
	}
	kuttLinkResponse(): KuttLinkResponse {
		return new KuttLinkResponse();
	}
}
