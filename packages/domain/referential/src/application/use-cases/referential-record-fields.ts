import type { ReferentialCatalogOperations } from "../../domain/referential-catalog.js";
import type {
	ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import { EMAIL_PATTERN } from "./validate-referential-catalog-contracts.js";

export interface ReferentialRecordFieldsCollaborators {
	readonly referentialDiagnostics: Pick<ReferentialDiagnostics, "diagnostic">;
	readonly referentialCatalogOperations: Pick<
		ReferentialCatalogOperations,
		"normalizeDisplayName"
	>;
}

export class ReferentialRecordFields {
	constructor(
		private readonly collaborators: ReferentialRecordFieldsCollaborators,
	) {}

	requiredText(
		value: unknown,
		code: Parameters<ReferentialDiagnostics["diagnostic"]>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined {
		if (typeof value !== "string") {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					path,
					message,
				),
			);
			return undefined;
		}

		const normalized =
			this.collaborators.referentialCatalogOperations.normalizeDisplayName(
				value,
			);
		if (!normalized) {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					path,
					message,
				),
			);
			return undefined;
		}

		return normalized;
	}

	optionalText(
		value: unknown,
		code: Parameters<ReferentialDiagnostics["diagnostic"]>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined | null {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}
		if (typeof value !== "string") {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					path,
					message,
				),
			);
			return null;
		}

		return value.normalize("NFC").trim() || undefined;
	}

	email(
		value: unknown,
		code: Parameters<ReferentialDiagnostics["diagnostic"]>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined {
		if (typeof value !== "string") {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					path,
					message,
				),
			);
			return undefined;
		}

		const normalized = value.normalize("NFC").trim().toLowerCase();
		if (!EMAIL_PATTERN.test(normalized)) {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					path,
					message,
				),
			);
			return undefined;
		}

		return normalized;
	}
}
