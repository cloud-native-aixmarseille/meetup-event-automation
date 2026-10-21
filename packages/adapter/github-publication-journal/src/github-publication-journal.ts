import type {
	PublicationJournal,
	PublicationRecord,
} from "@meetup-automation/publication";

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

const MARKER = "<!-- meetup-publication:v1\n";

export class GithubPublicationJournal implements PublicationJournal {
	constructor(
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
		const body = comment.body ?? "";
		if (!body.endsWith("\n-->"))
			throw new Error("Publication journal is corrupted");
		const value: unknown = JSON.parse(body.slice(MARKER.length, -4));
		if (!value || typeof value !== "object")
			throw new Error("Publication journal is corrupted");
		const record = value as { state?: unknown; url?: unknown };
		if (record.state === "pending" && record.url === undefined) return {};
		if (
			(record.state === "saved" || record.state === "published") &&
			typeof record.url === "string"
		)
			return { url: record.url };
		throw new Error("Publication journal is corrupted");
	}

	async reserve(): Promise<void> {
		if (await this.load())
			throw new Error("Publication creation was already reserved");
		await this.client.rest.issues.createComment({
			...this.scope,
			body: `${MARKER}${JSON.stringify({ state: "pending" })}\n-->`,
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
		const body = `${MARKER}${JSON.stringify({ state: "saved", url })}\n-->`;
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
						comment.body?.startsWith(MARKER),
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
