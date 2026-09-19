import {
	CommunicationApproval,
	type CommunicationApprovalFacts,
} from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { GithubCommunicationApprovalRepository } from "./github-communication-approval-repository.js";
import {
	COMMUNICATION_APPROVAL_COMMENT_MARKER,
	type GithubCommunicationApprovalRepositoryClient,
} from "./github-communication-approval-repository-contracts.js";

const TRUSTED_AUTHOR = "automation-bot[bot]";

const FACTS: CommunicationApprovalFacts = {
	automationRevision: "revision-abc123",
	eventId: "issue-42",
	eventDate: "2026-10-08",
	occurrenceStatus: "scheduled",
	readiness: "ready",
	policyVersion: "1",
	mailingsRepository: "organization/mailings",
	notificationEnabled: true,
	notificationDestinationFingerprint: `sha256:${"a".repeat(64)}`,
	confirmations: { host: true, speakers: true },
	hostId: "host-0001",
	speakerIds: ["speaker-0002", "speaker-0001"],
	publicationUrls: {
		meetup: "https://meetup.example/events/42",
		community: "https://community.example/events/42",
		assets: "https://assets.example/folders/42",
	},
};

describe("GithubCommunicationApprovalRepository", () => {
	it("persists and reads one deterministic PII-free managed comment", async () => {
		// Arrange
		const memory = commentClient();
		const repository = createRepository(memory.client);
		const snapshot =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);

		// Act
		const saved = await repository.saveApproved(snapshot);
		const stored = await repository.findApproved("issue-42");

		// Assert
		expect(saved).toEqual({
			changed: true,
		});
		expect(stored).toEqual(snapshot);
		expect(memory.comments).toHaveLength(1);
		expect(
			memory.comments[0]?.body.startsWith(
				COMMUNICATION_APPROVAL_COMMENT_MARKER,
			),
		).toBe(true);
		expect(memory.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: "organization",
				repo: "meetups",
				issue_number: 42,
			}),
		);
		for (const privateField of ["email", "phone", "address", "contactName"]) {
			expect(memory.comments[0]?.body).not.toContain(privateField);
		}
	});

	it("ignores an approval marker authored by anyone except the configured bot", async () => {
		// Arrange
		const snapshot =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		const memory = commentClient([
			{
				id: 1,
				body: approvalBody(snapshot),
				user: { login: "untrusted-user" },
			},
		]);
		const repository = createRepository(memory.client);

		// Act
		const untrusted = await repository.findApproved("issue-42");
		const saved = await repository.saveApproved(snapshot);

		// Assert
		expect(untrusted).toBeUndefined();
		expect(saved).toEqual({
			changed: true,
		});
		expect(memory.comments).toHaveLength(2);
		expect(memory.createComment).toHaveBeenCalledOnce();
	});

	it("does not write an identical approval", async () => {
		// Arrange
		const memory = commentClient();
		const repository = createRepository(memory.client);
		const initial =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		await repository.saveApproved(initial);

		// Act
		const result = await repository.saveApproved(initial);

		// Assert
		expect(result).toEqual({
			changed: false,
		});
		expect(memory.updateComment).not.toHaveBeenCalled();
	});

	it("updates the stored approval when facts change", async () => {
		// Arrange
		const memory = commentClient();
		const repository = createRepository(memory.client);
		const initial =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		await repository.saveApproved(initial);
		const changed = CommunicationApproval.createCommunicationApprovalSnapshot({
			...FACTS,
			readiness: "not-ready",
			confirmations: { host: false, speakers: true },
		});

		// Act
		const result = await repository.saveApproved(changed);
		const stored = await repository.findApproved("issue-42");

		// Assert
		expect(result).toEqual({
			changed: true,
		});
		expect(memory.updateComment).toHaveBeenCalledOnce();
		expect(stored).toEqual(changed);
	});

	it("rejects duplicate trusted approval comments", async () => {
		// Arrange
		const snapshot =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		const duplicate = commentClient([
			trustedComment(1, approvalBody(snapshot)),
			trustedComment(2, approvalBody(snapshot)),
		]);

		// Act
		const operation = createRepository(duplicate.client).findApproved(
			"issue-42",
		);

		// Assert
		await expect(operation).rejects.toThrow(/Multiple trusted/);
	});

	it("rejects a corrupted trusted approval comment", async () => {
		// Arrange
		const corrupted = commentClient([
			trustedComment(
				1,
				`${COMMUNICATION_APPROVAL_COMMENT_MARKER}\n\n\`\`\`json\n{"email":"private@example.invalid"}\n\`\`\``,
			),
		]);

		// Act
		const operation = createRepository(corrupted.client).findApproved(
			"issue-42",
		);

		// Assert
		await expect(operation).rejects.toThrow(/corrupted/);
	});

	it("rejects a trusted snapshot for another event", async () => {
		// Arrange
		const body = approvalBody(
			CommunicationApproval.createCommunicationApprovalSnapshot({
				...FACTS,
				eventId: "issue-43",
			}),
		);
		const memory = commentClient([trustedComment(1, body)]);

		// Act
		const operation = createRepository(memory.client).findApproved("issue-42");

		// Assert
		await expect(operation).rejects.toThrow(/another event/);
	});

	it.each([
		["missing opening fence", '{"schemaVersion":1}\n```'],
		["missing closing fence", '```json\n{"schemaVersion":1}'],
		["unclosed whitespace block", `\`\`\`json${" ".repeat(65_536)}`],
		["empty block", "```json\n```"],
		["whitespace block", `\`\`\`json${" ".repeat(65_536)}\`\`\``],
		["invalid JSON", "```json\n{invalid}\n```"],
	])("rejects a trusted approval with a %s", async (_name, block) => {
		// Arrange
		const body = `${COMMUNICATION_APPROVAL_COMMENT_MARKER}\n\n${block}`;
		const memory = commentClient([trustedComment(1, body)]);
		const repository = createRepository(memory.client);

		// Act
		const operation = repository.findApproved("issue-42");

		// Assert
		await expect(operation).rejects.toThrow(/corrupted/);
		expect(memory.createComment).not.toHaveBeenCalled();
		expect(memory.updateComment).not.toHaveBeenCalled();
	});

	it("rejects non-canonical whitespace around a valid approval snapshot", async () => {
		// Arrange
		const snapshot =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		const body = approvalBody(snapshot).replace("```json\n", "```json \n");
		const memory = commentClient([trustedComment(1, body)]);
		const repository = createRepository(memory.client);

		// Act
		const operation = repository.findApproved("issue-42");

		// Assert
		await expect(operation).rejects.toThrow(/corrupted/);
	});

	it.each([
		{
			owner: "bad/owner",
			repo: "meetups",
			issueNumber: 42,
			trustedAuthorLogin: TRUSTED_AUTHOR,
		},
		{
			owner: "organization",
			repo: "",
			issueNumber: 42,
			trustedAuthorLogin: TRUSTED_AUTHOR,
		},
		{
			owner: "organization",
			repo: "meetups",
			issueNumber: 0,
			trustedAuthorLogin: TRUSTED_AUTHOR,
		},
		{
			owner: "organization",
			repo: "meetups",
			issueNumber: 42,
			trustedAuthorLogin: "",
		},
	])("rejects invalid repository scope %#", (options) => {
		// Arrange
		const memory = commentClient();

		// Act
		const construct = () =>
			new GithubCommunicationApprovalRepository(memory.client, options);

		// Assert
		expect(construct).toThrow();
	});
});

