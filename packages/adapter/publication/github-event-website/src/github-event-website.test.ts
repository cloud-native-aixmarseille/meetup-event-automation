import { describe, expect, it, vi } from "vitest";
import {
	calendar,
	plannedRow,
	publishedRow,
	websiteEvent,
} from "../testing/website.fixtures.js";
import { GithubEventWebsiteComposition } from "./dependency-composition.js";
import { GithubEventWebsite } from "./github-event-website.js";
import type { GithubWebsiteClient } from "./github-website-client.js";
import { WebsiteCalendarCodec } from "./website-calendar-codec.js";
import { WebsiteEventRow } from "./website-event-row.js";

function setup(content = calendar) {
	const getContent = vi
		.fn<GithubWebsiteClient["rest"]["repos"]["getContent"]>()
		.mockResolvedValue(file(content, "a"));
	const write = vi
		.fn<GithubWebsiteClient["rest"]["repos"]["createOrUpdateFileContents"]>()
		.mockResolvedValue({});
	const createClient = vi.fn(() => ({
		rest: { repos: { getContent, createOrUpdateFileContents: write } },
	}));
	const messages = new GithubEventWebsiteComposition().messages("fr");
	const subject = new GithubEventWebsite(
		createClient,
		{ owner: "example", repo: ".github", path: "website/events.md" },
		new WebsiteCalendarCodec(new WebsiteEventRow(messages)),
		messages,
	);
	const beforeWrite = vi.fn<() => Promise<void>>().mockResolvedValue();
	return { subject, getContent, write, createClient, beforeWrite };
}
function file(content: string, sha: string) {
	return {
		data: {
			type: "file",
			encoding: "base64",
			content: Buffer.from(content).toString("base64"),
			sha: sha.repeat(40),
		},
	};
}
describe("GitHub website updates", () => {
	it("writes only changed public content with the current file SHA after the source guard", async () => {
		// Arrange
		const f = setup();
		// Act
		await f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		expect(f.write).toHaveBeenCalledExactlyOnceWith({
			owner: "example",
			repo: ".github",
			path: "website/events.md",
			sha: "a".repeat(40),
			message: "chore(events): actualiser le meetup publié du 2028-06-15",
			content: Buffer.from(calendar.replace(plannedRow, publishedRow)).toString(
				"base64",
			),
		});
		expect(f.beforeWrite.mock.invocationCallOrder[0]).toBeLessThan(
			f.write.mock.invocationCallOrder[0],
		);
	});
	it("does not create a commit for an already synchronized file", async () => {
		// Arrange
		const f = setup(calendar.replace(plannedRow, publishedRow));
		// Act
		await f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		expect(f.write).not.toHaveBeenCalled();
		expect(f.beforeWrite).not.toHaveBeenCalled();
	});
	it("reloads a conflicting SHA and preserves another contributor's edits", async () => {
		// Arrange
		const f = setup();
		const concurrent = calendar.replace("Previous Host", "Changed Host");
		f.getContent
			.mockResolvedValueOnce(file(calendar, "a"))
			.mockResolvedValue(file(concurrent, "b"));
		f.write.mockRejectedValueOnce({ status: 409 });
		// Act
		await f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		expect(f.write).toHaveBeenCalledTimes(2);
		expect(f.beforeWrite).toHaveBeenCalledTimes(2);
		expect(f.write.mock.calls[1][0].sha).toBe("b".repeat(40));
		expect(
			Buffer.from(f.write.mock.calls[1][0].content, "base64").toString(),
		).toBe(concurrent.replace(plannedRow, publishedRow));
	});
	it("limits conflict retries", async () => {
		// Arrange
		const f = setup();
		f.write.mockRejectedValue({ status: 409 });
		// Act
		const result = f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		await expect(result).rejects.toMatchObject({ kind: "conflict" });
		expect(f.write).toHaveBeenCalledTimes(3);
	});
	it("preserves source concurrency errors and does not commit stale content", async () => {
		// Arrange
		const f = setup();
		const changed = new Error("Source changed");
		f.beforeWrite.mockRejectedValue(changed);
		// Act
		const result = f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		await expect(result).rejects.toBe(changed);
		expect(f.write).not.toHaveBeenCalled();
	});
	it.each([401, 403, 404])(
		"reports inaccessible source %i without recreating it",
		async (status) => {
			// Arrange
			const f = setup();
			f.getContent.mockRejectedValue({ status });
			// Act
			const result = f.subject.upsert(websiteEvent, f.beforeWrite);
			// Assert
			await expect(result).rejects.toMatchObject({ kind: "access" });
			expect(f.write).not.toHaveBeenCalled();
		},
	);
	it("defers missing credentials until a website update is requested", async () => {
		// Arrange
		const f = setup();
		f.createClient.mockImplementation(() => {
			throw new Error("Private credential failure");
		});
		// Act
		const result = f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		await expect(result).rejects.toMatchObject({
			kind: "access",
			message: "Website event listing: access",
		});
		expect(f.write).not.toHaveBeenCalled();
	});
	it.each([
		{ data: [] },
		file("unrecognized calendar", "a"),
		{
			data: {
				type: "file",
				encoding: "none",
				content: "",
				sha: "a".repeat(40),
			},
		},
	])("rejects unsupported files without overwriting them", async (response) => {
		// Arrange
		const f = setup();
		f.getContent.mockResolvedValue(response);
		// Act
		const result = f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		await expect(result).rejects.toMatchObject({ kind: "format" });
		expect(f.write).not.toHaveBeenCalled();
	});
	it("recovers a lost commit response by rereading the file on the next reconciliation", async () => {
		// Arrange
		const f = setup();
		f.write.mockRejectedValue({ status: 503 });
		// Act
		const first = await f.subject
			.upsert(websiteEvent, f.beforeWrite)
			.catch((error) => error);
		f.getContent.mockResolvedValue(
			file(calendar.replace(plannedRow, publishedRow), "b"),
		);
		await f.subject.upsert(websiteEvent, f.beforeWrite);
		// Assert
		expect(first).toMatchObject({ kind: "unavailable" });
		expect(f.write).toHaveBeenCalledTimes(1);
	});
});
