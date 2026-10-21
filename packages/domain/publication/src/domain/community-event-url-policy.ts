import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import type { PublicationLinkEvaluation } from "./publication-link-evaluation.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export interface CommunityEventUrlPolicyCollaborators {
	readonly publicationLinkEvaluation: Pick<
		PublicationLinkEvaluation,
		"evaluateLink" | "matchesPrefix"
	>;
}

export class CommunityEventUrlPolicy implements PublicationUrlPolicy {
	constructor(
		private readonly collaborators: CommunityEventUrlPolicyCollaborators,
		private readonly prefixes: readonly string[],
	) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		return this.collaborators.publicationLinkEvaluation.evaluateLink({
			references,
			path: "community",
			isValid: (value) =>
				this.collaborators.publicationLinkEvaluation.matchesPrefix(
					value,
					this.prefixes,
					/^[0-9a-z-]+$/,
				),
			code: "publication.community-url.invalid",
			message:
				"Community event URL must use an approved CNCF/OCGroups prefix and identifier",
		});
	}
}
export type CommunityEventUrlPolicyArguments =
	ConstructorParameters<typeof CommunityEventUrlPolicy> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
