import * as core from "@actions/core";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventPublicationSettings,
	publicationUrlInputs,
} from "../testing/publication-urls.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
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

beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		...publicationUrlInputs,
		"issue-number": "42",
		"meetup-email": "organizer@example.test",
		"meetup-password": " synthetic-password ",
		"ai-api-key": "synthetic-key",
		"ai-provider": "gemini",
		"ai-model": "example-model",
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
		const messages = new ActionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"en",
		);

		// Act
		const result = await subject().run(messages);

		// Assert
		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({
				...eventPublicationSettings,
				ai: {
					provider: "gemini",
					model: "example-model",
					apiKey: "synthetic-key",
				},
			}),
		);
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
		const result = await subject().run(
			new ActionMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"fr",
			),
		);

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
		"meetup-event-url-prefix",
		"community-event-url-prefixes",
		"asset-folder-url-prefix",
		"meetup-email",
		"meetup-password",
		"ai-api-key",
		"ai-provider",
		"ai-model",
		"github-token",
		"issue-number",
		"slack-token",
		"slack-organizer-channel-id",
	])("rejects missing %s before publication", async (name) => {
		// Arrange
		delete mocks.inputs[name];

		// Act
		const result = subject().run(
			new ActionMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"en",
			),
		);

		// Assert
		await expect(result).rejects.toThrow();
		expect(mocks.execute).not.toHaveBeenCalled();
	});
});

function subject() {
	return new MeetupPublicationAction({
		aiInput: new GithubActionsComposition().aiInput(),
		publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
		createJourney: (input) => mocks.create(input).get(),
		runtimeInput: new GithubActionsComposition().runtimeInput(),
		conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		meetupPublicationConfiguration: { load: mocks.load },
	});
}
