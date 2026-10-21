import { describe, expect, it, vi } from "vitest";
import {
	GitHubEventCommentRepository,
	GithubEventCommentRepositoryComposition,
} from "../packages/adapter/github-event-comment-repository/src/index.js";
import {
	AttentionCommentRetention,
	GithubAttentionRepository,
	GithubOrganizerAttentionComposition,
} from "../packages/adapter/github-organizer-attention/src/index.js";
import {
	fixture,
	state,
} from "../packages/adapter/github-organizer-attention/testing/attention.fixtures.js";
import { JourneyComposition } from "../packages/application/journey/src/index.js";
import { CommunicationDomainComposition } from "../packages/domain/communication/src/index.js";
import type { EventDiagnostic } from "../packages/domain/event/src/index.js";
import { GithubActionsComposition } from "../packages/runtime/github-actions/src/index.js";

import { OrganizerFeedback } from "../packages/runtime/github-actions/src/organizer-feedback.js";

const identity = { repository: "example/meetups", issueNumber: 42 };
const diagnostic: EventDiagnostic = {
	code: "event.title.missing",
	severity: "warning",
	category: "incomplete",
	message: "Missing title",
};

describe("single organizer checklist across event and attention runs", () => {
	it("updates the original checklist without losing a reserved Slack delivery", async () => {
		// Arrange
		const f = fixture();
		const comments = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			f.api,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "automation[bot]",
				locale: "fr",
				retainedContent: new AttentionCommentRetention(
					{
						attentionRecord:
							new GithubOrganizerAttentionComposition().attentionRecord(),
						createGithubAttentionClient: (...args) =>
							new GithubOrganizerAttentionComposition().githubAttentionClient(
								...args,
							),
						createTrustedAttentionState: (...args) =>
							new GithubOrganizerAttentionComposition().trustedAttentionState(
								...args,
							),
					},
					f.api,
					"example",
					"meetups",
					"automation[bot]",
				),
			},
		);
		const attention = state();

		// Act
		await comments.reconcileDiagnostics(identity, [diagnostic]);
		await f.repository.load();
		await f.repository.save(attention);
		await new OrganizerFeedback(
			{
				attentionStageInput:
					new GithubActionsComposition().attentionStageInput(),
				createReconcileOrganizerFeedback: (...args) =>
					new JourneyComposition().reconcileOrganizerFeedback(...args),
			},
			{
				find: vi.fn().mockResolvedValue({ identity, labels: ["meetup"] }),
				applyPatch: vi.fn(),
				listPage: vi.fn(),
			},
			comments,
			"meetup",
		).execute(
			identity,
			JSON.stringify({
				assets: { outcome: "success", diagnostics: [] },
				feedback: { outcome: "success", diagnostics: [] },
				event: {
					outcome: "success",
					diagnostics: [
						{
							code: "event.proposals.not-found",
							severity: "error",
							message: "Private source detail",
						},
					],
				},
				communications: {
					outcome: "success",
					diagnostics: [
						{
							code: "communication.event-references-unresolved",
							severity: "error",
						},
					],
				},
			}),
		);
		const loaded = await f.repository.load();
		if (!loaded) throw new Error("Missing attention state");
		await f.repository.save(loaded);
		const retainedAttention = new GithubOrganizerAttentionComposition()
			.attentionRecord()
			.read(f.comments[0].body ?? "");

		// Assert
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0].id).toBe(100);
		expect(f.comments[0].body).toContain(
			"Numéro de proposition introuvable dans ce CFP.",
		);
		expect(f.comments[0].body).not.toContain("Ajoutez un titre");
		expect(f.comments[0].body).not.toContain("Private source detail");
		expect(f.comments[0].body).not.toContain("**Communication**");
		expect(loaded?.post).toEqual(attention.post);
		expect(retainedAttention.post?.status).toBe("pending");
	});
	it("recovers consolidation after removal fails without losing notification authority", async () => {
		// Arrange
		const f = fixture();
		const comments = new GitHubEventCommentRepository(
			{
				diagnosticCommentPresenter:
					new GithubEventCommentRepositoryComposition().diagnosticCommentPresenter(),
				createEventCommentMessages: (...args) =>
					new GithubEventCommentRepositoryComposition().eventCommentMessages(
						...args,
					),
			},
			f.api,
			{
				owner: "example",
				repo: "meetups",
				authorLogin: "automation[bot]",
			},
		);
		await comments.reconcileDiagnostics(identity, [diagnostic]);
		await f.client.create(
			f.presenter.issue(
				state(),
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(state()),
			),
		);
		await f.repository.load();
		f.api.rest.issues.deleteComment.mockRejectedValueOnce(
			new Error("Unavailable"),
		);

		// Act
		const failure = await f.repository.save(state()).then(
			() => undefined,
			(error: Error) => error.message,
		);
		const retry = new GithubAttentionRepository(
			{
				attentionRecord:
					new GithubOrganizerAttentionComposition().attentionRecord(),
				attentionStateEquality:
					new CommunicationDomainComposition().attentionStateEquality(),
				createTrustedAttentionState: (...args) =>
					new GithubOrganizerAttentionComposition().trustedAttentionState(
						...args,
					),
			},
			f.client,
			"automation[bot]",
			f.presenter,
			f.checklist,
		);
		const loaded = await retry.load();
		if (!loaded) throw new Error("Missing attention state");
		await retry.save(loaded);

		// Assert
		expect(failure).toBe("Unavailable");
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0].id).toBe(100);
		expect(f.comments[0].body).toContain("**Event Title**");
		expect(loaded?.post).toEqual(state().post);
		expect(f.create).toHaveBeenCalledTimes(2);
	});
});
