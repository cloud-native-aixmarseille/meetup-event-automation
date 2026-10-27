import { describe, expect, it } from "vitest";
import { GithubIssueFormEventDocumentCodecComposition } from "../../packages/adapter/event/github-issue-form-event-document-codec/src/index.js";
import { JourneyPolicyComposition } from "../../packages/application/journey/src/index.js";
import type { EventDocument } from "../../packages/domain/event/src/index.js";
import { readYaml } from "./support.js";

async function formDocument(): Promise<EventDocument> {
	const form = await readYaml<{
		body: {
			type: string;
			id?: string;
			attributes: { label?: string; options?: { label: string }[] };
		}[];
	}>("__tests__/meetup-issue-template.yml");
	const responses: Record<string, string> = {
		event_date: "2026-11-05",
		hoster: "Example Host",
	};
	return {
		identity: { repository: "example/meetups", issueNumber: 42 },
		issueState: "open",
		issueTitle: "[Meetup]",
		labels: ["meetup"],
		body: form.body
			.filter((field) => field.type !== "markdown")
			.map((field) => {
				const response =
					field.type === "checkboxes"
						? field.attributes.options
								?.map(({ label }) => `- [ ] ${label}`)
								.join("\n")
						: (responses[field.id ?? ""] ?? "_No response_");
				return `### ${field.attributes.label}\n\n${response}`;
			})
			.join("\n\n"),
	};
}

