import type {
	AttentionRepository,
	AttentionState,
} from "@meetup-automation/communication";
import type {
	FollowUpAttentionCodec,
	FollowUpAttentionPresentation,
} from "@meetup-automation/journey";
import type { GithubOrganizerApproval } from "./github-organizer-approval.js";

/** Moves notification reservations into the shared comment before retiring the old view. */
export class GithubFollowUpAttentionRepository implements AttentionRepository {
	private sharedCommentId?: number;
	constructor(
		private readonly approvals: Pick<
			GithubOrganizerApproval,
			"followUpAttention" | "saveFollowUpAttention"
		>,
		private readonly previous: AttentionRepository & {
			retire(commentId: number): Promise<void>;
		},
		private readonly codec: FollowUpAttentionCodec,
		private readonly presentation: FollowUpAttentionPresentation,
	) {}
	async load(): Promise<AttentionState | undefined> {
		const shared = await this.approvals.followUpAttention();
		this.sharedCommentId = shared?.commentId;
		const previous = await this.previous.load();
		return shared?.body ? this.codec.read(shared.body) : previous;
	}
	async save(state: AttentionState): Promise<void> {
		if (!this.sharedCommentId) return this.previous.save(state);
		await this.approvals.saveFollowUpAttention(
			this.codec.marker(state),
			this.presentation.details(state),
		);
		await this.previous.retire(this.sharedCommentId);
	}
}
