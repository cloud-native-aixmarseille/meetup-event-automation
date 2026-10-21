import { ProposalSourceError } from "../../domain/proposal-source-error.js";
import type {
	RawReferentialCatalog,
	ReferentialCatalogOperations,
} from "../../domain/referential-catalog.js";
import type {
	ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import type { ReferentialRepository } from "../ports/referential-repository.js";
import type { HostCatalogValidator } from "./host-catalog-validator.js";
import type { SpeakerCatalogValidator } from "./speaker-catalog-validator.js";
import type { SpeakerSourceFields } from "./speaker-source-fields.js";
import type { ReferentialCatalogValidation } from "./validate-referential-catalog-contracts.js";

export interface ValidateReferentialCatalogCollaborators {
	readonly referentialDiagnostics: Pick<
		ReferentialDiagnostics,
		"freezeDiagnostics" | "diagnostic"
	>;
	readonly hostCatalogValidator: Pick<HostCatalogValidator, "validateHosts">;
	readonly speakerCatalogValidator: Pick<
		SpeakerCatalogValidator,
		"validateSpeakers"
	>;
	readonly speakerSourceFields: Pick<SpeakerSourceFields, "validateMappings">;
	readonly referentialCatalogOperations: Pick<
		ReferentialCatalogOperations,
		"freezeCatalog" | "displayNameKey"
	>;
}

export class ValidateReferentialCatalog {
	constructor(
		private readonly collaborators: ValidateReferentialCatalogCollaborators,
		private readonly repository?: ReferentialRepository,
	) {}

	async execute(
		rawCatalog?: RawReferentialCatalog,
	): Promise<ReferentialCatalogValidation> {
		try {
			return this.validate(rawCatalog ?? (await this.loadCatalog()));
		} catch (error) {
			if (!(error instanceof ProposalSourceError)) throw error;
			return Object.freeze({
				isValid: false as const,
				diagnostics:
					this.collaborators.referentialDiagnostics.freezeDiagnostics([
						this.collaborators.referentialDiagnostics.diagnostic(
							`referential.source.${error.code}`,
							"error",
							"speakers",
							"Source-owned speaker profiles could not be refreshed. Check source access and identity mappings before retrying.",
						),
					]),
			});
		}
	}

	private validate(input: RawReferentialCatalog): ReferentialCatalogValidation {
		const diagnostics: ReferentialDiagnostic[] = [];
		const hosts = this.collaborators.hostCatalogValidator.validateHosts(
			input.hosts,
			diagnostics,
		);
		const speakers =
			this.collaborators.speakerCatalogValidator.validateSpeakers(
				input.speakers,
				diagnostics,
			);

		this.reportDuplicateDisplayNames(
			hosts,
			"referential.host.display-name.duplicate",
			"hosts",
			"Duplicate normalized host display names are not allowed; keep one stable host per public name.",
			diagnostics,
		);

		this.collaborators.speakerSourceFields.validateMappings(
			speakers,
			diagnostics,
		);
		const frozenDiagnostics =
			this.collaborators.referentialDiagnostics.freezeDiagnostics(diagnostics);
		if (diagnostics.some(({ severity }) => severity === "error")) {
			return Object.freeze({
				isValid: false as const,
				diagnostics: frozenDiagnostics,
			});
		}

		return Object.freeze({
			isValid: true as const,
			catalog: this.collaborators.referentialCatalogOperations.freezeCatalog(
				hosts,
				speakers,
			),
			diagnostics: frozenDiagnostics,
		});
	}

	private async loadCatalog(): Promise<RawReferentialCatalog> {
		if (!this.repository) {
			throw new Error(
				"A referential repository or an explicit raw catalog is required.",
			);
		}

		return this.repository.load();
	}

	private reportDuplicateDisplayNames(
		entities: readonly Readonly<{ displayName: string }>[],
		code: Parameters<ReferentialDiagnostics["diagnostic"]>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): void {
		const counts = new Map<string, number>();
		for (const entity of entities) {
			const key =
				this.collaborators.referentialCatalogOperations.displayNameKey(
					entity.displayName,
				);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}

		let ambiguityIndex = 0;
		for (const count of counts.values()) {
			if (count < 2) {
				continue;
			}
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					code,
					"error",
					`${path}.ambiguities[${ambiguityIndex}]`,
					message,
				),
			);
			ambiguityIndex += 1;
		}
	}
}
export type ValidateReferentialCatalogArguments =
	ConstructorParameters<typeof ValidateReferentialCatalog> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
