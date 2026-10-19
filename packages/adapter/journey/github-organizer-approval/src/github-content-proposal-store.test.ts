import { describe, expect, it } from "vitest";
import { contentFixture } from "../../../../application/journey/testing/promotional-content.fixtures.js";
import { contentStoreFixture } from "../testing/content-store.fixtures.js";
import { GithubContentProposalStore } from "./github-content-proposal-store.js";

describe("trusted proposal storage", () => {
	it("persists immutable proposal identity and a separate generation reservation", async () => {
		// Arrange
		const f = contentStoreFixture();
		const proposal = contentFixture().proposal;
		const empty = await f.store.load();
		// Act
		const created = await f.store.save(empty, [proposal]);
		const reserved = await f.store.save(created, [
			{ ...proposal, attempts: [{ id: "request-one", phase: "reserved" }] },
		]);
		// Assert
		expect(f.store).toBeInstanceOf(GithubContentProposalStore);
		expect(f.create).toHaveBeenCalledTimes(1);
		expect(reserved.proposals[0].attempts[0].id).toBe("request-one");
	});
	it("refuses to overwrite a concurrently changed proposal set", async () => {
		// Arrange
		const f = contentStoreFixture();
		const proposal = contentFixture().proposal;
		const empty = await f.store.load();
		await f.store.save(empty, [proposal]);
		// Act
		const save = f.store.save(empty, [proposal]);
		// Assert
		await expect(save).rejects.toThrow("changed before persistence");
	});
	it("does not let an organizer edit erase a bot-owned proposal marker", async () => {
		// Arrange
		const f = contentStoreFixture();
		const proposal = contentFixture().proposal;
		await f.store.save(await f.store.load(), [proposal]);
		const comment = f.comments[0];
		const id = comment.node_id as string;
		f.comments[0] = { ...comment, body: "Removed marker" };
		f.edits.set(id, {
			id,
			body: "Removed marker",
			editor: { login: "organizer", __typename: "User" },
			lastEditedAt: "2026-10-01T10:00:00Z",
		});
		// Act
		const load = f.store.load();
		// Assert
		await expect(load).rejects.toThrow("edited outside automation");
	});
	it("preserves earlier decisions when a later proposal is stored", async () => {
		// Arrange
		const f = contentStoreFixture();
		const proposal = contentFixture().proposal;
		const previous = await f.store.save(await f.store.load(), [proposal]);
		// Act
		const remove = f.store.save(previous, []);
		// Assert
		await expect(remove).rejects.toThrow("history cannot be removed");
	});
});
