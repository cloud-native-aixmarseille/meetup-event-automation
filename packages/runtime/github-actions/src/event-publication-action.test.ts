import * as core from "@actions/core";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventPublicationConfigurationFixture,
	publicationCredentialsFixture,
} from "../testing/event-publication.fixtures.js";
import {
	eventPublicationSettings,
	publicationUrlInputs,
} from "../testing/publication-urls.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventPublicationAction } from "./event-publication-action.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { PublicationCredentialsInput } from "./publication-credentials-input.js";

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
beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		...publicationUrlInputs,
		"issue-number": "42",
		"publication-credentials": JSON.stringify(publicationCredentialsFixture()),
		"slack-token": "synthetic-slack-token",
		"slack-organizer-channel-id": "C12345",
		"github-token": "synthetic-token",
		"managed-comment-author": "organizer[bot]",
		"conference-hall-event": "example-cfp",
		"conference-hall-api-key": "synthetic-source-key",
	};
	mocks.create.mockReturnValue({ get: () => ({ execute: mocks.execute }) });
	mocks.load.mockResolvedValue(
		new GithubActionsComposition()
			.eventPublicationConfiguration()
			.parse(eventPublicationConfigurationFixture()),
	);
	mocks.execute.mockResolvedValue({
		publications: [
			{
				status: "draft",
				destination: {
					provider: "meetup",
					target: "https://www.meetup.com/example/",
				},
				reviewUrl: "https://www.meetup.com/example/events/12345/",
				diagnostics: [],
			},
			{
				status: "updated",
				destination: { provider: "ocgroups", target: "example" },
				diagnostics: [],
			},
		],
		diagnostics: [],
	});
});

describe("event publication action", () => {
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
				adapters: [
					expect.objectContaining({
						provider: "meetup",
						credentials: publicationCredentialsFixture().meetup,
					}),
					expect.objectContaining({
						provider: "ocgroups",
						credentials: publicationCredentialsFixture().ocgroups,
					}),
				],
			}),
		);
		expect(mocks.execute).toHaveBeenCalledWith({
			repository: "example/events",
			issueNumber: 42,
		});
		expect(mocks.setSecret).toHaveBeenCalledWith("organizer@example.test");
		expect(mocks.setSecret).toHaveBeenCalledWith(" synthetic-meetup-password ");
		expect(mocks.setSecret).toHaveBeenCalledWith("synthetic-ai-key");
		expect(core.getInput).toHaveBeenCalledWith("publication-credentials", {
			required: true,
			trimWhitespace: false,
		});
		expect(result.details).toContain(
			"publication_provider=meetup event=draft approval=required",
		);
		expect(result.details.join("\n")).toContain("review_url=");
		expect(result.details).toContain(
			"publication_provider=ocgroups event=synchronized",
		);
		expect(result.details.join("\n")).toContain(
			"https://www.meetup.com/example/events/12345/",
		);
		expect(JSON.stringify(result)).not.toContain("synthetic");
	});

	it("reports blocked state and leaves diagnostic rendering to the shared reporter", async () => {
		// Arrange
		mocks.execute.mockResolvedValue({
			publications: [
				{
					destination: { provider: "ocgroups", target: "example" },
					status: "blocked",
					diagnostics: [],
				},
			],
			diagnostics: [
				{
					code: "publication.community.uncertain",
					severity: "warning",
					message: "Community publication: uncertain",
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
		expect(result.details).toContain(
			"fournisseur_publication=ocgroups evenement=bloque",
		);
		expect(result.details.join("\n")).not.toContain(
			"Synchronisation interrompue",
		);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "publication.community.uncertain" }),
		);
	});

	it.each([
		"meetup-event-url-prefix",
		"community-event-url-prefixes",
		"asset-folder-url-prefix",
		"publication-credentials",
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
	return new EventPublicationAction({
		credentials: new PublicationCredentialsInput(
			new GithubActionsComposition().runtimeInput(),
			new GithubActionsComposition().aiInput(),
		),
		publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
		createJourney: (input) => mocks.create(input).get(),
		runtimeInput: new GithubActionsComposition().runtimeInput(),
		conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		eventPublicationConfiguration: { load: mocks.load },
	});
}
