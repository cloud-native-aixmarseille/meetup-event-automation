import type {
	EventCommentReconciliation,
	EventCommentRepository,
	EventDiagnostic,
	EventIdentity,
} from "@meetup-automation/event";
import {
	type DiagnosticPresentation,
	DiagnosticPresenter,
} from "./diagnostic-presentation.js";
import { GitHubEventCommentRepositoryConfigurationError } from "./github-event-comment-repository-configuration-error.js";
import {
	DUPLICATE_COMMENT_BODY,
	EVENT_DIAGNOSTIC_COMMENT_MARKER,
	type GitHubEventCommentRepositoryClient,
	type GitHubEventCommentRepositoryOptions,
	type ManagedComment,
	RESOLVED_COMMENT_BODY,
} from "./github-event-comment-repository-contracts.js";
import { GitHubEventCommentRepositoryResponseError } from "./github-event-comment-repository-response-error.js";
import { GitHubEventCommentRepositoryScopeError } from "./github-event-comment-repository-scope-error.js";

export class GitHubEventCommentRepository implements EventCommentRepository {
	private readonly owner: string;
	private readonly repo: string;
	private readonly repositoryName: string;
	private readonly authorLogin: string | undefined;

	constructor(
		private readonly client: GitHubEventCommentRepositoryClient,
		options: GitHubEventCommentRepositoryOptions,
	) {
		this.owner = GitHubEventCommentRepository.requireRepositoryPart(
			options.owner,
			"owner",
		);
		this.repo = GitHubEventCommentRepository.requireRepositoryPart(
			options.repo,
			"repo",
		);
		this.repositoryName = `${this.owner}/${this.repo}`;
		this.authorLogin = options.authorLogin?.trim() || undefined;
	}

	async reconcileDiagnostics(
		identity: EventIdentity,
		diagnostics: readonly EventDiagnostic[],
	): Promise<EventCommentReconciliation> {
		this.assertScope(identity.repository);
		const managedComments = await this.listManagedComments(
			identity.issueNumber,
		);
		const [canonical, ...duplicates] = managedComments;
		let changed = await this.minimizeDuplicates(duplicates);
		const body =
			GitHubEventCommentRepository.renderDiagnosticComment(diagnostics);

		if (!canonical) {
			if (body === RESOLVED_COMMENT_BODY) {
				return { changed };
			}
			await this.client.rest.issues.createComment({
				owner: this.owner,
				repo: this.repo,
				issue_number: identity.issueNumber,
				body,
			});
			return { changed: true };
		}

		if (canonical.body !== body) {
			await this.updateComment(canonical.id, body);
			changed = true;
		}

		return { changed };
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
				const comment = GitHubEventCommentRepository.mapComment(rawComment);
				if (comment && this.isManagedComment(comment)) {
					comments.push(comment);
				}
			}

			const linkHeader = GitHubEventCommentRepository.readHeader(
				response.headers,
				"link",
			);
			hasNextPage =
				linkHeader === undefined
					? response.data.length === 100
					: /<[^>]+>;\s*rel="next"/.test(linkHeader);
			page += 1;
		}

		return comments.sort((left, right) => left.id - right.id);
	}

	private isManagedComment(comment: ManagedComment): boolean {
		if (!comment.body.startsWith(EVENT_DIAGNOSTIC_COMMENT_MARKER)) {
			return false;
		}
		return (
			this.authorLogin === undefined ||
			comment.authorLogin?.toLowerCase() === this.authorLogin.toLowerCase()
		);
	}

	private async minimizeDuplicates(
		duplicates: readonly ManagedComment[],
	): Promise<boolean> {
		for (const duplicate of duplicates) {
			await this.updateComment(duplicate.id, DUPLICATE_COMMENT_BODY);
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

	static renderDiagnosticComment(
		diagnostics: readonly EventDiagnostic[],
	): string {
		const actionable = new Map<string, DiagnosticPresentation>();
		for (const item of diagnostics) {
			if (item.severity === "info") {
				continue;
			}
			const presentation = DiagnosticPresenter.presentDiagnostic(item);
			actionable.set(
				`${presentation.field}:${presentation.message}`,
				presentation,
			);
		}

		if (actionable.size === 0) {
			return RESOLVED_COMMENT_BODY;
		}

		const lines = [...actionable.values()]
			.sort(
				(left, right) =>
					left.order - right.order ||
					left.field.localeCompare(right.field, "en", { numeric: true }) ||
					left.message.localeCompare(right.message, "en"),
			)
			.map(({ field, message }) => `- [ ] **${field}**: ${message}`);

		return [
			EVENT_DIAGNOSTIC_COMMENT_MARKER,
			"",
			"Found the following items to complete in the meetup issue:",
			"",
			...lines,
			"",
			"Please update the issue description or labels to address these items. This checklist will refresh automatically.",
		].join("\n");
	}

	private static mapComment(data: unknown): ManagedComment | null {
		if (!GitHubEventCommentRepository.isRecord(data)) {
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

		const user = GitHubEventCommentRepository.isRecord(data.user)
			? data.user
			: undefined;
		return {
			id: Number(data.id),
			body: data.body,
			authorLogin: typeof user?.login === "string" ? user.login : undefined,
		};
	}

	private static requireRepositoryPart(
		value: string,
		name: "owner" | "repo",
	): string {
		const normalized = value.trim();
		if (normalized === "" || normalized.includes("/")) {
			throw new GitHubEventCommentRepositoryConfigurationError(
				`GitHub ${name} must be a non-empty repository name segment`,
			);
		}
		return normalized;
	}

	private static readHeader(
		headers: Readonly<Record<string, unknown>> | undefined,
		name: string,
	): string | undefined {
		const value = headers?.[name];
		return typeof value === "string" ? value : undefined;
	}

	private static isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null;
	}
}