function createRepository(client: GithubCommunicationApprovalRepositoryClient) {
	return new GithubCommunicationApprovalRepository(client, {
		owner: "organization",
		repo: "meetups",
		issueNumber: 42,
		trustedAuthorLogin: TRUSTED_AUTHOR,
	});
}

type RawComment = {
	id: number;
	body: string;
	user: { login: string };
};

function commentClient(initial: readonly RawComment[] = []) {
	const comments = initial.map((comment) => ({
		...comment,
		user: { ...comment.user },
	}));
	let nextId = Math.max(0, ...comments.map(({ id }) => id)) + 1;
	const createComment = vi.fn(
		async (parameters: { body: string }): Promise<void> => {
			comments.push({
				id: nextId++,
				body: parameters.body,
				user: { login: TRUSTED_AUTHOR },
			});
		},
	);
	const updateComment = vi.fn(
		async (parameters: { comment_id: number; body: string }): Promise<void> => {
			const comment = comments.find(({ id }) => id === parameters.comment_id);
			if (!comment) throw new Error("missing synthetic comment");
			comment.body = parameters.body;
		},
	);
	const client = {
		rest: {
			issues: {
				listComments: vi.fn().mockImplementation(async () => ({
					data: comments.map((comment) => ({
						...comment,
						user: { ...comment.user },
					})),
					headers: {},
				})),
				createComment,
				updateComment,
			},
		},
	} satisfies GithubCommunicationApprovalRepositoryClient;
	return { client, comments, createComment, updateComment };
}

function trustedComment(id: number, body: string): RawComment {
	return { id, body, user: { login: TRUSTED_AUTHOR } };
}

function approvalBody(
	snapshot: ReturnType<
		typeof CommunicationApproval.createCommunicationApprovalSnapshot
	>,
): string {
	return `${COMMUNICATION_APPROVAL_COMMENT_MARKER}\n\nMaintainer-approved communication facts. Any fact change requires a new approval.\n\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\``;
}
