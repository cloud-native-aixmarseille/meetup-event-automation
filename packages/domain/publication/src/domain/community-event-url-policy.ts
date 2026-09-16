import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import { PublicationLinkEvaluation } from "./publication-link-evaluation.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export class CommunityEventUrlPolicy implements PublicationUrlPolicy {
	readonly id = "community-event-url";

	constructor(private readonly prefixes: readonly string[]) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		return PublicationLinkEvaluation.evaluateLink({
			references,
			path: "community",
			prefixes: this.prefixes,
			identifierPattern: /^[0-9a-z-]+$/,
			code: "publication.community-url.invalid",
			message:
				"Community event URL must use an approved CNCF/OCGroups prefix and identifier",
		});
	}
}
