import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import { PublicationLinkEvaluation } from "./publication-link-evaluation.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export class AssetFolderUrlPolicy implements PublicationUrlPolicy {
	readonly id = "asset-folder-url";

	constructor(private readonly prefix: string) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		return PublicationLinkEvaluation.evaluateLink({
			references,
			path: "assets",
			prefixes: [this.prefix],
			identifierPattern: /^[a-zA-Z0-9_-]+$/,
			code: "publication.asset-url.invalid",
			message: `Asset folder URL must start with ${this.prefix} and end with a folder identifier`,
		});
	}
}
