import { getOctokit } from "@actions/github";
import type { AttentionStage } from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	GithubOrganizerApproval,
	GithubOrganizerApprovalComposition,
	GithubOrganizerFollowUp,
} from "@meetup-automation/github-organizer-approval";
import { GithubOrganizerAttentionComposition } from "@meetup-automation/github-organizer-attention";
import {
	FollowUpApprovalPolicy,
	JourneyPolicyComposition,
	ManageMeetupAttention,
} from "@meetup-automation/journey";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	decision,
	request,
} from "../../../adapter/github-organizer-approval/testing/approval.fixtures.js";
import { fixture } from "../../../adapter/github-organizer-attention/testing/attention.fixtures.js";
import { createTestEvent } from "../../../domain/event/testing/event.fixtures.js";
import { followUpFixture } from "../testing/follow-up-attention.fixtures.js";
import {
	publicationLinks,
	publicationUrls,
} from "../testing/publication-urls.fixtures.js";
import { AttentionComposition } from "./attention-composition.js";
import { SERVICES } from "./composition.js";

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
			publicationLinks,
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
				publicationUrls,
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
		expect(f.comments[0]?.body).toContain("- [ ] Confirmez l'hôte");
		expect(f.comments[0]?.body).not.toContain("private-token");
	});
});

describe("post-event attention composition", () => {
	afterEach(() => vi.unstubAllGlobals());
	it("keeps blocked preparation and recovery guidance visible alongside task progress", async () => {
		// Arrange
		const f = followUpFixture();

		// Act
		const result = await f.run("en", [
			{ owner: "communications", outcome: "failure", blocked: true },
		]);
		const body = f.comments[0]?.body ?? "";

		// Assert
		expect(result.posted).toBe(true);
		expect(f.comments).toHaveLength(1);
		expect(body).toContain("Thank-you emails are not ready for approval.");
		expect(body).toContain("Email preparation or delivery failed.");
		expect(body).toContain("/actions/runs/123");
		expect(body).not.toContain("- [ ] Approve");
	});

	it("uses one approval and task comment, with one notification for all follow-up tasks", async () => {
		// Arrange
		const f = followUpFixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const followUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);

		// Act
		const first = await f.run();
		await approvals.request({ ...request, kind: "email-thanks" });
		const second = await f.run();
		const body = f.comments[0]?.body ?? "";
		const shared = await followUp.followUpAttention();
		const state = new GithubOrganizerAttentionComposition()
			.attentionRecord()
			.read(shared?.body ?? "");

		// Assert
		expect(first.posted).toBe(true);
		expect(second.posted).toBe(false);
		expect(second.notificationFailed).toBe(false);
		expect(f.comments).toHaveLength(1);
		expect(body).toContain("- [ ] Approve sending this batch");
		expect(
			state.episodes.filter(
				(episode) => episode.condition.code === "follow-up",
			),
		).toHaveLength(5);
		expect(state.commentId).toBe(100);
		expect(f.dispatch).not.toHaveBeenCalled();
		expect(
			f.fetcher.mock.calls.filter(([url]) =>
				String(url).endsWith("chat.postMessage"),
			),
		).toHaveLength(1);
		expect(String(f.fetcher.mock.calls[0]?.[1]?.body)).toContain(
			"#issuecomment-100",
		);
	});
	it("preserves approval while task progress and locale change without another post", async () => {
		// Arrange
		const f = followUpFixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		await f.run();
		await approvals.request({ ...request, kind: "email-thanks" });
		decision(f);
		f.current.event = {
			...f.current.event,
			operationalChecklists: {
				...f.current.event.operationalChecklists,
				postEvent: [
					{ name: "Mail thanks hoster", completed: true },
					{ name: "Mail thanks speakers", completed: true },
					{ name: "Share slides to meetup", completed: true },
					{ name: "Sync attendees from tally sheet to CNCF", completed: true },
					{ name: "Social networks", completed: true },
				],
			},
		};

		// Act
		const result = await f.run("fr");
		const approved = await approvals.request({
			...request,
			kind: "email-thanks",
		});

		// Assert
		expect(result.active).toBe(0);
		expect(result.notificationFailed).toBe(false);
		expect(approved.status).toBe("approved");
		expect(f.comments).toHaveLength(1);
		expect(
			f.fetcher.mock.calls.filter(([url]) =>
				String(url).endsWith("chat.postMessage"),
			),
		).toHaveLength(1);
		expect(
			f.fetcher.mock.calls.some(([url]) => String(url).endsWith("chat.update")),
		).toBe(true);
	});
	it("moves an uncertain existing notification reservation before retiring the previous overview", async () => {
		// Arrange
		const f = followUpFixture();
		const followUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		f.current.now = new Date("2099-06-01T10:00:00Z");
		f.fetcher.mockRejectedValueOnce(new Error("lost acknowledgement"));
		await f.run();
		f.current.now = new Date("2099-06-09T10:00:00Z");

		// Act
		const migrated = await f.run();
		const retry = await f.run();
		const shared = await followUp.followUpAttention();
		const state = new GithubOrganizerAttentionComposition()
			.attentionRecord()
			.read(shared?.body ?? "");

		// Assert
		expect(migrated.notificationFailed).toBe(true);
		expect(retry.notificationFailed).toBe(true);
		expect(state.post?.status).toBe("pending");
		expect(f.fetcher).toHaveBeenCalledTimes(1);
		expect(f.comments).toHaveLength(2);
		expect(f.comments[0]?.body).toContain("Post-event tasks and approvals");
		expect(f.comments[0]?.body).not.toContain("meetup-organizer-attention:v1");
	});
});
