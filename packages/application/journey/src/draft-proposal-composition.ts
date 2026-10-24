import { SocialPostDraft } from "@meetup-automation/communication";
import {
	EventCopyAgenda,
	EventCopyDescriptionDraft,
	EventCopyTitleDraft,
} from "@meetup-automation/event";
import {
	ContentFingerprint,
	CoverArtwork,
} from "@meetup-automation/publication";
import { ApprovalValueFingerprint } from "./approval/approval-value-fingerprint.js";
import { CoverArtworkDrafts } from "./assets/cover-artwork-drafts.js";
import { SocialPostDrafts } from "./communication/social-post-drafts.js";
import { EventCopyDrafts } from "./event/event-copy-drafts.js";
import { PromotionalContentFingerprint } from "./proposals/promotional-content-fingerprint.js";
import { PromotionalContentPolicy } from "./proposals/promotional-content-policy.js";

export class DraftProposalComposition {
	eventCopy(): EventCopyDrafts {
		return new EventCopyDrafts(
			new EventCopyTitleDraft(new EventCopyAgenda()),
			new EventCopyDescriptionDraft(new EventCopyAgenda()),
		);
	}
	artwork(): CoverArtworkDrafts {
		return new CoverArtworkDrafts(new CoverArtwork());
	}
	socialPosts(): SocialPostDrafts {
		return new SocialPostDrafts(new SocialPostDraft());
	}
	policy(): PromotionalContentPolicy {
		return new PromotionalContentPolicy([
			this.eventCopy(),
			this.artwork(),
			this.socialPosts(),
		]);
	}
	fingerprints(): PromotionalContentFingerprint {
		return new PromotionalContentFingerprint(
			new ApprovalValueFingerprint(new ContentFingerprint()),
			this.policy(),
		);
	}
}
