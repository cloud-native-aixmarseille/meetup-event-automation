import { PublicationDomainComposition } from "@meetup-automation/publication";
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
	googleSlidesContentRepository(
		...args: GoogleSlidesContentRepositoryArguments
	): GoogleSlidesContentRepository {
		return new GoogleSlidesContentRepository(
			{
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
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
	}
}
