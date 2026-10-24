import {
	type EventPublicationIdentity,
	type PublicationJournal,
	type PublicationRecord,
	ScheduledEventError,
} from "@meetup-automation/publication";
import { CommunityPublicationCommentCodec } from "./community-publication-comment-codec.js";
import type { JournalClient } from "./github-publication-journal.js";

type Scope = { owner: string; repo: string; issue_number: number };
type Comment = {
	id: number;
	body?: string | null;
	user?: { login: string } | null;
};

export class GithubCommunityPublicationJournal implements PublicationJournal {
	constructor(
		private readonly codec: Pick<
			CommunityPublicationCommentCodec,
			"encode" | "decode"
		>,
		private readonly client: JournalClient,
		private readonly scope: Scope,
		private readonly author: string,
	) {
		if (!author.endsWith("[bot]"))
			throw new Error("Community publication requires the GitHub App bot");
	}

	async load(): Promise<PublicationRecord | undefined> {
		const comment = await this.find();
		return comment ? this.codec.decode(comment.body ?? "") : undefined;
	}

	async reserve(): Promise<void> {
		if (await this.load()) throw new ScheduledEventError("uncertain");
		await this.client.rest.issues.createComment({
			...this.scope,
			body: this.codec.encode({}),
		});
		if (!(await this.load())) throw new ScheduledEventError("uncertain");
	}

	async record(identity: EventPublicationIdentity): Promise<void> {
		const comment = await this.find();
		const previous = comment
			? this.codec.decode(comment.body ?? "").identity
			: undefined;
		if (
			previous &&
			(previous.id !== identity.id || previous.reviewUrl !== identity.reviewUrl)
		)
			throw new ScheduledEventError("conflict");
		if (
			previous &&
			(identity.publicUrl === undefined ||
				previous.publicUrl === identity.publicUrl)
		)
			return;
		const body = this.codec.encode({ identity });
		if (comment) {
			await this.client.rest.issues.updateComment({
				owner: this.scope.owner,
				repo: this.scope.repo,
				comment_id: comment.id,
				body,
			});
		} else await this.client.rest.issues.createComment({ ...this.scope, body });
		const saved = await this.load();
		if (
			saved?.identity?.id !== identity.id ||
			saved.identity.publicUrl !== identity.publicUrl
		)
			throw new ScheduledEventError("uncertain");
	}

	private async find(): Promise<Comment | undefined> {
		const matches: Comment[] = [];
		for (let page = 1; page <= 100; page++) {
			const response = await this.client.rest.issues.listComments({
				...this.scope,
				page,
				per_page: 100,
			});
			matches.push(
				...response.data.filter(
					(comment) =>
						comment.user?.login.toLowerCase() === this.author.toLowerCase() &&
						comment.body?.startsWith(CommunityPublicationCommentCodec.marker),
				),
			);
			if (matches.length > 1) throw new ScheduledEventError("conflict");
			const hasNext =
				response.headers.link !== undefined
					? /<[^>]+>;\s*rel="next"/.test(response.headers.link)
					: response.data.length === 100;
			if (!hasNext) return matches[0];
		}
		throw new Error(
			"Community publication journal pagination exceeded its bound",
		);
	}
}
