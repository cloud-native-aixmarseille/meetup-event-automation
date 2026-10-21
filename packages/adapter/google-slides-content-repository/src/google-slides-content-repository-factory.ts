import { slides, type slides_v1 } from "@googleapis/slides";
import type { AssetImageRepository } from "@meetup-automation/publication";
import type {
	GoogleSlidesContentRepository,
	GoogleSlidesContentRepositoryArguments,
} from "./google-slides-content-repository.js";

export interface GoogleSlidesContentRepositoryFactoryCollaborators {
	readonly createGoogleSlidesContentRepository: (
		...args: GoogleSlidesContentRepositoryArguments
	) => GoogleSlidesContentRepository;
}

export class GoogleSlidesContentRepositoryFactory {
	constructor(
		private readonly collaborators: GoogleSlidesContentRepositoryFactoryCollaborators,
	) {}

	create(
		authentication: ConstructorParameters<typeof slides_v1.Slides>[0]["auth"],
		images: AssetImageRepository,
	): GoogleSlidesContentRepository {
		return this.collaborators.createGoogleSlidesContentRepository(
			slides({ version: "v1", auth: authentication }),
			images,
		);
	}
}
