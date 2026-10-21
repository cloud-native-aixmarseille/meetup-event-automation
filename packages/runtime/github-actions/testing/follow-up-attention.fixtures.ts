import { getOctokit } from "@actions/github";
import type { AttentionStage } from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { ManageMeetupAttention } from "@meetup-automation/journey";
import { SystemCommunicationClock } from "@meetup-automation/system-clock";
import { vi } from "vitest";
import { fixture } from "../../../adapter/github-organizer-approval/testing/approval.fixtures.js";
import { createTestEvent } from "../../../domain/event/testing/event.fixtures.js";
import { AttentionComposition } from "../src/attention-composition.js";
import { SERVICES } from "../src/composition.js";
export function followUpFixture() {
	const f = fixture();
	const client = getOctokit("synthetic-token");
	client.rest.issues.listComments =
		f.list as unknown as typeof client.rest.issues.listComments;
	client.rest.issues.createComment =
		f.create as unknown as typeof client.rest.issues.createComment;
	client.rest.issues.updateComment =
		f.update as unknown as typeof client.rest.issues.updateComment;
	client.rest.repos.getCollaboratorPermissionLevel =
		f.permission as unknown as typeof client.rest.repos.getCollaboratorPermissionLevel;
	client.graphql = f.graphql as unknown as typeof client.graphql;
	const fetcher = vi.fn<typeof fetch>(
		async () =>
			new Response(
				JSON.stringify({ ok: true, channel: "C123", ts: "123.456" }),
			),
	);
	vi.stubGlobal("fetch", fetcher);
	const current = {
		event: createTestEvent({ date: "2099-06-08" }),
		now: new Date("2099-06-09T10:00:00Z"),
	};
	const stages = ["event", "assets", "feedback", "communications"].map(
		(owner) => ({
			owner: owner as "event" | "assets" | "feedback" | "communications",
			outcome: "success" as const,
			blocked: false,
		}),
	);
	async function run(
		locale: "en" | "fr" = "en",
		stageResults: readonly AttentionStage[] = stages,
	) {
		const container = AttentionComposition.create({
			client,
			owner: "example",
			repo: "meetups",
			issueNumber: 42,
			commentAuthorLogin: "automation[bot]",
			slackToken: "synthetic-token",
			slackOrganizerChannelId: "C123",
			locale,
		});
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue({
				find: vi.fn().mockResolvedValue({
					identity: current.event.identity,
					issueState: current.event.issueState,
					issueTitle: "Meetup",
					labels: ["meetup"],
					body: "",
				}),
				listPage: vi.fn(),
				applyPatch: vi.fn(),
			});
		container
			.rebind<EventDocumentCodec>(SERVICES.eventDocumentCodec)
			.toConstantValue({
				decode: () => ({ event: current.event, diagnostics: [] }),
				createPatch: vi.fn(),
			});
		container
			.rebind(SystemCommunicationClock)
			.toConstantValue(new SystemCommunicationClock(() => current.now));
		return container
			.get(ManageMeetupAttention)
			.execute(current.event.identity, stageResults, "123");
	}
	return { ...f, current, fetcher, run };
}
