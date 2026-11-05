import { describe, expect, it } from "vitest";
import { automationStateFixture } from "../testing/state.fixtures.js";
import { AUTOMATION_STATE_MARKER } from "./automation-state-codec.js";
import { GithubAutomationState } from "./github-automation-state.js";

const proposal = '<!-- meetup-content-proposal:v1 {"id":"proposal"} -->';
const delivery =
	'<!-- meetup-social-delivery:v1 {"intentId":"delivery","attempts":[]} -->';
const publication = '<!-- meetup-publication:v1\n{"state":"pending"}\n-->';
const community =
	'<!-- community-publication:v1\n{"state":"pending","target":"community"}\n-->';

describe("consolidated automation state", () => {
	it("keeps all record scopes in one collapsed comment across writes and reruns", async () => {
		// Arrange
		const f = automationStateFixture();
		// Act
		await f.state.write("content", [], [proposal]);
		await f.state.write("social", [], [delivery]);
		await f.state.write("meetup", [], [publication]);
		await f.state.write("community", [], [community]);
		await f.state.reconcile();
		const saved = f.codec.read(f.comments[0].body ?? "");
		// Assert
		expect(f.state).toBeInstanceOf(GithubAutomationState);
		expect(f.client.create).toHaveBeenCalledTimes(1);
		expect(f.comments).toHaveLength(1);
		expect(f.minimized.has(f.comments[0].id)).toBe(true);
		expect(saved.records).toEqual({
			content: [proposal],
			social: [delivery],
			meetup: [publication],
			community: [community],
		});
	});
	it("reuses an existing record comment and archives source comments after verified consolidation", async () => {
		// Arrange
		const bodies = [proposal, delivery, publication, community];
		const f = automationStateFixture(
			bodies.map((body, index) => ({
				id: index + 10,
				body,
				user: { login: "automation[bot]" },
			})),
		);
		// Act
		await f.state.reconcile();
		const saved = await f.state.read("social");
		await f.state.reconcile();
		// Assert
		expect(f.client.create).not.toHaveBeenCalled();
		expect(
			f.comments.filter((comment) =>
				comment.body?.startsWith(AUTOMATION_STATE_MARKER),
			),
		).toHaveLength(1);
		expect(f.comments[0].id).toBe(10);
		expect(f.comments.slice(1).map((comment) => comment.body)).toEqual(
			bodies.slice(1),
		);
		expect(saved).toEqual([delivery]);
		expect([...f.minimized]).toEqual([10, 11, 12, 13]);
		expect(f.histories.get(10)?.at(-1)?.diff).toBe(proposal);
	});
	it("collapses state again when a comment has been manually expanded without changing its contents", async () => {
		// Arrange
		const f = automationStateFixture();
		await f.state.write("content", [], [proposal]);
		f.minimized.clear();
		const original = f.comments[0].body;
		// Act
		await f.state.reconcile();
		// Assert
		expect(f.comments[0].body).toBe(original);
		expect(f.minimized.has(f.comments[0].id)).toBe(true);
		expect(f.client.create).toHaveBeenCalledOnce();
	});
	it("rejects stale writes without losing independently updated scopes", async () => {
		// Arrange
		const f = automationStateFixture();
		await f.state.write("content", [], [proposal]);
		await f.state.write("social", [], [delivery]);
		// Act
		const stale = f.state.write("content", [], []);
		// Assert
		await expect(stale).rejects.toThrow("changed before persistence");
		expect(await f.state.read("content")).toEqual([proposal]);
		expect(await f.state.read("social")).toEqual([delivery]);
	});
	it("leaves source records untouched when consolidation cannot be persisted", async () => {
		// Arrange
		const f = automationStateFixture([
			{ id: 1, body: proposal, user: { login: "automation[bot]" } },
		]);
		f.client.replace.mockRejectedValue(new Error("Persistence failed"));
		// Act
		const reconcile = f.state.reconcile();
		// Assert
		await expect(reconcile).rejects.toThrow("Persistence failed");
		expect(f.comments[0].body).toBe(proposal);
		expect(f.visibility.synchronize).not.toHaveBeenCalled();
	});
	it("fails before archiving sources when persistence readback is uncertain", async () => {
		// Arrange
		const f = automationStateFixture([
			{ id: 1, body: proposal, user: { login: "automation[bot]" } },
		]);
		f.client.replace.mockResolvedValue(undefined);
		// Act
		const reconcile = f.state.reconcile();
		// Assert
		await expect(reconcile).rejects.toThrow("readback is uncertain");
		expect(f.visibility.synchronize).not.toHaveBeenCalled();
	});
	it("retries a failed visibility update without creating another state comment", async () => {
		// Arrange
		const f = automationStateFixture();
		f.visibility.synchronize.mockRejectedValueOnce(
			new Error("Visibility unavailable"),
		);
		// Act
		const first = f.state.write("content", [], [proposal]);
		const failure = await first.catch((error: Error) => error.message);
		await f.state.reconcile();
		// Assert
		expect(failure).toBe("Visibility unavailable");
		expect(f.comments).toHaveLength(1);
		expect(await f.state.read("content")).toEqual([proposal]);
		expect(f.minimized.has(f.comments[0].id)).toBe(true);
	});
	it("rejects duplicate consolidated comments", async () => {
		// Arrange
		const f = automationStateFixture();
		await f.state.write("content", [], [proposal]);
		await f.client.create(f.comments[0].body ?? "");
		// Act
		const read = f.state.read("content");
		// Assert
		await expect(read).rejects.toThrow("Duplicate automation state");
	});
	it("does not reimport an archived record changed by another automation revision", async () => {
		// Arrange
		const f = automationStateFixture(
			[proposal, delivery].map((body, id) => ({
				id: id + 1,
				body,
				user: { login: "automation[bot]" },
			})),
		);
		await f.state.reconcile();
		await f.client.replace(
			2,
			delivery,
			delivery.replace('"delivery"', '"replacement"'),
		);
		// Act
		const read = f.state.read("social");
		// Assert
		await expect(read).rejects.toThrow("outside the consolidated comment");
	});
	it("refuses oversized state without splitting or overwriting the current comment", async () => {
		// Arrange
		const f = automationStateFixture();
		await f.state.write("content", [], [proposal]);
		const body = f.comments[0].body;
		const oversized = proposal.replace('"proposal"', `"${"x".repeat(60000)}"`);
		// Act
		const write = f.state.write("content", [proposal], [oversized]);
		// Assert
		await expect(write).rejects.toThrow("size limit");
		expect(f.comments[0].body).toBe(body);
		expect(f.client.create).toHaveBeenCalledOnce();
	});
	it("does not create state for an issue without internal records", async () => {
		// Arrange
		const f = automationStateFixture([
			{ id: 1, body: "Organizer discussion", user: { login: "organizer" } },
		]);
		// Act
		await f.state.reconcile();
		// Assert
		expect(f.client.create).not.toHaveBeenCalled();
		expect(f.client.replace).not.toHaveBeenCalled();
		expect(f.visibility.synchronize).not.toHaveBeenCalled();
	});
});
