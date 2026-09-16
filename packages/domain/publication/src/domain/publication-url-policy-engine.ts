import {
	type PublicationDiagnostic,
	PublicationDiagnostics,
	type PublicationEvaluation,
	type PublicationPatchOperation,
	type PublicationReferences,
} from "./model.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export class PublicationUrlPolicyEngine {
	constructor(private readonly policies: readonly PublicationUrlPolicy[]) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		let normalized = references;
		const diagnostics: PublicationDiagnostic[] = [];
		const operations: PublicationPatchOperation[] = [];

		for (const policy of this.policies) {
			const result = policy.evaluate(normalized);
			diagnostics.push(...result.diagnostics);
			operations.push(...result.patch.operations);
			normalized = PublicationDiagnostics.applyPublicationPatch(
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
