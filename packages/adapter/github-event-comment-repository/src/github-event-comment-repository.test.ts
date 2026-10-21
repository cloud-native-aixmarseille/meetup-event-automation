import type { EventDiagnostic } from "@meetup-automation/event";
import { describe, expect, it, vi } from "vitest";
import { GithubEventCommentRepositoryComposition } from "./dependency-composition.js";
import { GitHubEventCommentRepository } from "./github-event-comment-repository.js";
import { GitHubEventCommentRepositoryConfigurationError } from "./github-event-comment-repository-configuration-error.js";
import {
	COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER,
	EVENT_DIAGNOSTIC_COMMENT_MARKER,
	type GitHubEventCommentRepositoryClient,
} from "./github-event-comment-repository-contracts.js";
import { GitHubEventCommentRepositoryResponseError } from "./github-event-comment-repository-response-error.js";
import { GitHubEventCommentRepositoryScopeError } from "./github-event-comment-repository-scope-error.js";

const repositoryName = "example/meetups";

const identity = { repository: repositoryName, issueNumber: 42 } as const;

const errorDiagnostic: EventDiagnostic = {
	code: "event.date.invalid",
	severity: "error",
	category: "invalid",
	field: "date",
	message: "An address or other private value must never be rendered",
};

function client(withMinimize = true) {
	const listComments = vi.fn();
	const createComment = vi.fn();
	const updateComment = vi.fn();
	const minimizeComment = vi.fn();
	const value = {
		rest: {
			issues: { listComments, createComment, updateComment },
		},
		...(withMinimize ? { minimizeComment } : {}),
	} as GitHubEventCommentRepositoryClient;
	return { value, listComments, createComment, updateComment, minimizeComment };
}

function adapter(
	github: GitHubEventCommentRepositoryClient,
	authorLogin = "meetup-bot",
) {
	return new GitHubEventCommentRepository(
		{
			diagnosticCommentPresenter:
				new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
			createEventCommentMessages: (...args) =>
				new GithubEventCommentRepositoryComposition().eventCommentMessages(
					...args,
				),
		},
		github,
		{
			owner: "example",
			repo: "meetups",
			authorLogin,
		},
	);
}

function comment(id: number, body: string, login = "meetup-bot") {
	return { id, body, user: { login, type: "Bot" } };
}

