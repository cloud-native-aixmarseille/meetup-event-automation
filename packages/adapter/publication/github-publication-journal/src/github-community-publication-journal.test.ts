import { automationStateFixture } from "../../../journey/github-automation-state/testing/state.fixtures.js";
import {
	CommunityEventIdentityPolicy,
	CommunityGroupUrl,
} from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { CommunityPublicationCommentCodec } from "./community-publication-comment-codec.js";
import { GithubCommunityPublicationJournal } from "./github-community-publication-journal.js";

const prefix = "https://community.example.test/cncf/group/example/event/";
const id = "10000000-0000-4000-8000-000000000001";
const identity = {
	id,
	reviewUrl: `https://community.example.test/dashboard/group/events/${id}/update`,
};
const complete = { ...identity, publicUrl: `${prefix}example` };
function fixture(
	initial: Parameters<typeof automationStateFixture>[0] = [],
	target = "target",
) {
	const group = CommunityGroupUrl.parse(prefix);
	if (!group) throw new Error("Invalid fixture");
	const codec = new CommunityPublicationCommentCodec(
		new CommunityEventIdentityPolicy(group),
		target,
	);
	const f = automationStateFixture(initial, "automation[bot]");
	const journal = new GithubCommunityPublicationJournal(codec, f.state);
	return { journal, ...f, publicationCodec: codec };
}
describe("community publication journal", () => {
	it("persists a UUID without a public slug and enriches it after verification", async () => {
		// Arrange
		const f = fixture();
		// Act
		await f.journal.reserve();
		await f.journal.record(identity);
		const savedId = await fixture(f.comments).journal.load();
		await f.journal.record(complete);
		const saved = await f.journal.load();
		// Assert
		expect(savedId).toEqual({ identity });
		expect(saved).toEqual({ identity: complete });
		expect(f.client.create).toHaveBeenCalledOnce();
		expect(f.client.replace).toHaveBeenCalledTimes(2);
	});
	it("can record an observed UUID even if no reservation was visible", async () => {
		// Arrange
		const f = fixture();
		// Act
		await f.journal.record(identity);
		const saved = await f.journal.load();
		// Assert
		expect(saved).toEqual({ identity });
		expect(f.client.create).toHaveBeenCalledOnce();
	});
	it("retains the public URL during a later partial save observation", async () => {
		// Arrange
		const f = fixture();
		await f.journal.record(complete);
		// Act
		await f.journal.record(identity);
		const saved = await f.journal.load();
		// Assert
		expect(saved).toEqual({ identity: complete });
		expect(await f.journal.load()).toEqual({ identity: complete });
	});
	it("allows a new public slug for the same immutable event identity", async () => {
		// Arrange
		const f = fixture();
		await f.journal.record(complete);
		const updated = { ...complete, publicUrl: `${prefix}new-slug` };
		// Act
		await f.journal.record(updated);
		const saved = await f.journal.load();
		// Assert
		expect(saved).toEqual({ identity: updated });
	});
	it("rejects an identity replacement", async () => {
		// Arrange
		const f = fixture();
		await f.journal.record(complete);
		// Act
		const result = f.journal.record({
			...complete,
			id: "20000000-0000-4000-8000-000000000002",
		});
		// Assert
		await expect(result).rejects.toThrow("conflict");
		expect(f.client.replace).not.toHaveBeenCalled();
	});
	it("blocks a target configuration change", async () => {
		// Arrange
		const f = fixture();
		await f.journal.record(complete);
		const changed = fixture(f.comments, "other-target");
		// Act
		const result = changed.journal.load();
		// Assert
		await expect(result).rejects.toThrow("conflict");
	});
	it("ignores other authors and the independent Meetup journal", async () => {
		// Arrange
		const f = fixture([
			{
				id: 1,
				user: { login: "someone" },
				body: "<!-- community-publication:v1\n{}\n-->",
			},
			{
				id: 2,
				user: { login: "automation[bot]" },
				body: "<!-- meetup-publication:v1\n{}\n-->",
			},
		]);
		// Act
		const saved = await f.journal.load();
		// Assert
		expect(saved).toBeUndefined();
	});
	it("rejects duplicate trusted journals", async () => {
		// Arrange
		const f = fixture();
		await f.journal.record(complete);
		const record = f.publicationCodec.encode({ identity: complete });
		await f.state.write("community", [record], [record, record]);
		// Act
		const result = f.journal.load();
		// Assert
		await expect(result).rejects.toThrow("conflict");
	});
	it("never overwrites an uncertain reservation with another reservation", async () => {
		// Arrange
		const f = fixture();
		await f.journal.reserve();
		// Act
		const result = f.journal.reserve();
		// Assert
		await expect(result).rejects.toThrow("uncertain");
		expect(f.client.create).toHaveBeenCalledOnce();
	});
});
