import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GithubOrganizerApproval } from "@meetup-automation/github-organizer-approval";
import { OpenFeedbackTalkResultsGateway } from "@meetup-automation/openfeedback-event-gateway";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunicationRuntime } from "./communication.js";

const { getOctokitMock } = vi.hoisted(() => ({ getOctokitMock: vi.fn() }));
vi.mock("@actions/github", () => ({ getOctokit: getOctokitMock }));

import {
	approveBatch,
	cleanupCommunicationFixtures,
	createWorkspace,
	eventBody,
	githubClients,
	githubIssueResponse,
	runtimeInput,
} from "../testing/communication.fixtures.js";

afterEach(async () => {
	vi.restoreAllMocks();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	getOctokitMock.mockReset();
	await cleanupCommunicationFixtures();
});

async function setup(options: Parameters<typeof githubClients>[0] = {}) {
	vi.spyOn(
		OpenFeedbackTalkResultsGateway.prototype,
		"resolve",
	).mockResolvedValue([
		{
			title: "A public talk",
			url: "https://openfeedback.io/event-1/0/talk-1?displayVotes=true",
			speakerIds: ["speaker-0001"],
		},
	]);
	const workspaceRoot = await createWorkspace();
	const clients = githubClients(options);
	getOctokitMock.mockImplementation((token: string) =>
		token === "github-token" ? clients.github : clients.mailings,
	);
	return { ...clients, workspaceRoot, input: runtimeInput(workspaceRoot) };
}