describe("meetup issue template integration", () => {
	it("accepts an organizer-only form and adds generated details without losing preparation tasks", async () => {
		// Arrange
		const document = await formDocument();
		const codec =
			new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec();
		const publicationLinks = {
			meetup: "https://www.meetup.com/example/events/123",
			community:
				"https://community.example.test/cncf/group/example/event/meetup",
			assets: "https://drive.google.com/drive/folders/example-folder",
			feedback: "https://openfeedback.io/example-event",
		};

		// Act
		const decoded = codec.decode(document);
		const pendingPatch = codec.createPatch(document, decoded.event);
		const event = {
			...decoded.event,
			eventTitle: "Approved event title",
			issueTitle: "[Meetup] - 2026-11-05 - Approved event title",
			description: "Approved event description.",
			slidesPdfUrl: "https://drive.google.com/file/d/public-pdf/view",
			publicationLinks,
		};
		const patch = codec.createPatch(document, event);
		const populated = { ...document, ...patch };
		const reread = codec.decode(populated);
		const repeated = codec.createPatch(populated, reread.event);

		// Assert
		expect(document.body).not.toContain("### Automated");
		expect(document.body).not.toMatch(/Send (?:host|speaker).*email/);
		for (const heading of [
			"Event Title",
			"Event Description",
			"Meetup Link",
			"CNCF Link",
			"Drive Link",
			"OpenFeedback Link",
			"Slides PDF",
		]) {
			expect(document.body).not.toContain(`### ${heading}`);
			expect(pendingPatch.body ?? document.body).not.toContain(
				`### ${heading}`,
			);
			expect(
				populated.body.match(new RegExp(`^### ${heading}$`, "gm")),
			).toHaveLength(1);
		}
		expect(decoded.event.eventTitle).toBe("");
		expect(decoded.event.description).toBe("");
		expect(pendingPatch.issueTitle).toBeUndefined();
		expect(
			decoded.diagnostics.filter(({ severity }) => severity === "error"),
		).toEqual([]);
		expect(populated.issueTitle).toBe(event.issueTitle);
		expect(reread.event.eventTitle).toBe(event.eventTitle);
		expect(reread.event.description).toBe(event.description);
		expect(reread.event.slidesPdfUrl).toBe(event.slidesPdfUrl);
		expect(reread.event.publicationLinks).toEqual(publicationLinks);
		expect(reread.event.operationalChecklists).toEqual(
			decoded.event.operationalChecklists,
		);
		expect(populated.body).toContain(
			"### Event logistics\n\n- [ ] Arrange the game\n- [ ] Arrange goodies",
		);
		expect(repeated.body).toBeUndefined();
		expect(repeated.issueTitle).toBeUndefined();
	});

	it("records automated email completion while preserving organizer tasks and labels", async () => {
		// Arrange
		const document = await formDocument();
		const codec =
			new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec();
		const checklist = new JourneyPolicyComposition().communicationChecklist();

		// Act
		const decoded = codec.decode(document);
		const pending = checklist.status(decoded.event, "speaker-introduction");
		const event = {
			...decoded.event,
			operationalChecklists: checklist.complete(decoded.event, [
				"speaker-introduction",
				"host-introduction",
			]),
		};
		const patch = codec.createPatch(document, event);
		const updated = { ...document, ...patch };
		const reread = codec.decode(updated);
		const secondPatch = codec.createPatch(updated, reread.event);
		const publicAnnouncements = updated.body
			.split("### Communication\n")[1]
			?.split("### ")[0];
		const automatedEmails = updated.body
			.split("### Automated introduction emails\n")[1]
			?.split("### ")[0];

		// Assert
		expect(pending).toBe("pending");
		expect(checklist.status(reread.event, "speaker-introduction")).toBe(
			"completed",
		);
		expect(checklist.status(reread.event, "host-introduction")).toBe(
			"completed",
		);
		expect(updated.body).toContain("- [x] Send speaker introduction emails");
		expect(updated.body).toContain("- [x] Send host introduction email");
		expect(automatedEmails).toContain("- [x] Send speaker introduction emails");
		expect(publicAnnouncements).not.toContain(
			"Send speaker introduction emails",
		);
		expect(updated.body).toContain("- [ ] Announce on LinkedIn");
		expect(updated.body).toContain(
			"### Event logistics\n\n- [ ] Arrange the game\n- [ ] Arrange goodies",
		);
		expect(reread.event.operationalChecklists.slidesAndContent).toHaveLength(3);
		expect(
			reread.event.operationalChecklists.communication.map(({ name }) => name),
		).toEqual([
			"Slack - AixMarseille.Tech",
			"Slack - OpenBaR",
			"LinkedIn",
			"Mail introduction speakers",
			"Mail introduction hoster",
		]);
		expect(
			reread.diagnostics.filter(({ severity }) => severity === "error"),
		).toEqual([]);
		expect(secondPatch.body).toBeUndefined();
	});

	it.each([true, false])(
		"keeps follow-up incomplete until the LinkedIn recap is done: %s",
		async (recapCompleted) => {
			// Arrange
			const initial = await formDocument();
			const completedBody = initial.body
				.replace("- [ ] Import attendees", "- [x] Import attendees")
				.replace(
					"- [ ] Share recap on LinkedIn",
					"- [x] Share recap on LinkedIn",
				);
			const document = {
				...initial,
				body: recapCompleted
					? completedBody
					: completedBody.replace(
							"- [x] Share recap on LinkedIn",
							"- [ ] Share recap on LinkedIn",
						),
			};
			const codec =
				new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec();
			const checklist = new JourneyPolicyComposition().communicationChecklist();

			// Act
			const decoded = codec.decode(document);
			const event = {
				...decoded.event,
				operationalChecklists: checklist.complete(decoded.event, [
					"host-thanks",
					"speaker-thanks",
				]),
			};
			event.operationalChecklists = {
				...event.operationalChecklists,
				postEvent: [
					...event.operationalChecklists.postEvent,
					{ name: "Share slides to meetup", completed: true },
				],
			};
			const patch = codec.createPatch(document, event);
			const updated = codec.decode({ ...document, ...patch });
			const automatedThanks = patch.body
				?.split("### Automated thank-you emails\n")[1]
				?.split("### ")[0];
			const manualFollowUp = patch.body
				?.split("### Post event\n")[1]
				?.split("### ")[0];

			// Assert
			expect(decoded.event.followUpComplete).toBe(false);
			expect(updated.event.followUpComplete).toBe(recapCompleted);
			expect(patch.body).toContain("- [x] Send speaker thank-you emails");
			expect(patch.body).not.toContain("- [x] Mail thanks speakers");
			expect(automatedThanks).toContain("- [x] Send host thank-you email");
			expect(manualFollowUp).not.toContain("Send host thank-you email");
			expect(updated.event.operationalChecklists.postEvent).toHaveLength(5);
			expect(patch.body).toContain(
				"### Automated slide sharing\n\n- [x] Send slides to Meetup attendees",
			);
		},
	);

	it("preserves conflicting copies of a task across manual and automated sections", async () => {
		// Arrange
		const initial = await formDocument();
		const document = {
			...initial,
			body:
				initial.body.replace(
					"### Post event\n\n",
					"### Post event\n\n- [x] Mail thanks hoster\n",
				) +
				"\n\n### Automated thank-you emails\n\n- [ ] Send host thank-you email",
		};
		const codec =
			new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec();

		// Act
		const decoded = codec.decode(document);
		const patch = codec.createPatch(document, decoded.event);

		// Assert
		expect(decoded.event.followUpComplete).toBe(false);
		expect(patch.body).toContain(
			document.body.slice(document.body.indexOf("### Post event")),
		);
	});

	it.each([
		[
			"malformed automated checklist",
			"\nUnexpected extra line",
			"event.document.checkbox.invalid",
		],
		[
			"duplicate automated section",
			"\n\n### Automated thank-you emails\n\n- [ ] Send host thank-you email",
			"event.document.heading.duplicate",
		],
	])(
		"preserves a %s without marking follow-up complete",
		async (_name, extra, code) => {
			// Arrange
			const initial = await formDocument();
			const source = {
				...initial,
				body:
					initial.body.replaceAll("- [ ]", "- [x]") +
					"\n\n### Automated slide sharing\n\n- [x] Send slides to Meetup attendees" +
					"\n\n### Automated thank-you emails\n\n- [x] Send host thank-you email\n- [x] Send speaker thank-you emails" +
					extra,
			};
			const codec =
				new GithubIssueFormEventDocumentCodecComposition().gitHubIssueFormEventDocumentCodec();

			// Act
			const decoded = codec.decode(source);
			const patch = codec.createPatch(source, decoded.event);

			// Assert
			expect(decoded.event.followUpComplete).toBe(false);
			expect(decoded.diagnostics).toContainEqual(
				expect.objectContaining({ code, field: "Automated thank-you emails" }),
			);
			expect(patch.body).toContain(
				source.body.slice(source.body.indexOf("### Post event")),
			);
		},
	);
});
