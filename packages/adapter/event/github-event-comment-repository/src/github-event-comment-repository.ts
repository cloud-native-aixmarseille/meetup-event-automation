import type {
	EventCommentReconciliation,
	EventCommentRepository,
	EventDiagnostic,
	EventIdentity,
} from "@meetup-automation/event";
import type { DiagnosticCommentPresenter } from "./diagnostic-comment-presenter.js";
import type { DiagnosticCommentSections } from "./diagnostic-comment-sections.js";
import { GitHubEventCommentRepositoryConfigurationError } from "./github-event-comment-repository-configuration-error.js";
import {
	COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER,
	DUPLICATE_COMMENT_MARKER,
	EVENT_DIAGNOSTIC_COMMENT_MARKER,
	type GitHubEventCommentRepositoryClient,
	type GitHubEventCommentRepositoryOptions,
	type ManagedComment,
} from "./github-event-comment-repository-contracts.js";
import { GitHubEventCommentRepositoryResponseError } from "./github-event-comment-repository-response-error.js";
import { GitHubEventCommentRepositoryScopeError } from "./github-event-comment-repository-scope-error.js";
import type {
	EventCommentMessages,
	EventCommentMessagesArguments,
} from "./i18n/event-comment-messages.js";

export interface GitHubEventCommentRepositoryCollaborators {
	readonly diagnosticCommentSections: Pick<
		DiagnosticCommentSections,
		"merge" | "hasSocial"
	>;
	readonly diagnosticCommentPresenter: Pick<
		DiagnosticCommentPresenter,
		"render"
	>;
	readonly createEventCommentMessages: (
		...args: EventCommentMessagesArguments
	) => EventCommentMessages;
}

export class GitHubEventCommentRepository implements EventCommentRepository {
	private readonly messages: EventCommentMessages;
	private readonly owner: string;
	private readonly repo: string;
	private readonly repositoryName: string;
	private readonly authorLogin: string;

	constructor(
		private readonly collaborators: GitHubEventCommentRepositoryCollaborators,
		private readonly client: GitHubEventCommentRepositoryClient,
		private readonly options: GitHubEventCommentRepositoryOptions,
	) {
		this.messages = this.collaborators.createEventCommentMessages(
			options.locale,
		);
		this.owner = this.requireRepositoryPart(options.owner, "owner");
		this.repo = this.requireRepositoryPart(options.repo, "repo");
		this.repositoryName = `${this.owner}/${this.repo}`;
		this.authorLogin = options.authorLogin.trim();
		if (!this.authorLogin)
			throw new GitHubEventCommentRepositoryConfigurationError(
				"Managed comment author is required",
			);
	}

	async reconcileDiagnostics(
		identity: EventIdentity,
		diagnostics: readonly EventDiagnostic[],
		scope?: "social",
	): Promise<EventCommentReconciliation> {
		this.assertScope(identity.repository);
		const managedComments = await this.listManagedComments(
			identity.issueNumber,
		);
		const retired = managedComments.filter((comment) =>
			comment.body.startsWith(COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER),
		);
		const [canonical, ...duplicates] = managedComments.filter(
			(comment) => !retired.includes(comment),
		);
		let changed = await this.retireComments(identity.issueNumber, duplicates);
		const body = await this.body(
			identity.issueNumber,
			canonical,
			diagnostics,
			scope,
		);

		if (!canonical) {
			if (
				(!retired.length || scope === "social") &&
				!diagnostics.some((item) => item.severity !== "info")
			) {
				return { changed };
			}
			await this.client.rest.issues.createComment({
				owner: this.owner,
				repo: this.repo,
				issue_number: identity.issueNumber,
				body,
			});
			if (!scope)
				await this.retireComments(identity.issueNumber, retired, true);
			return { changed: true };
		}

		if (canonical.body !== body) {
			await this.updateComment(canonical.id, body);
			changed = true;
		}

		if (scope) return { changed };
		const retiredChanged = await this.retireComments(
			identity.issueNumber,
			retired,
			true,
		);
		return { changed: changed || retiredChanged };
	}
	private async body(
		issueNumber: number,
		canonical: ManagedComment | undefined,
		diagnostics: readonly EventDiagnostic[],
		scope?: "social",
	): Promise<string> {
		const previous =
			canonical && this.options.retainedContent
				? await this.options.retainedContent.load(
						issueNumber,
						canonical.id,
						canonical.body,
					)
				: { body: canonical?.body ?? "", retained: "" };
		const rendered = this.collaborators.diagnosticCommentPresenter.render(
			diagnostics,
			this.messages,
		);
		const body = this.collaborators.diagnosticCommentSections.merge(
			previous.body,
			rendered,
			scope,
		);
		return previous.retained ? `${body}\n\n${previous.retained}` : body;
	}

