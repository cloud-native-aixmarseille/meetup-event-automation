import { DraftProposalComposition } from "@meetup-automation/journey";
import { CoverArtworkComposition } from "./cover-artwork-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { DraftMediaInputReader } from "./draft-media-input.js";
import { DraftReviewComposition } from "./draft-review-composition.js";
import { DraftSourceComposition } from "./draft-source-composition.js";
import { DraftTargetInput } from "./draft-target-input.js";
import { EventCopyComposition } from "./event-copy-composition.js";
import { GenerateDraftAction } from "./generate-draft-action.js";
import { ReviewDraftsAction } from "./review-drafts-action.js";
import { SocialDraftTargetInput } from "./social-draft-target-input.js";
import { SocialPostComposition } from "./social-post-composition.js";

export class DraftActionComposition {
	eventCopy() {
		const input = new DraftSourceComposition().create();
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
		const input = new DraftSourceComposition().create();
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
		const input = new DraftSourceComposition().create();
		const target = new SocialDraftTargetInput("slack");
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
		const input = new DraftSourceComposition().create();
		const media = new DraftMediaInputReader(input);
		const target = new SocialDraftTargetInput("linkedin");
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
		const input = new DraftSourceComposition().create();
		const composition = new DraftReviewComposition();
		return new ReviewDraftsAction(
			input,
			new DraftMediaInputReader(input),
			composition.work.bind(composition),
			composition.review.bind(composition),
		);
	}
}
