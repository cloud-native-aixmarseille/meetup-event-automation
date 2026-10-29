import { HostPublicDetails } from "./application/use-cases/host-public-details.js";
import { HostCatalogValidator } from "./application/use-cases/host-catalog-validator.js";
import { MergeSourceSpeakers } from "./application/use-cases/merge-source-speakers.js";
import { ProjectReferentialChoices } from "./application/use-cases/project-referential-choices.js";
import { ReferentialRecordFields } from "./application/use-cases/referential-record-fields.js";
import { ResolveEventReferences } from "./application/use-cases/resolve-event-references.js";
import {
	SourceSpeakerReferentialRepository,
	type SourceSpeakerReferentialRepositoryArguments,
} from "./application/use-cases/source-speaker-referential-repository.js";
import { SpeakerCatalogValidator } from "./application/use-cases/speaker-catalog-validator.js";
import { SpeakerSourceFields } from "./application/use-cases/speaker-source-fields.js";
import {
	ValidateReferentialCatalog,
	type ValidateReferentialCatalogArguments,
} from "./application/use-cases/validate-referential-catalog.js";
import { ReferentialIdentifiers } from "./domain/identifiers.js";
import { ReferentialCatalogOperations } from "./domain/referential-catalog.js";
import { ReferentialDiagnostics } from "./domain/referential-diagnostic.js";
import { SourceSpeakerEquality } from "./domain/source-speaker-equality.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class ReferentialDomainComposition {
	hostCatalogValidator(): HostCatalogValidator {
		return new HostCatalogValidator({
			publicDetails: new HostPublicDetails(),
			referentialDiagnostics: this.referentialDiagnostics(),
			referentialRecordFields: this.referentialRecordFields(),
			referentialIdentifiers: this.referentialIdentifiers(),
		});
	}
	mergeSourceSpeakers(): MergeSourceSpeakers {
		return new MergeSourceSpeakers();
	}
	projectReferentialChoices(): ProjectReferentialChoices {
		return new ProjectReferentialChoices();
	}
	referentialCatalogOperations(): ReferentialCatalogOperations {
		return new ReferentialCatalogOperations();
	}
	referentialDiagnostics(): ReferentialDiagnostics {
		return new ReferentialDiagnostics();
	}
	referentialIdentifiers(): ReferentialIdentifiers {
		return new ReferentialIdentifiers();
	}
	referentialRecordFields(): ReferentialRecordFields {
		return new ReferentialRecordFields({
			referentialDiagnostics: this.referentialDiagnostics(),
			referentialCatalogOperations: this.referentialCatalogOperations(),
		});
	}
	resolveEventReferences(): ResolveEventReferences {
		return new ResolveEventReferences({
			referentialDiagnostics: this.referentialDiagnostics(),
			referentialIdentifiers: this.referentialIdentifiers(),
			referentialCatalogOperations: this.referentialCatalogOperations(),
		});
	}
	sourceSpeakerEquality(): SourceSpeakerEquality {
		return new SourceSpeakerEquality();
	}
	sourceSpeakerReferentialRepository(
		...args: SourceSpeakerReferentialRepositoryArguments
	): SourceSpeakerReferentialRepository {
		return new SourceSpeakerReferentialRepository(...args);
	}
	speakerCatalogValidator(): SpeakerCatalogValidator {
		return new SpeakerCatalogValidator({
			referentialDiagnostics: this.referentialDiagnostics(),
			speakerSourceFields: this.speakerSourceFields(),
			referentialRecordFields: this.referentialRecordFields(),
			referentialIdentifiers: this.referentialIdentifiers(),
		});
	}
	speakerSourceFields(): SpeakerSourceFields {
		return new SpeakerSourceFields();
	}
	validateReferentialCatalog(
		...args: ValidateReferentialCatalogArguments
	): ValidateReferentialCatalog {
		return new ValidateReferentialCatalog(
			{
				referentialDiagnostics: this.referentialDiagnostics(),
				hostCatalogValidator: this.hostCatalogValidator(),
				speakerCatalogValidator: this.speakerCatalogValidator(),
				speakerSourceFields: this.speakerSourceFields(),
				referentialCatalogOperations: this.referentialCatalogOperations(),
			},
			...args,
		);
	}
}
