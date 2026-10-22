import { docs, type docs_v1 } from "@googleapis/docs";
import type { AssetImageRepository } from "@meetup-automation/publication";
import type {
	GoogleDocsContentRepository,
	GoogleDocsContentRepositoryArguments,
} from "./google-docs-content-repository.js";

export interface GoogleDocsContentRepositoryFactoryCollaborators {
	readonly createGoogleDocsContentRepository: (
		...args: GoogleDocsContentRepositoryArguments
	) => GoogleDocsContentRepository;
}

export class GoogleDocsContentRepositoryFactory {
	constructor(
		private readonly collaborators: GoogleDocsContentRepositoryFactoryCollaborators,
	) {}

	create(
		authentication: docs_v1.Options["auth"],
		images: AssetImageRepository,
	): GoogleDocsContentRepository {
		return this.collaborators.createGoogleDocsContentRepository(
			docs({ version: "v1", auth: authentication }),
			images,
		);
	}
}
