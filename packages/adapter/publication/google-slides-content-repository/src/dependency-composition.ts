import { SlideCollectionLayout } from "./slide-collection-layout.js";
import { SlideCollectionDefinition } from "./slide-collection-definition.js";
import { SlideCollectionIdentity } from "./slide-collection-identity.js";
import { SlideCollectionLocations } from "./slide-collection-locations.js";
import { SlideCollectionRequests } from "./slide-collection-requests.js";
import { SlideTemplateDefinition } from "./slide-template-definition.js";
import type { AssetImageRepository } from "@meetup-automation/publication";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";
import {
	GoogleSlidesContentRepository,
	type GoogleSlidesContentRepositoryArguments,
} from "./google-slides-content-repository.js";
import { GoogleSlidesContentRepositoryFactory } from "./google-slides-content-repository-factory.js";
import { SlideContentElement } from "./slide-content-element.js";
import {
	SlideContentLocations,
	type SlideContentLocationsArguments,
} from "./slide-content-locations.js";
import { SlideContentRequests } from "./slide-content-requests.js";
import { SlideTemplateBindings } from "./slide-template-bindings.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GoogleSlidesContentRepositoryComposition {
	collectionLocations(images: AssetImageRepository): SlideCollectionLocations {
		return new SlideCollectionLocations(
			this.collectionIdentity(),
			new PublicationDomainComposition().contentFingerprint(),
			images,
		);
	}
	collectionIdentity(): SlideCollectionIdentity {
		return new SlideCollectionIdentity(
			new PublicationDomainComposition().contentFingerprint(),
		);
	}
	collectionDefinition(): SlideCollectionDefinition {
		return new SlideCollectionDefinition(
			new SlideCollectionLayout(),
			new TemplatingComposition().collectionParser(),
			new TemplatingComposition().parser(),
			new PublicationDomainComposition().contentTemplateFields(),
			new PublicationDomainComposition().contentTextKey(),
			this.slideTemplateBindings(),
		);
	}
	collectionRequests(): SlideCollectionRequests {
		return new SlideCollectionRequests(
			new SlideCollectionLayout(),
			this.collectionIdentity(),
			this.collectionDefinition(),
			this.slideContentRequests(),
		);
	}
	definition(): SlideTemplateDefinition {
		return new SlideTemplateDefinition(
			this.collectionDefinition(),
			this.collectionIdentity(),
			new TemplatingComposition().parser(),
			new PublicationDomainComposition().contentTemplateFields(),
			this.slideTemplateBindings(),
		);
	}
	googleSlidesContentRepository(
		...args: GoogleSlidesContentRepositoryArguments
	): GoogleSlidesContentRepository {
		return new GoogleSlidesContentRepository(
			{
				collectionRequests: this.collectionRequests(),
				createCollectionLocations: (images) => this.collectionLocations(images),
				definition: this.definition(),
				slideTemplateBindings: this.slideTemplateBindings(),
				slideContentRequests: this.slideContentRequests(),
				createSlideContentLocations: (...args) =>
					this.slideContentLocations(...args),
			},
			...args,
		);
	}
	googleSlidesContentRepositoryFactory(): GoogleSlidesContentRepositoryFactory {
		return new GoogleSlidesContentRepositoryFactory({
			createGoogleSlidesContentRepository: (...args) =>
				this.googleSlidesContentRepository(...args),
		});
	}
	slideContentElement(): SlideContentElement {
		return new SlideContentElement();
	}
	slideContentLocations(
		...args: SlideContentLocationsArguments
	): SlideContentLocations {
		return new SlideContentLocations(
			{
				slideContentElement: this.slideContentElement(),
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				slideTemplateBindings: this.slideTemplateBindings(),
			},
			...args,
		);
	}
	slideContentRequests(): SlideContentRequests {
		return new SlideContentRequests({
			slideContentElement: this.slideContentElement(),
			slideTemplateBindings: this.slideTemplateBindings(),
		});
	}
	slideTemplateBindings(): SlideTemplateBindings {
		return new SlideTemplateBindings({
			collections: this.collectionIdentity(),
			templates: new TemplatingComposition().parser(),
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
	}
}
