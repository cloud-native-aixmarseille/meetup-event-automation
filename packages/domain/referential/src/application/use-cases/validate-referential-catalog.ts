import {
	type RawReferentialCatalog,
	ReferentialCatalogOperations,
} from "../../domain/referential-catalog.js";
import {
	type ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import type { ReferentialRepository } from "../ports/referential-repository.js";
import { HostCatalogValidator } from "./host-catalog-validator.js";
import { SpeakerCatalogValidator } from "./speaker-catalog-validator.js";
import type { ReferentialCatalogValidation } from "./validate-referential-catalog-contracts.js";

export class ValidateReferentialCatalog {
	constructor(private readonly repository?: ReferentialRepository) {}

	async execute(
		rawCatalog?: RawReferentialCatalog,
	): Promise<ReferentialCatalogValidation> {
		const input = rawCatalog ?? (await this.loadCatalog());
		const diagnostics: ReferentialDiagnostic[] = [];
		const hosts = HostCatalogValidator.validateHosts(input.hosts, diagnostics);
		const speakers = SpeakerCatalogValidator.validateSpeakers(
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
		this.reportDuplicateDisplayNames(
			speakers,
			"referential.speaker.display-name.duplicate",
			"speakers",
			"Duplicate normalized speaker display names are not allowed; keep one stable speaker per public name.",
			diagnostics,
		);

		const frozenDiagnostics =
			ReferentialDiagnostics.freezeDiagnostics(diagnostics);
		if (diagnostics.some(({ severity }) => severity === "error")) {
			return Object.freeze({
				isValid: false as const,
				diagnostics: frozenDiagnostics,
			});
		}

		return Object.freeze({
			isValid: true as const,
			catalog: ReferentialCatalogOperations.freezeCatalog(hosts, speakers),
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
		code: Parameters<typeof ReferentialDiagnostics.diagnostic>[0],
		path: string,
		message: string,
		diagnostics: ReferentialDiagnostic[],
	): void {
		const counts = new Map<string, number>();
		for (const entity of entities) {
			const key = ReferentialCatalogOperations.displayNameKey(
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
				ReferentialDiagnostics.diagnostic(
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
