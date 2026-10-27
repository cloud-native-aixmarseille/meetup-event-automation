import * as core from "@actions/core";
import { LocalizationComposition } from "@meetup-automation/localization";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionMessages } from "./i18n/action-messages.js";
import { RuntimeInput } from "./runtime-input.js";
import { SocialRecoveryAction } from "./social-recovery-action.js";

const mocks = vi.hoisted(() => ({ inputs: {} as Record<string, string> }));
vi.mock("@actions/core", () => ({
	getInput: vi.fn((name: string) => mocks.inputs[name]),
	setSecret: vi.fn(),
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "events" } },
	getOctokit: vi.fn(() => ({})),
}));
beforeEach(() => {
	vi.clearAllMocks();
	mocks.inputs = {
		"intent-id": "a".repeat(64),
		outcome: "not-published",
		reference: "https://github.com/example/events/issues/42#issuecomment-123",
		"issue-number": "42",
		"github-token": "github-secret",
		"managed-comment-author": "organizer[bot]",
		"slack-token": "organizer-secret",
		"slack-organizer-channel-id": "CORGANIZERS",
	};
});
function fixture() {
	const execute = vi.fn().mockResolvedValue("pending");
	const compose = vi.fn(() => ({ execute }));
	const messages = new ActionMessages(
		{ localeResolver: new LocalizationComposition().localeResolver() },
		"en",
	);
	return {
		execute,
		compose,
		messages,
		subject: new SocialRecoveryAction({ runtime: new RuntimeInput(), compose }),
	};
}
describe("social recovery action", () => {
	it("requests recovery authority without reading provider publication credentials", async () => {
		// Arrange
		const f = fixture();
		// Act
		const result = await f.subject.run(f.messages);
		// Assert
		expect(f.execute).toHaveBeenCalledExactlyOnceWith({
			intentId: "a".repeat(64),
			outcome: "not-published",
			reference: mocks.inputs.reference,
		});
		expect(result).toEqual({
			details: ["social_recovery=pending"],
			diagnostics: [],
		});
		expect(core.setSecret).toHaveBeenCalledWith("github-secret");
		expect(core.setSecret).toHaveBeenCalledWith("organizer-secret");
		expect(
			vi.mocked(core.getInput).mock.calls.map((call) => call[0]),
		).not.toContain("social-credentials");
	});
	it.each([
		["intent-id", "unknown"],
		["outcome", "retry"],
		["reference", ""],
	])(
		"rejects invalid %s before constructing provider access",
		async (key, value) => {
			// Arrange
			const f = fixture();
			mocks.inputs[key] = value;
			// Act
			const result = f.subject.run(f.messages);
			// Assert
			await expect(result).rejects.toThrow("Invalid social recovery request");
			expect(f.compose).not.toHaveBeenCalled();
		},
	);
});
