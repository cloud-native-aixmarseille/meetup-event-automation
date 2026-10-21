import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionMessages } from "./i18n/action-messages.js";
import { MeetupPublicationAction } from "./meetup-publication-action.js";

const mocks = vi.hoisted(() => ({
	inputs: {} as Record<string, string>,
	create: vi.fn(),
	execute: vi.fn(),
	load: vi.fn(),
	setSecret: vi.fn(),
}));
vi.mock("@actions/core", () => ({
	getInput: vi.fn((name: string) => {
		const value = mocks.inputs[name];
		if (!value) throw new Error("Missing required input");
		return value;
	}),
	setSecret: mocks.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "events" } },
	getOctokit: vi.fn().mockReturnValue({}),
}));
vi.mock("./meetup-publication-composition.js", () => ({
	MeetupPublicationComposition: { create: mocks.create },
}));
vi.mock("./meetup-publication-configuration.js", () => ({
	MeetupPublicationConfiguration: { load: mocks.load },
}));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		"issue-number": "42",
		"meetup-email": "organizer@example.test",
		"meetup-password": " synthetic-password ",
		"gemini-api-key": "synthetic-key",
		"gemini-model": "example-model",
		"slack-token": "synthetic-slack-token",
		"slack-organizer-channel-id": "C12345",
		"github-token": "synthetic-token",
		"managed-comment-author": "organizer[bot]",
		"conference-hall-event": "example-cfp",
		"conference-hall-api-key": "synthetic-source-key",
	};
	mocks.create.mockReturnValue({ get: () => ({ execute: mocks.execute }) });
	mocks.load.mockResolvedValue({
		startTime: "18:45",
		endTime: "20:45",
		venues: {},
	});
	mocks.execute.mockResolvedValue({
		status: "draft",
		reviewUrl: "https://www.meetup.com/example/events/12345/",
		diagnostics: [],
	});
});

describe("Meetup publication action", () => {
	it("prepares the selected issue and masks all account credentials", async () => {
		// Arrange
		const messages = new ActionMessages("en");

		// Act
		const result = await MeetupPublicationAction.run(messages);

		// Assert
		expect(mocks.execute).toHaveBeenCalledWith({
			repository: "example/events",
			issueNumber: 42,
		});
		expect(mocks.setSecret).toHaveBeenCalledWith("organizer@example.test");
		expect(mocks.setSecret).toHaveBeenCalledWith(" synthetic-password ");
		expect(mocks.setSecret).toHaveBeenCalledWith("synthetic-key");
		expect(core.getInput).toHaveBeenCalledWith("meetup-password", {
			required: true,
			trimWhitespace: false,
		});
		expect(result.details).toContain("meetup_event=draft approval=required");
		expect(result.details.join("\n")).toContain("meetup_url=");
		expect(result.details.join("\n")).toContain(
			"https://www.meetup.com/example/events/12345/",
		);
		expect(JSON.stringify(result)).not.toContain("synthetic");
	});

	it("reports blocked state and leaves diagnostic rendering to the shared reporter", async () => {
		// Arrange
		mocks.execute.mockResolvedValue({
			status: "blocked",
			diagnostics: [
				{
					code: "publication.meetup.uncertain",
					severity: "warning",
					message: "Meetup publication: uncertain",
				},
			],
		});

		// Act
		const result = await MeetupPublicationAction.run(new ActionMessages("fr"));

		// Assert
		expect(result.details).toContain("evenement_meetup=bloque");
		expect(result.details.join("\n")).not.toContain(
			"Synchronisation interrompue",
		);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.meetup.uncertain" }),
		);
	});

	it.each([
		"meetup-email",
		"meetup-password",
		"gemini-api-key",
		"gemini-model",
		"github-token",
		"issue-number",
		"slack-token",
		"slack-organizer-channel-id",
	])("rejects missing %s before publication", async (name) => {
		// Arrange
		delete mocks.inputs[name];

		// Act
		const result = MeetupPublicationAction.run(new ActionMessages("en"));

		// Assert
		await expect(result).rejects.toThrow();
		expect(mocks.execute).not.toHaveBeenCalled();
	});
});
