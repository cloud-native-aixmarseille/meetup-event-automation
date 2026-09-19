import {
	CommunicationApproval,
	type CommunicationApprovalRepository,
	type CommunicationApprovalSaveResult,
	type CommunicationApprovalSnapshot,
	CommunicationIdempotency,
} from "@meetup-automation/communication";
import { GithubCommunicationApprovalRepositoryConfigurationError } from "./github-communication-approval-repository-configuration-error.js";
import {
	COMMUNICATION_APPROVAL_COMMENT_MARKER,
	type GithubCommunicationApprovalRepositoryClient,
	type GithubCommunicationApprovalRepositoryOptions,
	type ManagedComment,
} from "./github-communication-approval-repository-contracts.js";
import { GithubCommunicationApprovalRepositoryResponseError } from "./github-communication-approval-repository-response-error.js";
import { GithubCommunicationApprovalRepositoryStateError } from "./github-communication-approval-repository-state-error.js";

export class GithubCommunicationApprovalRepository
	implements CommunicationApprovalRepository
{
	private readonly owner: string;
	private readonly repo: string;
	private readonly issueNumber: number;
	private readonly trustedAuthorLogin: string;

	constructor(
		private readonly client: GithubCommunicationApprovalRepositoryClient,
		options: GithubCommunicationApprovalRepositoryOptions,
	) {
		this.owner = GithubCommunicationApprovalRepository.repositoryPart(
			options.owner,
			"owner",
		);
		this.repo = GithubCommunicationApprovalRepository.repositoryPart(
			options.repo,
			"repo",
		);
		this.issueNumber = GithubCommunicationApprovalRepository.issueNumber(
			options.issueNumber,
		);
		this.trustedAuthorLogin =
			GithubCommunicationApprovalRepository.trustedAuthor(
				options.trustedAuthorLogin,
			);
	}

	async findApproved(
		eventId: string,
	): Promise<CommunicationApprovalSnapshot | undefined> {
		const normalizedEventId =
			GithubCommunicationApprovalRepository.safeEventId(eventId);
		const comment = await this.findManagedComment();
		if (!comment) {
			return undefined;
		}
		const snapshot = GithubCommunicationApprovalRepository.parseComment(
			comment.body,
		);
		if (snapshot.facts.eventId !== normalizedEventId) {
			throw new GithubCommunicationApprovalRepositoryStateError(
				"Managed communication approval belongs to another event",
			);
		}
		return snapshot;
	}

	async saveApproved(
		snapshot: CommunicationApprovalSnapshot,
	): Promise<CommunicationApprovalSaveResult> {
		const canonical =
			GithubCommunicationApprovalRepository.strictSnapshot(snapshot);
		const desiredBody =
			GithubCommunicationApprovalRepository.renderComment(canonical);
		const comment = await this.findManagedComment();
		if (!comment) {
			await this.client.rest.issues.createComment({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issueNumber,
				body: desiredBody,
			});
			return Object.freeze({ changed: true });
		}

		const existing = GithubCommunicationApprovalRepository.parseComment(
			comment.body,
		);
		if (existing.facts.eventId !== canonical.facts.eventId) {
			throw new GithubCommunicationApprovalRepositoryStateError(
				"Managed communication approval belongs to another event",
			);
		}
		if (comment.body === desiredBody) {
			return Object.freeze({ changed: false });
		}

		await this.client.rest.issues.updateComment({
			owner: this.owner,
			repo: this.repo,
			comment_id: comment.id,
			body: desiredBody,
		});
		return Object.freeze({ changed: true });
	}

	private async findManagedComment(): Promise<ManagedComment | undefined> {
		const matching = (await this.listComments()).filter(
			(comment) =>
				comment.body.startsWith(COMMUNICATION_APPROVAL_COMMENT_MARKER) &&
				comment.authorLogin?.toLowerCase() ===
					this.trustedAuthorLogin.toLowerCase(),
		);
		if (matching.length > 1) {
			throw new GithubCommunicationApprovalRepositoryStateError(
				"Multiple trusted communication approval comments found",
			);
		}
		return matching[0];
	}

	private async listComments(): Promise<readonly ManagedComment[]> {
		const comments: ManagedComment[] = [];
		let page = 1;
		while (true) {
			const response = await this.client.rest.issues.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.issueNumber,
				page,
				per_page: 100,
			});
			if (!Array.isArray(response.data)) {
				throw new GithubCommunicationApprovalRepositoryResponseError(
					"GitHub comment list response must contain an array",
				);
			}
			for (const value of response.data) {
				const comment = GithubCommunicationApprovalRepository.mapComment(value);
				if (comment) {
					comments.push(comment);
				}
			}

			const link = GithubCommunicationApprovalRepository.header(
				response.headers,
				"link",
			);
			const hasNext =
				link === undefined
					? response.data.length === 100
					: /<[^>]+>;\s*rel="next"/.test(link);
			if (!hasNext) {
				return comments;
			}
			page += 1;
		}
	}

	private static parseComment(body: string): CommunicationApprovalSnapshot {
		try {
			const openingFence = "```json";
			const start = body.indexOf(openingFence);
			const end = body.indexOf("```", start + openingFence.length);
			const json =
				start < 0 || end < 0
					? ""
					: body.slice(start + openingFence.length, end).trim();
			if (!json) {
				throw new Error("missing JSON block");
			}
			const snapshot = CommunicationApproval.parseCommunicationApprovalSnapshot(
				JSON.parse(json),
			);
			if (
				body !== GithubCommunicationApprovalRepository.renderComment(snapshot)
			) {
				throw new Error("non-canonical managed comment");
			}
			return snapshot;
		} catch {
			throw new GithubCommunicationApprovalRepositoryStateError(
				"Managed communication approval comment is corrupted",
			);
		}
	}

	private static strictSnapshot(
		snapshot: CommunicationApprovalSnapshot,
	): CommunicationApprovalSnapshot {
		try {
			return CommunicationApproval.parseCommunicationApprovalSnapshot(snapshot);
		} catch {
			throw new GithubCommunicationApprovalRepositoryStateError(
				"Communication approval snapshot is invalid",
			);
		}
	}

	private static renderComment(
		snapshot: CommunicationApprovalSnapshot,
	): string {
		return `${COMMUNICATION_APPROVAL_COMMENT_MARKER}\n\nMaintainer-approved communication facts. Any fact change requires a new approval.\n\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\``;
	}

	private static mapComment(value: unknown): ManagedComment | undefined {
		if (
			!GithubCommunicationApprovalRepository.isRecord(value) ||
			!Number.isSafeInteger(value.id)
		) {
			return undefined;
		}
		if (typeof value.body !== "string") {
			return undefined;
		}
		const authorLogin =
			GithubCommunicationApprovalRepository.isRecord(value.user) &&
			typeof value.user.login === "string"
				? value.user.login
				: undefined;
		return {
			id: Number(value.id),
			body: value.body,
			...(authorLogin ? { authorLogin } : {}),
		};
	}

	private static repositoryPart(value: string, name: "owner" | "repo"): string {
		const normalized = value.trim();
		if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) {
			throw new GithubCommunicationApprovalRepositoryConfigurationError(
				`GitHub ${name} must be a valid repository segment`,
			);
		}
		return normalized;
	}

	private static issueNumber(value: number): number {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new GithubCommunicationApprovalRepositoryConfigurationError(
				"GitHub issue number must be a positive integer",
			);
		}
		return value;
	}

	private static trustedAuthor(value: string): string {
		const normalized = value.trim();
		if (!normalized) {
			throw new GithubCommunicationApprovalRepositoryConfigurationError(
				"A trusted GitHub bot author login is required",
			);
		}
		return normalized;
	}

	private static safeEventId(value: string): string {
		const normalized = value.trim();
		if (!CommunicationIdempotency.isSafeCommunicationIdentifier(normalized)) {
			throw new GithubCommunicationApprovalRepositoryConfigurationError(
				"Communication event ID must be a stable, PII-free identifier",
			);
		}
		return normalized;
	}

	private static header(
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
