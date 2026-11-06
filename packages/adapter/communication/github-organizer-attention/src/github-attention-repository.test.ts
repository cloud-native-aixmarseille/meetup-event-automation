import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { episode, fixture, state } from "../testing/attention.fixtures.js";
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
			f.visibility,
		);

		// Act
		const load = repository.load();

		// Assert
		await expect(load).rejects.toThrow("Multiple attention records");
	});
});

describe("attention comment resolution", () => {
	it("retries retiring a transferred checklist after visibility fails", async () => {
		// Arrange
		const f = fixture();
		const body =
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Agenda**: Add a speaker.";
		await f.client.create(body);
		await f.repository.load();
		f.visibility.synchronize.mockRejectedValueOnce(new Error("Unavailable"));

		// Act
		const first = await f.repository
			.retire(200)
			.catch((error: Error) => error.message);
		await f.repository.retire(200);

		// Assert
		expect(first).toBe("Unavailable");
		expect(f.comments[0].body).toContain("Add a speaker.");
		expect(f.comments[0].body).toContain("#issuecomment-200");
		expect(f.visibility.synchronize).toHaveBeenCalledTimes(2);
		expect(f.visibility.synchronize).toHaveBeenLastCalledWith(
			100,
			f.comments[0].body,
			true,
		);
	});
	it("hides completed status and restores the same comment for new work", async () => {
		// Arrange
		const f = fixture();
		const value = { ...state(), post: undefined };
		await f.repository.load();

		// Act
		await f.repository.save(value);
		await f.repository.save({ ...value, episodes: [episode()] });

		// Assert
		expect(
			f.visibility.synchronize.mock.calls.map(([id, , resolved]) => [
				id,
				resolved,
			]),
		).toEqual([
			[100, true],
			[100, false],
		]);
		expect(f.create).toHaveBeenCalledTimes(1);
		expect(f.comments[0].body).toContain("meetup-organizer-attention:v1");
	});
	it("retries visibility after persistence already succeeded", async () => {
		// Arrange
		const f = fixture();
		const value = { ...state(), post: undefined };
		await f.repository.load();
		f.visibility.synchronize.mockRejectedValueOnce(new Error("Unavailable"));

		// Act
		const first = await f.repository
			.save(value)
			.catch((error: Error) => error.message);
		await f.repository.save(value);

		// Assert
		expect(first).toBe("Unavailable");
		expect(f.visibility.synchronize).toHaveBeenCalledTimes(2);
		expect(f.create).toHaveBeenCalledTimes(1);
		expect(f.update).not.toHaveBeenCalled();
	});
	it("keeps unresolved diagnostic tasks visible even with no active episodes", async () => {
		// Arrange
		const f = fixture();
		f.checklist.set(
			100,
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Agenda**: Add a speaker.",
		);
		await f.repository.load();

		// Act
		await f.repository.save({ ...state(), post: undefined });

		// Assert
		expect(f.visibility.synchronize).toHaveBeenLastCalledWith(
			100,
			expect.any(String),
			false,
		);
	});
});