describe("automatic communication completion after approval", () => {
	beforeEach(() => {
		vi.spyOn(GithubOrganizerApproval.prototype, "request").mockResolvedValue({
			status: "approved",
			notificationFailed: false,
		});
	});
	it.each(["scheduled", "held"])(
		"dispatches %s emails with the presentation file URL",
		async (status) => {
			// Arrange
			const f = await setup({
				labels: [
					"meetup",
					"hoster:confirmed",
					"speakers:confirmed",
					`event:${status}`,
				],
			});
			const originalBody = f.issue.body;

			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile(
				f.input,
			);
			const placeholders = f.createDispatchEvent.mock.calls.map(
				([request]) => request.client_payload.placeholders,
			);

			// Assert
			expect(result.counts.accepted).toBe(2);
			expect(placeholders).toHaveLength(2);
			for (const values of placeholders) {
				expect(values.eventSlidesUrl).toBe(f.input.slidesUrl);
				expect(values.eventSlidesUrl).not.toContain("/folders/");
			}
			expect(originalBody).toContain(
				"https://drive.google.com/drive/folders/public-event-assets",
			);
			expect(f.issue.body).toContain(
				"https://drive.google.com/drive/folders/public-event-assets",
			);
		},
	);

	it.each([undefined, "https://drive.google.com/drive/folders/event-assets"])(
		"holds due mail without requesting approval when the presentation is unavailable: %s",
		async (slidesUrl) => {
			// Arrange
			const f = await setup();

			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile({
				...f.input,
				slidesUrl,
			});

			// Assert
			expect(result.runtimeDiagnostics).toContainEqual({
				code: "communication.slides-unavailable",
				severity: "error",
			});
			expect(f.createDispatchEvent).not.toHaveBeenCalled();
			expect(GithubOrganizerApproval.prototype.request).not.toHaveBeenCalled();
			expect(f.issue.body).toContain("- [ ] Mail introduction");
		},
	);

	it("does not require a presentation when no email task is pending", async () => {
		// Arrange
		const f = await setup({
			body: eventBody("2099-06-08").replace(
				"- [ ] Mail introduction",
				"- [x] Mail introduction",
			),
		});

		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile({
			...f.input,
			slidesUrl: undefined,
		});

		// Assert
		expect(result.runtimeDiagnostics).toEqual([]);
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(GithubOrganizerApproval.prototype.request).not.toHaveBeenCalled();
	});

	it("restores recorded completion without resending when the presentation changes", async () => {
		// Arrange
		const f = await setup();

		// Act
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		f.issue.body = f.issue.body.replace(
			"- [x] Mail introduction",
			"- [ ] Mail introduction",
		);
		const result = await CommunicationRuntime.runCommunicationReconcile({
			...f.input,
			slidesUrl:
				"https://docs.google.com/presentation/d/replacement-slides/edit",
		});

		// Assert
		expect(result.counts.alreadyRecorded).toBe(2);
		expect(result.counts.dispatched).toBe(0);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
		expect(f.issue.body).toContain("- [x] Mail introduction");
	});
	it.each(["example-community", "another-community"])(
		"dispatches due introductions through %s/mailings after approval",
		async (owner) => {
			// Arrange
			const f = await setup();
			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile({
				...f.input,
				owner,
			});
			// Assert
			expect(result.mode).toBe("dispatch");
			expect(result.counts.accepted).toBe(2);
			expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
			expect(f.issue.body).toContain("- [x] Mail introduction");
			expect(f.issue.body).toContain("- [ ] Cover image");
			expect(f.issue.body).toContain("- [ ] Mail thanks hoster");
			for (const [dispatch] of f.createDispatchEvent.mock.calls)
				expect(dispatch).toMatchObject({ owner, repo: "mailings" });
			expect(f.comments).toHaveLength(1);
			expect(JSON.stringify(result)).not.toContain("@example.invalid");
			expect(f.issue.body).not.toContain("Private Host Contact");
			expect(f.issue.body).not.toContain("1 Private Street");
		},
	);

	it.each(["checked", "absent"])(
		"skips an introduction task that is %s",
		async (state) => {
			// Arrange
			const body = eventBody("2099-06-08").replace(
				"- [ ] Mail introduction",
				state === "checked" ? "- [x] Mail introduction" : "",
			);
			const f = await setup({ body });
			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile(
				f.input,
			);
			// Assert
			expect(result.counts.planned).toBe(0);
			expect(f.createDispatchEvent).not.toHaveBeenCalled();
			expect(f.updateIssue).not.toHaveBeenCalled();
		},
	);

	it("sends only unchecked thank-you tasks for a held event", async () => {
		// Arrange
		const body = eventBody("2026-01-01").replace(
			"- [ ] Mail thanks hoster",
			"- [x] Mail thanks hoster",
		);
		const f = await setup({
			body,
			labels: [
				"meetup",
				"event:held",
				"hoster:confirmed",
				"speakers:confirmed",
			],
		});
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.accepted).toBe(1);
		expect(f.createDispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				client_payload: expect.objectContaining({
					"template-name": "meetup-thanks-speakers",
					placeholders: expect.objectContaining({
						speakerFeedbackTalks: [
							{
								title: "A public talk",
								url: "https://openfeedback.io/event-1/0/talk-1?displayVotes=true",
							},
						],
					}),
				}),
			}),
		);
		expect(f.issue.body).toContain("- [x] Mail thanks speakers");
		expect(f.issue.body).toContain("- [ ] Mail introduction");
	});

	it("holds thank-you emails without requesting approval when feedback lookup fails", async () => {
		// Arrange
		const f = await setup({
			labels: [
				"meetup",
				"event:held",
				"hoster:confirmed",
				"speakers:confirmed",
			],
		});
		vi.mocked(
			OpenFeedbackTalkResultsGateway.prototype.resolve,
		).mockRejectedValue(new Error("private provider response"));

		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);

		// Assert
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.feedback-unavailable",
			severity: "error",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(GithubOrganizerApproval.prototype.request).not.toHaveBeenCalled();
		expect(f.issue.body).toContain("- [ ] Mail thanks speakers");
		expect(JSON.stringify(result)).not.toContain("private provider response");
	});

	it("reads existing OpenFeedback records and dispatches the stored talk results link", async () => {
		// Arrange
		const f = await setup({
			labels: [
				"meetup",
				"event:held",
				"hoster:confirmed",
				"speakers:confirmed",
			],
		});
		vi.mocked(OpenFeedbackTalkResultsGateway.prototype.resolve).mockRestore();
		const revision = "a".repeat(64);
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					id: "event-1",
					speakers: [{ id: "imported-speaker", name: "Ada Speaker", revision }],
					nextCursor: null,
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					id: "event-1",
					talks: [
						{
							id: "imported-talk",
							title: "A public talk",
							speakers: ["imported-speaker"],
							revision,
						},
					],
					nextCursor: null,
				}),
			);
		vi.stubGlobal("fetch", fetcher);

		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		const speakerMail = f.createDispatchEvent.mock.calls.find(
			([request]) =>
				request.client_payload["template-name"] === "meetup-thanks-speakers",
		);

		// Assert
		expect(result.counts.accepted).toBe(2);
		expect(
			speakerMail?.[0].client_payload.placeholders.speakerFeedbackTalks,
		).toEqual([
			{
				title: "A public talk",
				url: "https://openfeedback.io/event-1/0/imported-talk?displayVotes=true",
			},
		]);
		expect(fetcher.mock.calls.map(([, options]) => options?.method)).toEqual([
			"GET",
			"GET",
		]);
		expect(JSON.stringify(result)).not.toContain("oforg_synthetic");
	});

	it.each([400, 429, 500])(
		"leaves a shared task incomplete after a partial dispatch failure (%s)",
		async (status) => {
			// Arrange
			const f = await setup();
			f.createDispatchEvent
				.mockResolvedValueOnce({ status: 204 })
				.mockRejectedValueOnce({ status });
			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile(
				f.input,
			);
			// Assert
			expect(result.counts.accepted).toBe(1);
			expect(f.issue.body).toContain("- [ ] Mail introduction");
			expect(f.updateIssue).not.toHaveBeenCalled();
		},
	);

	it("completes a partially deferred group on retry without resending accepted mail", async () => {
		// Arrange
		const f = await setup();
		f.createDispatchEvent
			.mockResolvedValueOnce({ status: 204 })
			.mockRejectedValueOnce({ status: 429 });
		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		const third = await CommunicationRuntime.runCommunicationReconcile({
			...f.input,
			locale: "fr",
		});
		// Assert
		expect(first.counts.deferred).toBe(1);
		expect(second.counts.alreadyRecorded).toBe(1);
		expect(second.counts.accepted).toBe(1);
		expect(third.counts.dispatched).toBe(0);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(3);
		expect(f.issue.body).toContain("- [x] Mail introduction");
	});

	it("reports a checklist whose free text prevents safe completion rendering", async () => {
		// Arrange
		const f = await setup({
			body: eventBody("2099-06-08").replace(
				"- [ ] Cover image",
				"- [ ] Cover image\nOrganizer notes to preserve.",
			),
		});
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.accepted).toBe(2);
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.checklist-update-failed",
			severity: "error",
		});
		expect(f.updateIssue).not.toHaveBeenCalled();
		expect(f.issue.body).toContain("Organizer notes to preserve.");
		expect(f.issue.body).toContain("- [ ] Mail introduction");
	});

	it("recovers a failed checklist write using accepted ledger entries", async () => {
		// Arrange
		const f = await setup();
		f.updateIssue.mockRejectedValueOnce(new Error("private provider response"));
		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(first.runtimeDiagnostics).toContainEqual({
			code: "communication.checklist-update-failed",
			severity: "error",
		});
		expect(JSON.stringify(first)).not.toContain("private provider response");
		expect(second.counts.alreadyRecorded).toBe(2);
		expect(second.counts.dispatched).toBe(0);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
		expect(f.issue.body).toContain("- [x] Mail introduction");
	});

	it("does not resend accepted deliveries when a completion checkbox is unchecked", async () => {
		// Arrange
		const f = await setup();
		// Act
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		f.issue.body = f.issue.body.replace(
			"- [x] Mail introduction",
			"- [ ] Mail introduction",
		);
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.alreadyRecorded).toBe(2);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
		expect(f.issue.body).toContain("- [x] Mail introduction");
	});

	it("blocks dispatch if the event changes during preparation", async () => {
		// Arrange
		const f = await setup();
		f.getIssue
			.mockResolvedValueOnce(githubIssueResponse("2099-06-08"))
			.mockResolvedValue(githubIssueResponse("2099-06-09"));
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.mode).toBe("check");
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.event-concurrently-modified",
			severity: "error",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
	});

	it("preserves an organizer edit made during dispatch and recovers completion later", async () => {
		// Arrange
		const f = await setup();
		f.createDispatchEvent.mockImplementationOnce(async () => {
			f.issue.body = f.issue.body.replace(
				"- [ ] Cover image",
				"- [x] Cover image",
			);
			return { status: 204 };
		});
		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(first.runtimeDiagnostics).toContainEqual({
			code: "communication.checklist-update-failed",
			severity: "error",
		});
		expect(second.counts.dispatched).toBe(0);
		expect(f.issue.body).toContain("- [x] Cover image");
		expect(f.issue.body).toContain("- [x] Mail introduction");
	});

	it("leaves the speaker task incomplete until every speaker is accepted", async () => {
		// Arrange
		const f = await setup({
			body: eventBody("2099-06-08")
				.replace("- [ ] Mail introduction", "- [ ] Mail introduction speakers")
				.replace(
					"- Ada Speaker: A public talk",
					"- Ada Speaker: A public talk\n- Sam Example [speaker-0002]: Another talk",
				),
		});
		await writeFile(
			join(f.workspaceRoot, "referentials/speakers.csv"),
			"speaker_id,firstname,lastname,company,mail,phone\nspeaker-0001,Ada,Speaker,Public Company,speaker@example.invalid,\nspeaker-0002,Sam,Example,Public Company,other@example.invalid,\n",
		);
		f.createDispatchEvent
			.mockResolvedValueOnce({ status: 204 })
			.mockRejectedValueOnce({ status: 429 });
		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const incompleteBody = f.issue.body;
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(first.counts.accepted).toBe(1);
		expect(incompleteBody).toContain("- [ ] Mail introduction speakers");
		expect(second.counts.accepted).toBe(1);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(3);
		expect(f.issue.body).toContain("- [x] Mail introduction speakers");
	});

	it.each(["event:cancelled", "event:postponed"])(
		"does not dispatch for %s",
		async (status) => {
			// Arrange
			const f = await setup({
				labels: ["meetup", status, "hoster:confirmed", "speakers:confirmed"],
			});
			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile(
				f.input,
			);
			// Assert
			expect(result.counts.dispatched).toBe(0);
			expect(f.updateIssue).not.toHaveBeenCalled();
		},
	);

	it.each(["en", "fr"])(
		"leaves organizer reminders to attention reconciliation in %s",
		async (locale) => {
			// Arrange
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-09-04T10:00:00Z"));
			const f = await setup({ eventDate: "2026-09-04", labels: ["meetup"] });
			const fetcher = vi.fn();
			vi.stubGlobal("fetch", fetcher);
			// Act
			const first = await CommunicationRuntime.runCommunicationReconcile({
				...f.input,
				locale,
				slidesUrl: undefined,
			});
			const second = await CommunicationRuntime.runCommunicationReconcile({
				...f.input,
				locale: "fr",
				slidesUrl: undefined,
			});
			// Assert
			expect(first.counts.accepted).toBe(0);
			expect(second.counts.accepted).toBe(0);
			expect(fetcher).not.toHaveBeenCalled();
			expect(f.createDispatchEvent).not.toHaveBeenCalled();
			expect(f.issue.body).toContain("- [ ] Slack - Public Community");
		},
	);

	it("blocks communications for an invalid private catalog", async () => {
		// Arrange
		const f = await setup();
		await writeFile(
			join(f.workspaceRoot, "referentials/hosting.csv"),
			"invalid_header\ninvalid_value\n",
		);
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.mode).toBe("check");
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.referential-catalog-invalid",
			severity: "error",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(f.updateIssue).not.toHaveBeenCalled();
	});
});

