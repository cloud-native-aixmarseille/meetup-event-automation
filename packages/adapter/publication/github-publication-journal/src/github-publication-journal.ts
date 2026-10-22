import type {
	PublicationJournal,
	PublicationRecord,
} from "@meetup-automation/publication";
import { PublicationCommentCodec } from "./publication-comment-codec.js";

type Comment = {
	id: number;
	body?: string | null;
	user?: { login: string } | null;
};
type Scope = { owner: string; repo: string; issue_number: number };
interface JournalClient {
	rest: {
		issues: {
			listComments(input: Scope & { page: number; per_page: number }): Promise<{
				data: Comment[];
				headers: { link?: string };
			}>;
			createComment(input: Scope & { body: string }): Promise<unknown>;
			updateComment(input: {
				owner: string;
				repo: string;
				comment_id: number;
				body: string;
			}): Promise<unknown>;
		};
	};
}

export interface GithubPublicationJournalCollaborators {
	readonly publicationCommentCodec: Pick<
		PublicationCommentCodec,
		"decode" | "encode"
	>;
}

export class GithubPublicationJournal implements PublicationJournal {
	constructor(
		private readonly collaborators: GithubPublicationJournalCollaborators,
		private readonly client: JournalClient,
		private readonly scope: Scope,
		private readonly author: string,
	) {
		if (!author.endsWith("[bot]"))
			throw new Error("Publication journal requires the GitHub App bot");
	}

	async load(): Promise<PublicationRecord | undefined> {
		const comment = await this.find();
		if (!comment) return undefined;
		return this.collaborators.publicationCommentCodec.decode(
			comment.body ?? "",
		);
	}

	async reserve(): Promise<void> {
		if (await this.load())
			throw new Error("Publication creation was already reserved");
		await this.client.rest.issues.createComment({
			...this.scope,
			body: this.collaborators.publicationCommentCodec.encode({}),
		});
		if (!(await this.load()))
			throw new Error("Publication reservation was not persisted");
	}

	async record(url: string): Promise<void> {
		const existing = await this.load();
		if (existing?.url && existing.url !== url)
			throw new Error("Publication journal identity conflict");
		if (existing?.url === url) return;
		const comment = await this.find();
		const body = this.collaborators.publicationCommentCodec.encode({ url });
		if (comment) {
			await this.client.rest.issues.updateComment({
				owner: this.scope.owner,
				repo: this.scope.repo,
				comment_id: comment.id,
				body,
			});
		} else await this.client.rest.issues.createComment({ ...this.scope, body });
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
						comment.body?.startsWith(PublicationCommentCodec.marker),
				),
			);
			if (matches.length > 1) throw new Error("Multiple publication journals");
			const hasNext =
				response.headers.link !== undefined
					? /<[^>]+>;\s*rel="next"/.test(response.headers.link)
					: response.data.length === 100;
			if (!hasNext) return matches[0];
		}
		throw new Error("Publication journal pagination exceeded its bound");
	}
}
export type GithubPublicationJournalArguments =
	ConstructorParameters<typeof GithubPublicationJournal> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
