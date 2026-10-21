import type {
	PublicationDiagnostic,
	PublicationDiagnostics,
	PublicationEvaluation,
	PublicationPatchOperation,
	PublicationReferences,
} from "./model.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export interface PublicationUrlPolicyEngineCollaborators {
	readonly publicationDiagnostics: Pick<
		PublicationDiagnostics,
		"applyPublicationPatch"
	>;
}

export class PublicationUrlPolicyEngine {
	constructor(
		private readonly collaborators: PublicationUrlPolicyEngineCollaborators,
		private readonly policies: readonly PublicationUrlPolicy[],
	) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		let normalized = references;
		const diagnostics: PublicationDiagnostic[] = [];
		const operations: PublicationPatchOperation[] = [];

		for (const policy of this.policies) {
			const result = policy.evaluate(normalized);
			diagnostics.push(...result.diagnostics);
			operations.push(...result.patch.operations);
			normalized =
				this.collaborators.publicationDiagnostics.applyPublicationPatch(
					normalized,
					result.patch,
				);
		}

		return {
			references: normalized,
			diagnostics: Object.freeze(diagnostics),
			patch: Object.freeze({ operations: Object.freeze(operations) }),
		};
	}
}
export type PublicationUrlPolicyEngineArguments =
	ConstructorParameters<typeof PublicationUrlPolicyEngine> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
