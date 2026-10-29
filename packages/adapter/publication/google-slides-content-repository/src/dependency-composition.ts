import { SlideTemplateDefinition } from "./slide-template-definition.js";
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
	definition(): SlideTemplateDefinition {
		return new SlideTemplateDefinition(
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
			templates: new TemplatingComposition().parser(),
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
	}
}
