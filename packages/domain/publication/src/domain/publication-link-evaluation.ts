import type {
	PublicationEvaluation,
	PublicationPatchOperation,
	PublicationReferences,
} from "./model.js";
import type { EvaluateLinkInput } from "./url-policy-contracts.js";

export class PublicationLinkEvaluation {
	evaluateLink<P extends keyof PublicationReferences>({
		references,
		path,
		isValid,
		code,
		message,
	}: EvaluateLinkInput<P>): PublicationEvaluation {
		const raw = references[path];
		if (raw === undefined || raw === "") {
			return this.emptyEvaluation(references);
		}

		const normalized = raw.trim().replace(/\/$/, "");
		if (!isValid(raw.trim())) {
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
			return this.emptyEvaluation(references);
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

	emptyEvaluation(references: PublicationReferences): PublicationEvaluation {
		return {
			references,
			diagnostics: [],
			patch: Object.freeze({ operations: [] }),
		};
	}

	isHttpsUrl(value: string): boolean {
		try {
			return new URL(value).protocol === "https:";
		} catch {
			return false;
		}
	}

	matchesPrefix(
		value: string,
		prefixes: readonly string[],
		identifierPattern: RegExp,
	): boolean {
		const normalized = value.replace(/\/$/, "");
		const prefix = prefixes.find((candidate) =>
			normalized.startsWith(candidate),
		);
		const identifier = prefix ? normalized.slice(prefix.length) : undefined;
		return (
			this.isHttpsUrl(normalized) &&
			!!identifier &&
			identifierPattern.test(identifier)
		);
	}
}