describe("GitHubEventCommentRepository", () => {
	it("deletes a trusted state-free stage report after the merged checklist is saved", async () => {
		// Arrange
		const github = client();
		const deleteComment = vi.fn();
		const value = {
			...github.value,
			rest: { issues: { ...github.value.rest.issues, deleteComment } },
		};
		github.listComments.mockResolvedValue({
			data: [
				comment(12, `${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nOld errors`),
			],
		});
		const load = vi.fn().mockResolvedValue("");
		const repository = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			value,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "meetup-bot",
				retireCommunicationReports: true,
				retainedContent: { load },
			},
		);

		// Act
		await repository.reconcileDiagnostics(identity, [errorDiagnostic]);

		// Assert
		expect(deleteComment).toHaveBeenCalledWith({
			owner: "example",
			repo: "meetups",
			comment_id: 12,
		});
		expect(github.createComment.mock.invocationCallOrder[0]).toBeLessThan(
			deleteComment.mock.invocationCallOrder[0] ?? 0,
		);
		expect(load.mock.invocationCallOrder[0]).toBeLessThan(
			deleteComment.mock.invocationCallOrder[0] ?? 0,
		);
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.minimizeComment).not.toHaveBeenCalled();
	});

	it("preserves stage comments that contain trusted delivery state", async () => {
		// Arrange
		const github = client();
		const deleteComment = vi.fn();
		const value = {
			...github.value,
			rest: { issues: { ...github.value.rest.issues, deleteComment } },
		};
		github.listComments.mockResolvedValue({
			data: [
				comment(12, `${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nStored state`),
			],
		});
		const repository = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			value,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "meetup-bot",
				retireCommunicationReports: true,
				retainedContent: {
					load: vi.fn().mockResolvedValue("Reserved delivery state"),
				},
			},
		);

		// Act
		const result = repository.reconcileDiagnostics(identity, [errorDiagnostic]);

		// Assert
		await expect(result).rejects.toThrow(
			"Duplicate diagnostic comment contains managed state",
		);
		expect(deleteComment).not.toHaveBeenCalled();
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.minimizeComment).not.toHaveBeenCalled();
	});

	it("retires trusted stage reports only after saving their merged checklist", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({
			data: [
				comment(12, `${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nOld errors`),
				comment(
					13,
					`${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nOther report`,
					"someone-else",
				),
			],
		});
		const repository = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			github.value,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "meetup-bot",
				retireCommunicationReports: true,
			},
		);
		const diagnostics = [
			{
				...errorDiagnostic,
				code: "communication.missing-mail-destination",
				field: undefined,
			},
		];

		// Act
		const result = await repository.reconcileDiagnostics(identity, diagnostics);

		// Assert
		expect(result.changed).toBe(true);
		expect(github.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining(
					"**Communication**: Add an email address",
				),
			}),
		);
		expect(github.updateComment).toHaveBeenCalledOnce();
		expect(github.updateComment).toHaveBeenCalledWith(
			expect.objectContaining({ comment_id: 12 }),
		);
		expect(github.createComment.mock.invocationCallOrder[0]).toBeLessThan(
			github.updateComment.mock.invocationCallOrder[0] ?? 0,
		);
		expect(github.minimizeComment).toHaveBeenCalledWith({
			commentId: 12,
			classifier: "OUTDATED",
		});
	});

	it("preserves stage reports when the merged checklist cannot be persisted", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({
			data: [
				comment(12, `${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nOld errors`),
			],
		});
		github.createComment.mockRejectedValue(new Error("Write failed"));
		const repository = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			github.value,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "meetup-bot",
				retireCommunicationReports: true,
			},
		);

		// Act
		const result = repository.reconcileDiagnostics(identity, [errorDiagnostic]);

		// Assert
		await expect(result).rejects.toThrow("Write failed");
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.minimizeComment).not.toHaveBeenCalled();
	});

	it("leaves separate stage reports alone during event-only reconciliation", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({
			data: [
				comment(12, `${COMMUNICATION_DIAGNOSTIC_COMMENT_MARKER}\nOld errors`),
			],
		});
		const repository = adapter(github.value, "meetup-bot");

		// Act
		await repository.reconcileDiagnostics(identity, [errorDiagnostic]);

		// Assert
		expect(github.createComment).toHaveBeenCalledOnce();
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.minimizeComment).not.toHaveBeenCalled();
	});
	it("creates one managed comment when actionable diagnostics appear", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({ data: [], headers: { link: "" } });
		github.createComment.mockResolvedValue({ data: {} });

		// Act
		const result = await adapter(github.value).reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);

		// Assert
		expect(result).toEqual({ changed: true });
		expect(github.createComment).toHaveBeenCalledOnce();
		expect(github.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: "example",
				repo: "meetups",
				issue_number: 42,
				body: expect.stringContaining(
					"**Event Date**: Enter a valid calendar date",
				),
			}),
		);
	});

	it("does nothing when no managed comment or actionable diagnostic exists", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({ data: [] });

		// Act
		const actual = await adapter(github.value).reconcileDiagnostics(
			identity,
			[],
		);

		// Assert
		expect(actual).toEqual({ changed: false });
		expect(github.createComment).not.toHaveBeenCalled();
		expect(github.updateComment).not.toHaveBeenCalled();
	});

	it("does not update a canonical comment whose content is unchanged", async () => {
		// Arrange
		const github = client();
		const body = new GithubEventCommentRepositoryComposition()
			.diagnosticCommentPresenter()
			.render([errorDiagnostic]);
		github.listComments.mockResolvedValue({ data: [comment(5, body)] });

		// Act
		const result = await adapter(github.value).reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);

		// Assert
		expect(result).toEqual({ changed: false });
		expect(github.updateComment).not.toHaveBeenCalled();
	});

	it("replaces a code-only managed comment with actionable guidance", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValueOnce({
			data: [
				comment(
					5,
					`${EVENT_DIAGNOSTIC_COMMENT_MARKER}\n\n### Meetup automation diagnostics\n\n- **error** \`event.date.invalid\``,
				),
			],
		});
		github.updateComment.mockResolvedValue({ data: {} });

		// Act
		await adapter(github.value).reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);

		// Assert
		expect(github.updateComment).toHaveBeenLastCalledWith(
			expect.objectContaining({
				comment_id: 5,
				body: expect.stringContaining(
					"**Event Date**: Enter a valid calendar date",
				),
			}),
		);
	});

	it("marks an existing managed comment resolved after diagnostics clear", async () => {
		// Arrange
		const github = client();
		github.updateComment.mockResolvedValue({ data: {} });
		github.listComments.mockResolvedValueOnce({
			data: [
				comment(
					5,
					new GithubEventCommentRepositoryComposition()
						.diagnosticCommentPresenter()
						.render([errorDiagnostic]),
				),
			],
		});

		// Act
		await adapter(github.value).reconcileDiagnostics(identity, []);

		// Assert
		expect(github.updateComment).toHaveBeenLastCalledWith(
			expect.objectContaining({
				comment_id: 5,
				body: expect.stringContaining("✅ Event details complete."),
			}),
		);
	});

	it("paginates and deterministically tombstones duplicate managed comments", async () => {
		// Arrange
		const github = client();
		const body = new GithubEventCommentRepositoryComposition()
			.diagnosticCommentPresenter()
			.render([errorDiagnostic]);
		github.listComments
			.mockResolvedValueOnce({
				data: [comment(9, body), comment(3, body)],
				headers: {
					link: '<https://api.github.test/comments?page=2>; rel="next"',
				},
			})
			.mockResolvedValueOnce({
				data: [comment(7, body), comment(4, "Unmanaged")],
				headers: { link: "" },
			});
		github.updateComment.mockResolvedValue({ data: {} });
		github.minimizeComment.mockResolvedValue({});

		// Act
		const result = await adapter(github.value).reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);
		const actual = github.updateComment.mock.calls.map(
			([input]) => input.comment_id,
		);
		const actual1 = github.updateComment.mock.calls.every(([input]) =>
			input.body.includes("Superseded duplicate"),
		);
		const actual2 = github.minimizeComment.mock.calls.map(
			([input]) => input.commentId,
		);

		// Assert
		expect(result).toEqual({ changed: true });
		expect(github.listComments).toHaveBeenCalledTimes(2);
		expect(actual).toEqual([7, 9]);
		expect(actual1).toBe(true);
		expect(actual2).toEqual([7, 9]);
	});

	it("uses the configured author to avoid taking over another user's marker", async () => {
		// Arrange
		const github = client(false);
		github.listComments.mockResolvedValue({
			data: [
				comment(
					2,
					`${EVENT_DIAGNOSTIC_COMMENT_MARKER}\nNot ours`,
					"another-user",
				),
			],
		});
		github.createComment.mockResolvedValue({ data: {} });

		// Act
		await adapter(github.value, "meetup-bot").reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);

		// Assert
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.createComment).toHaveBeenCalledOnce();
	});

	it("rejects a malformed comment list response", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({ data: "not-an-array" });

		// Act
		const operation = adapter(github.value).reconcileDiagnostics(identity, [
			errorDiagnostic,
		]);

		// Assert
		await expect(operation).rejects.toBeInstanceOf(
			GitHubEventCommentRepositoryResponseError,
		);
	});

	it("rejects comment reconciliation outside the configured repository", async () => {
		// Arrange
		const github = client();

		// Act
		const operation = adapter(github.value).reconcileDiagnostics(
			{ repository: "someone/else", issueNumber: 42 },
			[errorDiagnostic],
		);

		// Assert
		await expect(operation).rejects.toBeInstanceOf(
			GitHubEventCommentRepositoryScopeError,
		);
	});

	it("rejects an invalid repository configuration", async () => {
		// Arrange
		const github = client();

		// Act
		const construct = () =>
			new GitHubEventCommentRepository(
				{
					diagnosticCommentPresenter:
						new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
					createEventCommentMessages: (...args) =>
						new GithubEventCommentRepositoryComposition().eventCommentMessages(
							...args,
						),
				},
				github.value,
				{
					owner: "",
					repo: "x",
					authorLogin: "meetup-bot",
				},
			);

		// Assert
		expect(construct).toThrow(GitHubEventCommentRepositoryConfigurationError);
	});
});

describe("managed diagnostic ownership", () => {
	it("does not accept a user account with a matching login as a bot", async () => {
		// Arrange
		const github = client();
		github.listComments.mockResolvedValue({
			data: [
				{
					id: 2,
					body: EVENT_DIAGNOSTIC_COMMENT_MARKER,
					user: { login: "meetup-bot", type: "User" },
				},
			],
		});
		const repository = adapter(github.value);

		// Act
		await repository.reconcileDiagnostics(identity, [errorDiagnostic]);

		// Assert
		expect(github.updateComment).not.toHaveBeenCalled();
		expect(github.createComment).toHaveBeenCalledOnce();
	});
});
