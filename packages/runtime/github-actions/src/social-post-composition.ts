import type { MeetupEvent } from "@meetup-automation/event";
import { GeminiGenerationGatewayComposition } from "@meetup-automation/gemini-generation-gateway";
import { GoogleDriveContentMediaComposition } from "@meetup-automation/google-drive-asset-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	DraftProposalComposition,
	GenerateTextProposal,
} from "@meetup-automation/journey";
import type { ContentMedia } from "@meetup-automation/publication";
import type { AiConfiguration } from "./ai-configuration.js";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";
import {
	type DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";

export class SocialPostComposition {
	slack(input: DraftSource, ai: AiConfiguration) {
		return this.create(input, ai, async () => null);
	}
	linkedin(
		input: DraftSource & { readonly credentials: string },
		ai: AiConfiguration,
	) {
		const images =
			new HttpsAssetImageRepositoryComposition().contentImageLoader();
		const announcement = new GoogleDriveContentMediaComposition().announcement(
			input.credentials,
			images,
			new AssetFileNameComposition().create(input.locale),
		);
		return this.create(input, ai, async (event) =>
			input.settings.announcements[event.date]
				? announcement.read(
						event.date,
						input.settings.announcements[event.date],
					)
				: null,
		);
	}
	private create(
		input: DraftSource,
		ai: AiConfiguration,
		announcement: (event: MeetupEvent) => Promise<ContentMedia | null>,
	) {
		const base = new DraftWorkspaceComposition().create(input, announcement);
		const generator = new GeminiGenerationGatewayComposition().text(
			ai.model,
			ai.apiKey,
		);
		return {
			...base,
			generator,
			generate: new GenerateTextProposal(
				base.store,
				generator,
				base.fingerprints,
				base.policy,
				new DraftProposalComposition().socialPosts(),
			),
		};
	}
}
