import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import type { PublicationLinkEvaluation } from "./publication-link-evaluation.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export interface AssetFolderUrlPolicyCollaborators {
	readonly publicationLinkEvaluation: Pick<
		PublicationLinkEvaluation,
		"evaluateLink" | "matchesPrefix"
	>;
}

export class AssetFolderUrlPolicy implements PublicationUrlPolicy {
	constructor(
		private readonly collaborators: AssetFolderUrlPolicyCollaborators,
		private readonly prefix: string,
	) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		return this.collaborators.publicationLinkEvaluation.evaluateLink({
			references,
			path: "assets",
			isValid: (value) =>
				this.collaborators.publicationLinkEvaluation.matchesPrefix(
					value,
					[this.prefix],
					/^[a-zA-Z0-9_-]+$/,
				),
			code: "publication.asset-url.invalid",
			message: `Asset folder URL must start with ${this.prefix} and end with a folder identifier`,
		});
	}
}
export type AssetFolderUrlPolicyArguments =
	ConstructorParameters<typeof AssetFolderUrlPolicy> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
