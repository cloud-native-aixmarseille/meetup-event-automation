import { PublicAssetUrl } from "@meetup-automation/publication";
import { ContentConfiguration } from "./content-configuration.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { DraftSourceInput } from "./draft-source-input.js";
import { SocialPublicationConfiguration } from "./social-publication-configuration.js";

export class DraftSourceComposition {
	create(): DraftSourceInput {
		const runtime = new GithubActionsComposition();
		return new DraftSourceInput(
			runtime.runtimeInput(),
			runtime.publicationUrlInput(),
			runtime.conferenceHallInput(),
			new ContentConfiguration(runtime.runtimeInput(), new PublicAssetUrl()),
			runtime.eventPublicationConfiguration(),
			new SocialPublicationConfiguration(runtime.runtimeInput()),
		);
	}
}