describe("organizer approval for email batches", () => {
	it("retries a failed Slack reaction after email completion without resending emails", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ ok: false, error: "missing_scope" }),
		} as Response);
		// Act
		const sent = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const completedBody = f.issue.body;
		const callsBeforeRetry = vi.mocked(fetch).mock.calls.length;
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({ ok: false, error: "already_reacted" }),
		} as Response);
		const retried = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		// Assert
		expect(sent.counts.accepted).toBe(2);
		expect(sent.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-notification-failed",
			severity: "warning",
		});
		expect(completedBody).toContain("- [x] Mail introduction");
		expect(retried.counts.dispatched).toBe(0);
		expect(retried.runtimeDiagnostics).not.toContainEqual({
			code: "communication.approval-notification-failed",
			severity: "warning",
		});
		expect(fetch).toHaveBeenCalledTimes(callsBeforeRetry + 1);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
		expect(f.comments[0]?.body).toContain("✅ **Approved**");
	});
	it("finalizes rejection and reacts on Slack without sending email", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f, "Reject");
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		// Assert
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-rejected",
			severity: "warning",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(f.comments[0]?.body).toContain("❌ **Rejected** by @organizer");
		expect(f.comments[0]?.body).not.toContain("- [");
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch).toHaveBeenLastCalledWith(
			"https://slack.com/api/reactions.add",
			expect.objectContaining({
				body: JSON.stringify({
					channel: "C12345",
					timestamp: "100.001",
					name: "x",
				}),
			}),
		);
	});
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ ok: true, channel: "C12345", ts: "100.001" }),
			}),
		);
	});
	it("requires a new approval when the presentation file changes before dispatch", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		const originalRequest = f.comments[0]?.body;

		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile({
			...f.input,
			slidesUrl:
				"https://docs.google.com/presentation/d/replacement-slides/edit",
		});

		// Assert
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-pending",
			severity: "warning",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(f.comments[0]?.body).not.toBe(originalRequest);
		expect(f.comments[0]?.body).toContain("- [ ] Approve sending this batch");
	});
	it.each(["scheduled", "held"])(
		"shows human-readable collapsed details before approving %s emails",
		async (status) => {
			// Arrange
			const f = await setup({
				labels: [
					"meetup",
					`event:${status}`,
					"hoster:confirmed",
					"speakers:confirmed",
				],
			});

			// Act
			const result = await CommunicationRuntime.runCommunicationReconcile(
				f.input,
			);
			const body = f.comments[0]?.body ?? "";

			// Assert
			expect(result.counts.dispatched).toBe(0);
			expect(body).toContain(
				"<details>\n<summary>Review email details</summary>",
			);
			expect(body).toContain("Public Venue");
			expect(body).toContain("Ada Speaker");
			expect(body).toContain(
				status === "held"
					? "Feedback results: A public talk"
					: "Meetup presentation",
			);
			expect(body).not.toContain("Private Host Contact");
			expect(body).not.toContain("1 Private Street");
			expect(body).not.toContain("@example.invalid");
			expect(body).not.toContain("<details open");
		},
	);
	it("requires a new approval when a speaker feedback destination changes", async () => {
		// Arrange
		const f = await setup({
			labels: [
				"meetup",
				"event:held",
				"hoster:confirmed",
				"speakers:confirmed",
			],
		});
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		vi.mocked(
			OpenFeedbackTalkResultsGateway.prototype.resolve,
		).mockResolvedValue([
			{
				title: "A public talk",
				url: "https://openfeedback.io/event-1/0/replacement-talk?displayVotes=true",
				speakerIds: ["speaker-0001"],
			},
		]);

		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);

		// Assert
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-pending",
			severity: "warning",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(f.comments[0]?.body).toContain("- [ ] Approve sending this batch");
	});

	it("keeps the thank-you approval after the speaker email succeeds and the host email is deferred", async () => {
		// Arrange
		const f = await setup({
			labels: [
				"meetup",
				"event:held",
				"hoster:confirmed",
				"speakers:confirmed",
			],
		});
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		f.createDispatchEvent.mockRejectedValueOnce({ status: 429 });

		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		const third = await CommunicationRuntime.runCommunicationReconcile(f.input);

		// Assert
		expect(first.counts.accepted).toBe(1);
		expect(first.counts.deferred).toBe(1);
		expect(second.counts.accepted).toBe(1);
		expect(second.runtimeDiagnostics).not.toContainEqual(
			expect.objectContaining({ code: "communication.approval-pending" }),
		);
		expect(third.counts.dispatched).toBe(0);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(3);
		expect(f.issue.body).toContain("- [x] Mail thanks hoster");
		expect(f.issue.body).toContain("- [x] Mail thanks speakers");
	});
	it("requests approval in the issue and Slack, then sends and completes only after approval", async () => {
		// Arrange
		const f = await setup();
		// Act
		const pending = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		const pendingBody = f.issue.body;
		const callsBeforeApproval = f.createDispatchEvent.mock.calls.length;
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		const approved = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		// Assert
		expect(pending.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-pending",
			severity: "warning",
		});
		expect(callsBeforeApproval).toBe(0);
		expect(pendingBody).toContain("- [ ] Mail introduction");
		expect(approved.counts.accepted).toBe(2);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(2);
		expect(f.issue.body).toContain("- [x] Mail introduction");
		expect(fetch).toHaveBeenCalledTimes(2);
		const notification = JSON.parse(
			vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
		);
		expect(notification.channel).toBe("organizer-channel-id");
		expect(f.issue.body).toContain("- [ ] Slack - Public Community");
		expect(notification.text).toContain(
			"https://github.com/organization/meetups/issues/42#issuecomment-",
		);
		expect(f.comments[0]?.body).toContain("✅ **Approved** by @organizer");
		expect(f.comments[0]?.body).not.toContain("- [");
		expect(fetch).toHaveBeenCalledWith(
			"https://slack.com/api/reactions.add",
			expect.objectContaining({
				body: JSON.stringify({
					channel: "C12345",
					timestamp: "100.001",
					name: "white_check_mark",
				}),
			}),
		);
		expect(f.permission).toHaveBeenCalledWith({
			owner: "organization",
			repo: "meetups",
			username: "organizer",
		});
		expect(JSON.stringify(f.comments)).not.toContain("@example.invalid");
	});
	it("requires a new confirmation after a private recipient address changes", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		const before = f.comments[0]?.body;
		await writeFile(
			join(f.workspaceRoot, "referentials/speakers.csv"),
			"speaker_id,firstname,lastname,company,mail,phone\nspeaker-0001,Ada,Speaker,Public Company,changed@example.invalid,\n",
		);
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.dispatched).toBe(0);
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-pending",
			severity: "warning",
		});
		expect(f.comments[0]?.body).not.toBe(before);
		expect(JSON.stringify(f.comments)).not.toContain("changed@example.invalid");
	});
	it("retains approval across partial completion and a safe retry", async () => {
		// Arrange
		const f = await setup({
			body: eventBody("2099-06-08").replace(
				"- [ ] Mail introduction",
				"- [ ] Mail introduction hoster\n- [ ] Mail introduction speakers",
			),
		});
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		f.createDispatchEvent
			.mockResolvedValueOnce({ status: 204 })
			.mockRejectedValueOnce({ status: 429 });
		// Act
		const first = await CommunicationRuntime.runCommunicationReconcile(f.input);
		const partial = f.issue.body;
		const second = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(first.counts.deferred).toBe(1);
		expect(partial).toContain("- [x] Mail introduction hoster");
		expect(partial).toContain("- [ ] Mail introduction speakers");
		expect(second.counts.accepted).toBe(1);
		expect(f.createDispatchEvent).toHaveBeenCalledTimes(3);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(f.issue.body).toContain("- [x] Mail introduction speakers");
	});
	it("requires a separate approval for thank-you emails", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		f.issue.labels = [...f.issue.labels, "event:held"];
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.dispatched).toBe(0);
		expect(
			f.comments.some((comment) =>
				comment.body.includes("Organizer confirmation: thank-you emails"),
			),
		).toBe(true);
		expect(f.issue.body).toContain("- [ ] Mail thanks hoster");
	});
	it("reports a failed approval preflight even when the later ledger read succeeds", async () => {
		// Arrange
		const f = await setup();
		f.github.rest.issues.listComments.mockRejectedValueOnce(
			new Error("temporary ledger failure"),
		);
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.dispatched).toBe(0);
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-unavailable",
			severity: "error",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
	});

	it("fails closed when the permission check fails", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		f.permission.mockRejectedValue(new Error("private provider error"));
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.counts.dispatched).toBe(0);
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-unavailable",
			severity: "error",
		});
		expect(JSON.stringify(result)).not.toContain("private provider error");
	});
	it("holds mail when GitHub cannot identify the approval checkbox editor", async () => {
		// Arrange
		const f = await setup();
		await CommunicationRuntime.runCommunicationReconcile(f.input);
		approveBatch(f);
		f.graphql.mockRejectedValue(new Error("private GraphQL error"));
		// Act
		const result = await CommunicationRuntime.runCommunicationReconcile(
			f.input,
		);
		// Assert
		expect(result.runtimeDiagnostics).toContainEqual({
			code: "communication.approval-unavailable",
			severity: "error",
		});
		expect(f.createDispatchEvent).not.toHaveBeenCalled();
		expect(f.issue.body).toContain("- [ ] Mail introduction");
		expect(JSON.stringify(result)).not.toContain("private GraphQL error");
	});
});

describe("organizer notification routing", () => {
	it("rejects an empty organizer destination before accessing integrations", async () => {
		// Arrange
		const input = {
			...runtimeInput("/synthetic/workspace"),
			slackOrganizerChannelId: "  ",
		};
		// Act
		const result = CommunicationRuntime.runCommunicationReconcile(input);
		// Assert
		await expect(result).rejects.toThrow(
			"slackOrganizerChannelId must not be empty",
		);
		expect(getOctokitMock).not.toHaveBeenCalled();
	});
});