	private async listManagedComments(
		issueNumber: number,
	): Promise<readonly ManagedComment[]> {
		const comments: ManagedComment[] = [];
		let page = 1;
		let hasNextPage = true;

		while (hasNextPage) {
			const response = await this.client.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: issueNumber,
				page,
				per_page: 100,
			});
			if (!Array.isArray(response.data)) {
				throw new GitHubEventCommentRepositoryResponseError(
					"GitHub comment list response must contain an array",
				);
			}

			for (const rawComment of response.data) {
				const comment = this.mapComment(rawComment);
				if (comment && this.isManagedComment(comment)) {
					comments.push(comment);
				}
			}

			const linkHeader = this.readHeader(response.headers, "link");
			hasNextPage =
				linkHeader === undefined
					? response.data.length === 100
					: /<[^>]+>;\s*rel="next"/.test(linkHeader);
			page += 1;
		}

		return comments.sort((left, right) => left.id - right.id);
	}

	private isManagedComment(comment: ManagedComment): boolean {
		if (
			!comment.body.startsWith(EVENT_DIAGNOSTIC_COMMENT_MARKER) &&
			!(
				this.options.retireCommunicationReports &&
				this.authorLogin &&
				comment.body.startsWith(COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER)
			)
		) {
			return false;
		}
		return (
			comment.authorType === "Bot" &&
			comment.authorLogin?.toLowerCase() === this.authorLogin.toLowerCase()
		);
	}

	private async retireComments(
		issueNumber: number,
		duplicates: readonly ManagedComment[],
		deleteReports = false,
	): Promise<boolean> {
		for (const duplicate of duplicates) {
			const previous = this.options.retainedContent
				? await this.options.retainedContent.load(
						issueNumber,
						duplicate.id,
						duplicate.body,
					)
				: undefined;
			if (
				previous?.retained ||
				this.collaborators.diagnosticCommentSections.hasSocial(
					previous?.body ?? duplicate.body,
				)
			)
				throw new Error("Duplicate diagnostic comment contains managed state");
			if (deleteReports && this.client.rest.issues.deleteComment) {
				await this.client.rest.issues.deleteComment({
					owner: this.owner,
					repo: this.repo,
					comment_id: duplicate.id,
				});
				continue;
			}
			await this.updateComment(
				duplicate.id,
				`${DUPLICATE_COMMENT_MARKER}\n\n${this.messages.t("comment.duplicate")}`,
			);
			if (this.client.minimizeComment) {
				await this.client.minimizeComment({
					commentId: duplicate.id,
					classifier: "OUTDATED",
				});
			}
		}
		return duplicates.length > 0;
	}

	private async updateComment(commentId: number, body: string): Promise<void> {
		await this.client.rest.issues.updateComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: commentId,
			body,
		});
	}

	private assertScope(repository: string): void {
		if (repository.toLowerCase() !== this.repositoryName.toLowerCase()) {
			throw new GitHubEventCommentRepositoryScopeError(
				this.repositoryName,
				repository,
			);
		}
	}

	private mapComment(data: unknown): ManagedComment | null {
		if (!this.isRecord(data)) {
			throw new GitHubEventCommentRepositoryResponseError(
				"GitHub comment must be an object",
			);
		}
		if (!Number.isInteger(data.id) || Number(data.id) <= 0) {
			throw new GitHubEventCommentRepositoryResponseError(
				"GitHub comment identifier must be a positive integer",
			);
		}
		if (data.body === null) {
			return null;
		}
		if (typeof data.body !== "string") {
			throw new GitHubEventCommentRepositoryResponseError(
				"GitHub comment body must be a string or null",
			);
		}

		const user = this.isRecord(data.user) ? data.user : undefined;
		return {
			id: Number(data.id),
			body: data.body,
			authorLogin: typeof user?.login === "string" ? user.login : undefined,
			authorType: typeof user?.type === "string" ? user.type : undefined,
		};
	}

	private requireRepositoryPart(value: string, name: "owner" | "repo"): string {
		const normalized = value.trim();
		if (normalized === "" || normalized.includes("/")) {
			throw new GitHubEventCommentRepositoryConfigurationError(
				`GitHub ${name} must be a non-empty repository name segment`,
			);
		}
		return normalized;
	}

	private readHeader(
		headers: Readonly<Record<string, unknown>> | undefined,
		name: string,
	): string | undefined {
		const value = headers?.[name];
		return typeof value === "string" ? value : undefined;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
}
export type GitHubEventCommentRepositoryArguments =
	ConstructorParameters<typeof GitHubEventCommentRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
