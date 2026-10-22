import { PublicationDomainComposition } from "@meetup-automation/publication";
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
		return new DocumentTabs();
	}
	documentTemplateBindings(): DocumentTemplateBindings {
		return new DocumentTemplateBindings({
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
