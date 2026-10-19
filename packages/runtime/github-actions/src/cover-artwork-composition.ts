import { GeminiGenerationGatewayComposition } from "@meetup-automation/gemini-generation-gateway";
import { GoogleDriveContentMediaComposition } from "@meetup-automation/google-drive-asset-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	DraftProposalComposition,
	GenerateCoverArtwork,
} from "@meetup-automation/journey";
import type { AiConfiguration } from "./ai-configuration.js";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";
import type { DraftMediaInput } from "./draft-media-input.js";
import {
	type DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";

export class CoverArtworkComposition {
	create(input: DraftSource & DraftMediaInput, ai: AiConfiguration) {
		const base = new DraftWorkspaceComposition().create(
			input,
			async () => null,
		);
		const images =
			new HttpsAssetImageRepositoryComposition().contentImageLoader();
		const media = new GoogleDriveContentMediaComposition().create(
			input.credentials,
			input.publicFolderId,
			images,
			new AssetFileNameComposition().create(input.locale),
		);
		const generator = new GeminiGenerationGatewayComposition().image(
			ai.model,
			ai.apiKey,
		);
		return {
			...base,
			generator,
			generate: new GenerateCoverArtwork(
				base.store,
				generator,
				media,
				base.fingerprints,
				base.policy,
				new DraftProposalComposition().artwork(),
			),
		};
	}
}
