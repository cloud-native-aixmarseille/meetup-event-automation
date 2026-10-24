import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	eventPublicationConfigurationFixture,
	publicationCredentialsFixture,
} from "../testing/event-publication.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationCredentialsInput } from "./publication-credentials-input.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn(), setSecret: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function fixture() {
	const runtime = new GithubActionsComposition();
	return {
		subject: new PublicationCredentialsInput(
			runtime.runtimeInput(),
			runtime.aiInput(),
		),
		destinations: runtime
			.eventPublicationConfiguration()
			.parse(eventPublicationConfigurationFixture()).destinations,
	};
}
describe("publication adapter credentials", () => {
	it("binds and masks credentials for both destinations while preserving password whitespace", () => {
		// Arrange
		const f = fixture();
		const credentials = publicationCredentialsFixture();
		vi.mocked(core.getInput).mockReturnValue(JSON.stringify(credentials));
		// Act
		const adapters = f.subject.read(f.destinations);
		// Assert
		expect(adapters.map((adapter) => adapter.provider)).toEqual([
			"meetup",
			"ocgroups",
		]);
		expect(adapters[0].credentials.password).toBe(credentials.meetup.password);
		expect(adapters[1].credentials.password).toBe(
			credentials.ocgroups.password,
		);
		expect(core.setSecret).toHaveBeenCalledWith(credentials.meetup.ai.apiKey);
		expect(core.setSecret).toHaveBeenCalledWith(credentials.ocgroups.password);
		expect(core.setSecret).toHaveBeenCalledWith(
			credentials.ocgroups.password.trim(),
		);
	});
	it("requires no Meetup or AI credentials for an OCGroups-only collection", () => {
		// Arrange
		const f = fixture();
		const credentials = { ocgroups: publicationCredentialsFixture().ocgroups };
		// Act
		const adapters = f.subject.parse(
			JSON.stringify(credentials),
			f.destinations.filter(
				(destination) => destination.provider === "ocgroups",
			),
		);
		// Assert
		expect(adapters).toHaveLength(1);
		expect(adapters[0].credentials).toEqual(credentials.ocgroups);
	});
	it.each([
		{},
		{ meetup: {} },
		{ ...publicationCredentialsFixture(), unknown: { password: "private" } },
		{
			meetup: {
				...publicationCredentialsFixture().meetup,
				ai: { provider: "unsupported", model: "x", apiKey: "private" },
			},
			ocgroups: publicationCredentialsFixture().ocgroups,
		},
	])("rejects missing or unsupported credentials: %j", (credentials) => {
		// Arrange
		const f = fixture();
		// Act
		const parse = () =>
			f.subject.parse(JSON.stringify(credentials), f.destinations);
		// Assert
		expect(parse).toThrow();
	});
	it("redacts malformed JSON instead of exposing its contents in parse errors", () => {
		// Arrange
		const f = fixture();
		const input = '{"meetup": "private-credential-fragment';
		// Act
		const parse = () => f.subject.parse(input, f.destinations);
		// Assert
		expect(parse).toThrow("Invalid publication credentials JSON");
		expect(core.setSecret).toHaveBeenCalledWith(input);
	});
});
