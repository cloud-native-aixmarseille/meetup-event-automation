import type {
	PublicationEvaluation,
	PublicationPatchOperation,
	PublicationReferences,
} from "./model.js";
import type { EvaluateLinkInput } from "./url-policy-contracts.js";

export class PublicationLinkEvaluation {
	static evaluateLink<P extends keyof PublicationReferences>({
		references,
		path,
		prefixes,
		identifierPattern,
		code,
		message,
	}: EvaluateLinkInput<P>): PublicationEvaluation {
		const raw = references[path];
		if (raw === undefined || raw === "") {
			return PublicationLinkEvaluation.emptyEvaluation(references);
		}

		const normalized = raw.trim().replace(/\/$/, "");
		const matchingPrefix = prefixes.find((prefix) =>
			normalized.startsWith(prefix),
		);
		const identifier = matchingPrefix
			? normalized.slice(matchingPrefix.length)
			: undefined;

		if (
			!PublicationLinkEvaluation.isHttpsUrl(normalized) ||
			!matchingPrefix ||
			!identifier ||
			!identifierPattern.test(identifier)
		) {
			return {
				references,
				diagnostics: [
					Object.freeze({
						code,
						severity: "error" as const,
						field: path,
						message,
					}),
				],
				patch: Object.freeze({ operations: [] }),
			};
		}

		if (raw === normalized) {
			return PublicationLinkEvaluation.emptyEvaluation(references);
		}

		const operation = Object.freeze({
			op: "replace" as const,
			path,
			value: normalized,
			reason: "Trim URL and remove its trailing slash",
		}) as PublicationPatchOperation;

		return {
			references: { ...references, [path]: normalized },
			diagnostics: [
				Object.freeze({
					code: `publication.${path}.normalized`,
					severity: "info" as const,
					field: path,
					message: `${path} URL can be normalized safely`,
					fixAvailable: true,
				}),
			],
			patch: Object.freeze({ operations: Object.freeze([operation]) }),
		};
	}

	static emptyEvaluation(
		references: PublicationReferences,
	): PublicationEvaluation {
		return {
			references,
			diagnostics: [],
			patch: Object.freeze({ operations: [] }),
		};
	}

	static isHttpsUrl(value: string): boolean {
		try {
			return new URL(value).protocol === "https:";
		} catch {
			return false;
		}
	}
}
