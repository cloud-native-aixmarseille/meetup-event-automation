import * as core from "@actions/core";
import type { SocialDestination } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { SocialDraftTargetInput } from "./social-draft-target-input.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn() }));
const destination: SocialDestination = {
	key: "engineering",
	provider: "slack",
	label: "Engineering",
	workspaceId: "TEXAMPLE",
	channelId: "CEXAMPLE",
};

describe("social draft target input", () => {
	it.each(["announcement", "d7", "d0"])(
		"accepts a configured destination for %s",
		(purpose) => {
			// Arrange
			vi.mocked(core.getInput).mockReturnValue(`engineering:${purpose}`);
			const subject = new SocialDraftTargetInput("slack");
			// Act
			const result = subject.read({ destinations: [destination] });
			// Assert
			expect(result).toBe(`engineering:${purpose}`);
		},
	);
	it.each([
		["unlisted:announcement", "slack", [destination]],
		["engineering:announcement", "slack", []],
		["engineering:d7", "linkedin", [destination]],
		["engineering:invalid", "slack", [destination]],
		["engineering:d0:extra", "slack", [destination]],
	] as const)(
		"rejects %s for %s with unauthorized configuration",
		(target, provider, destinations) => {
			// Arrange
			vi.mocked(core.getInput).mockReturnValue(target);
			const subject = new SocialDraftTargetInput(provider);
			// Act
			const read = () => subject.read({ destinations });
			// Assert
			expect(read).toThrow("not a configured destination");
		},
	);
});
