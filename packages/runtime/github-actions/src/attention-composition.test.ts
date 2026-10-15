import { getOctokit } from "@actions/github";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { ManageMeetupAttention } from "@meetup-automation/journey";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture } from "../../../adapter/github-organizer-attention/testing/attention.fixtures.js";
import { createTestEvent } from "../../../domain/event/testing/event.fixtures.js";
import { AttentionComposition } from "./attention-composition.js";
import { SERVICES } from "./composition.js";
import type { AttentionStage } from "@meetup-automation/communication";

describe("attention runtime composition", () => {
	afterEach(() => vi.unstubAllGlobals());
	it("persists accepted state across invocations and edits on locale changes without reposting", async () => {
		// Arrange
		const f = fixture();
		const client = getOctokit("synthetic-token");
		client.rest.issues.listComments =
			f.list as unknown as typeof client.rest.issues.listComments;
		client.rest.issues.createComment =
			f.create as unknown as typeof client.rest.issues.createComment;
		client.rest.issues.updateComment =
			f.update as unknown as typeof client.rest.issues.updateComment;
		client.graphql = f.graphql as unknown as typeof client.graphql;
		const fetcher = vi.fn<typeof fetch>(
			async () =>
				new Response(
					JSON.stringify({ ok: true, channel: "C123", ts: "123.456" }),
				),
		);
		vi.stubGlobal("fetch", fetcher);
		const event = createTestEvent({
			date: "2099-06-08",
			confirmations: { host: false, speakers: false },
		});
		const document = {
			identity: event.identity,
			issueState: "open" as const,
			issueTitle: "Meetup",
			labels: ["meetup"],
			body: "",
		};
		const stages: readonly AttentionStage[] = [
			"event",
			"assets",
			"feedback",
			"communications",
		].map((owner) => ({
			owner: owner as AttentionStage["owner"],
			outcome: "success",
			blocked: false,
		}));
		const runs = (["en", "fr"] as const).map((locale) => {
			const container = AttentionComposition.create({
				client,
				owner: "example",
				repo: "meetups",
				issueNumber: 42,
				commentAuthorLogin: "automation[bot]",
				slackToken: "private-token",
				slackOrganizerChannelId: "C123",
				locale,
			});
			container
				.rebind<EventRepository>(SERVICES.eventRepository)
				.toConstantValue({
					find: vi.fn().mockResolvedValue(document),
					listPage: vi.fn(),
					applyPatch: vi.fn(),
				});
			container
				.rebind<EventDocumentCodec>(SERVICES.eventDocumentCodec)
				.toConstantValue({
					decode: () => ({ event, diagnostics: [] }),
					createPatch: vi.fn(),
				});
			container
				.rebind(SystemCommunicationClock)
				.toConstantValue(
					new SystemCommunicationClock(() => new Date("2099-06-01T10:00:00Z")),
				);
			return container.get(ManageMeetupAttention);
		});
		// Act
		const first = await runs[0].execute(event.identity, stages, "123");
		const second = await runs[1].execute(event.identity, stages, "124");
		const urls = fetcher.mock.calls.map((call) => call[0]);
		// Assert
		expect(first.posted).toBe(true);
		expect(first.notificationFailed).toBe(false);
		expect(second.posted).toBe(false);
		expect(second.notificationFailed).toBe(false);
		expect(urls).toEqual([
			"https://slack.com/api/chat.postMessage",
			"https://slack.com/api/chat.update",
		]);
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain('"status":"accepted"');
		expect(f.comments[0]?.body).toContain("organisateurs");
		expect(f.comments[0]?.body).not.toContain("private-token");
	});
});
