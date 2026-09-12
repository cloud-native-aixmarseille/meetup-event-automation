import {
	type ReferentialCatalog,
	type ReferentialRepository,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export interface ValidateMeetupReferentialsDependencies {
	readonly config: AutomationConfig;
	readonly referentialRepository: ReferentialRepository;
}

export type ValidateMeetupReferentialsResult =
	| {
			isValid: true;
			readonly config: AutomationConfig;
			catalog: ReferentialCatalog;
			diagnostics: readonly PublicDiagnostic[];
	  }
	| {
			isValid: false;
			readonly config: AutomationConfig;
			diagnostics: readonly PublicDiagnostic[];
	  };

export class ValidateMeetupReferentials {
	constructor(
		private readonly dependencies: ValidateMeetupReferentialsDependencies,
	) {}

	async execute(): Promise<ValidateMeetupReferentialsResult> {
		const config = this.dependencies.config;
		const repository = this.dependencies.referentialRepository;
		const validation = await new ValidateReferentialCatalog(
			repository,
		).execute();
		const diagnostics = validation.diagnostics.map((item) => ({
			code: item.code,
			severity: item.severity,
			field: item.path,
			message: item.message,
		}));
		return validation.isValid
			? { isValid: true, config, catalog: validation.catalog, diagnostics }
			: { isValid: false, config, diagnostics };
	}
}
