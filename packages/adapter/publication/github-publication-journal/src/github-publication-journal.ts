import {
	type EventPublicationIdentity,
	type MeetupCoverJournal,
	type MeetupCoverRecord,
	MeetupEventUrl,
	type PublicationJournal,
	type PublicationRecord,
} from "@meetup-automation/publication";
import { PublicationCommentCodec } from "./publication-comment-codec.js";

type Comment = {
	id: number;
	body?: string | null;
	user?: { login: string } | null;
};
type Scope = { owner: string; repo: string; issue_number: number };
export interface JournalClient {
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

export class GithubPublicationJournal
	implements PublicationJournal, MeetupCoverJournal
{
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
		const record = this.collaborators.publicationCommentCodec.decode(
			comment.body ?? "",
		);
		if (!record.url) return {};
		const url = MeetupEventUrl.parse(record.url);
		if (!url) throw new Error("Invalid Meetup journal identity");
		return {
			identity: { id: url.id, reviewUrl: url.value, publicUrl: url.value },
		};
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

	async record(identity: EventPublicationIdentity): Promise<void> {
		const parsed = MeetupEventUrl.parse(identity.reviewUrl);
		if (
			!parsed ||
			parsed.id !== identity.id ||
			parsed.value !== identity.reviewUrl ||
			parsed.value !== identity.publicUrl
		)
			throw new Error("Invalid Meetup journal identity");
		const url = parsed.value;
		const existing = await this.load();
		if (existing?.identity?.reviewUrl && existing.identity.reviewUrl !== url)
			throw new Error("Publication journal identity conflict");
		if (existing?.identity?.reviewUrl === url) return;
		const comment = await this.find();
		const previous = comment
			? this.collaborators.publicationCommentCodec.decode(comment.body ?? "")
			: {};
		const body = this.collaborators.publicationCommentCodec.encode({
			...previous,
			url,
		});
		if (comment) {
			await this.client.rest.issues.updateComment({
				owner: this.scope.owner,
				repo: this.scope.repo,
				comment_id: comment.id,
				body,
			});
		} else await this.client.rest.issues.createComment({ ...this.scope, body });
	}

	async readCover(): Promise<MeetupCoverRecord | undefined> {
		const comment = await this.find();
		return comment
			? this.collaborators.publicationCommentCodec.decode(comment.body ?? "")
					.cover
			: undefined;
	}

	async reserveCover(
		record: Omit<MeetupCoverRecord, "photoId">,
	): Promise<void> {
		const previous = await this.readCover();
		if (
			previous &&
			(!previous.photoId ||
				previous.groupUrl !== record.groupUrl ||
				previous.fingerprint === record.fingerprint)
		)
			throw new Error(
				"Meetup cover upload already reserved or conflicts with its target",
			);
		await this.writeCover(record);
	}

	async recordCover(
		record: MeetupCoverRecord & { photoId: string },
	): Promise<void> {
		const previous = await this.readCover();
		if (
			!previous ||
			previous.groupUrl !== record.groupUrl ||
			previous.fingerprint !== record.fingerprint ||
			(previous.photoId !== undefined && previous.photoId !== record.photoId)
		)
			throw new Error("Meetup cover upload identity conflict");
		await this.writeCover(record);
	}

	private async writeCover(cover: MeetupCoverRecord): Promise<void> {
		const comment = await this.find();
		if (!comment)
			throw new Error("Reserve the event identity before uploading artwork");
		const previous = this.collaborators.publicationCommentCodec.decode(
			comment.body ?? "",
		);
		await this.client.rest.issues.updateComment({
			owner: this.scope.owner,
			repo: this.scope.repo,
			comment_id: comment.id,
			body: this.collaborators.publicationCommentCodec.encode({
				...previous,
				cover,
			}),
		});
		const persisted = await this.readCover();
		if (
			!persisted ||
			persisted.groupUrl !== cover.groupUrl ||
			persisted.fingerprint !== cover.fingerprint ||
			persisted.photoId !== cover.photoId
		)
			throw new Error("Meetup cover journal was not persisted");
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
