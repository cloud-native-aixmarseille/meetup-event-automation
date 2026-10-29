import { DocumentTemplateDefinition } from "./document-template-definition.js";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";
import {
	DocumentContentLocations,
	type DocumentContentLocationsArguments,
} from "./document-content-locations.js";
import { DocumentContentRequests } from "./document-content-requests.js";
import { DocumentTabs } from "./document-tabs.js";
import { DocumentTemplateBindings } from "./document-template-bindings.js";
import {
	GoogleDocsContentRepository,
	type GoogleDocsContentRepositoryArguments,
} from "./google-docs-content-repository.js";
import { GoogleDocsContentRepositoryFactory } from "./google-docs-content-repository-factory.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GoogleDocsContentRepositoryComposition {
	definition(): DocumentTemplateDefinition {
		return new DocumentTemplateDefinition(
			new TemplatingComposition().parser(),
			new PublicationDomainComposition().contentTemplateFields(),
			this.documentTemplateBindings(),
		);
	}
	documentContentLocations(
		...args: DocumentContentLocationsArguments
	): DocumentContentLocations {
		return new DocumentContentLocations(
			{
				documentTabs: this.documentTabs(),
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
			},
			...args,
		);
	}
	documentContentRequests(): DocumentContentRequests {
		return new DocumentContentRequests();
	}
	documentTabs(): DocumentTabs {
		return new DocumentTabs(new TemplatingComposition().parser());
	}
	documentTemplateBindings(): DocumentTemplateBindings {
		return new DocumentTemplateBindings({
			templates: new TemplatingComposition().parser(),
			documentTabs: this.documentTabs(),
			contentFingerprint:
				new PublicationDomainComposition().contentFingerprint(),
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
	}
	googleDocsContentRepository(
		...args: GoogleDocsContentRepositoryArguments
	): GoogleDocsContentRepository {
		return new GoogleDocsContentRepository(
			{
				definition: this.definition(),
				documentTabs: this.documentTabs(),
				documentTemplateBindings: this.documentTemplateBindings(),
				documentContentRequests: this.documentContentRequests(),
				createDocumentContentLocations: (...args) =>
					this.documentContentLocations(...args),
			},
			...args,
		);
	}
	googleDocsContentRepositoryFactory(): GoogleDocsContentRepositoryFactory {
		return new GoogleDocsContentRepositoryFactory({
			createGoogleDocsContentRepository: (...args) =>
				this.googleDocsContentRepository(...args),
		});
	}
}
