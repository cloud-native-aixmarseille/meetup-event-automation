import { ReferentialCatalogOperations } from "../../domain/referential-catalog.js";
import {
	type ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import { EMAIL_PATTERN } from "./validate-referential-catalog-contracts.js";

export class ReferentialRecordFields {
	static requiredText(
		value: unknown,
		code: Parameters<typeof ReferentialDiagnostics.diagnostic>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined {
		if (typeof value !== "string") {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(code, "error", path, message),
			);
			return undefined;
		}

		const normalized = ReferentialCatalogOperations.normalizeDisplayName(value);
		if (!normalized) {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(code, "error", path, message),
			);
			return undefined;
		}

		return normalized;
	}

	static optionalText(
		value: unknown,
		code: Parameters<typeof ReferentialDiagnostics.diagnostic>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined | null {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}
		if (typeof value !== "string") {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(code, "error", path, message),
			);
			return null;
		}

		return value.normalize("NFC").trim() || undefined;
	}

	static email(
		value: unknown,
		code: Parameters<typeof ReferentialDiagnostics.diagnostic>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): string | undefined {
		if (typeof value !== "string") {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(code, "error", path, message),
			);
			return undefined;
		}

		const normalized = value.normalize("NFC").trim().toLowerCase();
		if (!EMAIL_PATTERN.test(normalized)) {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(code, "error", path, message),
			);
			return undefined;
		}

		return normalized;
	}
}
