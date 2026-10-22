import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { fixture, state } from "../testing/attention.fixtures.js";
import { GithubOrganizerAttentionComposition } from "./dependency-composition.js";
import { GithubAttentionRepository } from "./github-attention-repository.js";

describe("trusted durable attention repository", () => {
	it("creates one bot-owned status and skips unchanged writes", async () => {
		// Arrange
		const f = fixture();
		const value = state();

		// Act
		await f.repository.load();
		await f.repository.save(value);
		await f.repository.save(value);
		const loaded = await f.repository.load();

		// Assert
		expect(loaded?.post?.status).toBe("pending");
		expect(f.create).toHaveBeenCalledTimes(1);
		expect(f.update).not.toHaveBeenCalled();
	});
	it("ignores copied markers from a human", async () => {
		// Arrange
		const f = fixture();
		f.comments.push({
			id: 9,
			body: f.presenter.issue(
				state(),
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(state()),
			),
			user: { login: "organizer", type: "User" },
		});

		// Act
		const loaded = await f.repository.load();
		await f.repository.save(state());

		// Assert
		expect(loaded).toBeUndefined();
		expect(f.create).toHaveBeenCalledTimes(1);
	});
	it("recovers the trusted pending reservation after a human removes its metadata", async () => {
		// Arrange
		const f = fixture();
		const original = f.presenter.issue(
			state(),
			new GithubOrganizerAttentionComposition()
				.attentionRecord()
				.marker(state()),
		);
		await f.client.create(original);
		f.comments[0] = { ...f.comments[0], id: 100, body: "forged replacement" };
		f.edits.set("node-100", {
			id: "node-100",
			body: "forged replacement",
			lastEditedAt: "2099-06-02T10:00:00Z",
			editor: { login: "writer", __typename: "User" },
		});
		f.histories.set("node-100", [
			{
				diff: original,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
		]);

		// Act
		const loaded = await f.repository.load();

		// Assert
		expect(loaded?.post?.status).toBe("pending");
		expect(f.update).not.toHaveBeenCalled();
	});
	it.each(["missing", "deleted"])(
		"fails closed when trusted revision history is %s",
		async (kind) => {
			// Arrange
			const f = fixture();
			const original = f.presenter.issue(
				state(),
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(state()),
			);
			await f.client.create(original);
			f.edits.set("node-100", {
				id: "node-100",
				body: original,
				lastEditedAt: "2099-06-02T10:00:00Z",
				editor: { login: "writer", __typename: "User" },
			});
			f.histories.set(
				"node-100",
				kind === "missing"
					? []
					: [
							{
								diff: original,
								deletedAt: "2099-06-02T10:00:00Z",
								editor: { login: "automation", __typename: "Bot" },
							},
						],
			);

			// Act
			const load = f.repository.load();

			// Assert
			await expect(load).rejects.toThrow(/history/i);
			expect(f.update).not.toHaveBeenCalled();
		},
	);
	it("refuses a competing update observed before persistence", async () => {
		// Arrange
		const f = fixture();
		const value = state();
		await f.client.create(
			f.presenter.issue(
				value,
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(value),
			),
		);
		await f.repository.load();
		f.comments[0] = { ...f.comments[0], id: 100, body: "concurrent edit" };
		value.stopped = true;

		// Act
		const save = f.repository.save(value);

		// Assert
		await expect(save).rejects.toThrow("changed before persistence");
		expect(f.update).not.toHaveBeenCalled();
	});
	it("refuses duplicate trusted records", async () => {
		// Arrange
		const f = fixture();
		await f.client.create(
			f.presenter.issue(
				state(),
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(state()),
			),
		);
		await f.client.create(
			f.presenter.issue(
				state(),
				new GithubOrganizerAttentionComposition()
					.attentionRecord()
					.marker(state()),
			),
		);
		const repository = new GithubAttentionRepository(
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

		// Act
		const load = repository.load();

		// Assert
		await expect(load).rejects.toThrow("Multiple attention records");
	});
});
