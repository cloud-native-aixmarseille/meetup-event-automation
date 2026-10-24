import {
	CONTENT_TARGETS,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { PublicAssetUrl } from "@meetup-automation/publication";
import { ContentConfiguration } from "./content-configuration.js";
import { CoverArtworkComposition } from "./cover-artwork-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { DraftMediaInputReader } from "./draft-media-input.js";
import { DraftReviewComposition } from "./draft-review-composition.js";
import { DraftSourceInput } from "./draft-source-input.js";
import { DraftTargetInput } from "./draft-target-input.js";
import { EventCopyComposition } from "./event-copy-composition.js";
import { GenerateDraftAction } from "./generate-draft-action.js";
import { ReviewDraftsAction } from "./review-drafts-action.js";
import { SocialPostComposition } from "./social-post-composition.js";

export class DraftActionComposition {
	input(): DraftSourceInput {
		const runtime = new GithubActionsComposition();
		return new DraftSourceInput(
			runtime.runtimeInput(),
			runtime.publicationUrlInput(),
			runtime.conferenceHallInput(),
			new ContentConfiguration(runtime.runtimeInput(), new PublicAssetUrl()),
			runtime.eventPublicationConfiguration(),
		);
	}
	eventCopy() {
		const input = this.input();
		const target = new DraftTargetInput(["title", "description"]);
		const composition = new EventCopyComposition();
		return new GenerateDraftAction(
			input.read.bind(input),
			target.read.bind(target),
			new GithubActionsComposition().aiInput(),
			new DraftProposalComposition().policy(),
			composition.create.bind(composition),
		);
	}
	coverArtwork() {
		const input = this.input();
		const media = new DraftMediaInputReader(input);
		const composition = new CoverArtworkComposition();
		return new GenerateDraftAction(
			async (locale) => ({ ...(await input.read(locale)), ...media.artwork() }),
			() => "cover",
			new GithubActionsComposition().aiInput(),
			new DraftProposalComposition().policy(),
			composition.create.bind(composition),
		);
	}
	slackPost() {
		const input = this.input();
		const target = new DraftTargetInput(
			CONTENT_TARGETS.filter((item) => item.startsWith("slack-")),
		);
		const composition = new SocialPostComposition();
		return new GenerateDraftAction(
			input.read.bind(input),
			target.read.bind(target),
			new GithubActionsComposition().aiInput(),
			new DraftProposalComposition().policy(),
			composition.slack.bind(composition),
		);
	}
	linkedinPost() {
		const input = this.input();
		const media = new DraftMediaInputReader(input);
		const target = new DraftTargetInput(
			CONTENT_TARGETS.filter((item) => item.startsWith("linkedin:")),
		);
		const composition = new SocialPostComposition();
		return new GenerateDraftAction(
			async (locale) => ({
				...(await input.read(locale)),
				...media.announcement(),
			}),
			target.read.bind(target),
			new GithubActionsComposition().aiInput(),
			new DraftProposalComposition().policy(),
			composition.linkedin.bind(composition),
		);
	}
	review(): ReviewDraftsAction {
		const input = this.input();
		const composition = new DraftReviewComposition();
		return new ReviewDraftsAction(
			input,
			new DraftMediaInputReader(input),
			composition.review.bind(composition),
		);
	}
}
