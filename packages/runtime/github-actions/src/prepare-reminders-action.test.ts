import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it, vi } from "vitest";
import type { AiConfiguration } from "./ai-configuration.js";
import type { DraftSource } from "./draft-workspace-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { PrepareRemindersAction } from "./prepare-reminders-action.js";

function fixture() {
	const input = {
		owner: "example",
		repo: "meetups",
		issueNumber: 42,
		destinations: [],
		settings: { guidance: "Concise" },
		credentials: "private-google",
	} as unknown as DraftSource & { credentials: string };
	const ai = {
		provider: "gemini",
		model: "synthetic-model",
		apiKey: "private-ai",
	} satisfies AiConfiguration;
	const execute = vi.fn(async () => ({
		results: [{ target: "engineering:d0" as const, status: "complete" }],
		diagnostics: [],
	}));
	const supported = vi.fn(() => true);
	const compose = vi.fn(() => ({
		generator: { supported },
		prepare: { execute },
	}));
	return {
		input,
		ai,
		execute,
		supported,
		compose,
		messages: new ActionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"en",
		),
		action: new PrepareRemindersAction(
			async () => input,
			{ read: () => ai },
			compose,
		),
	};
}
describe("reminder preparation action", () => {
	it("reports preparation separately from publication without exposing credentials", async () => {
		// Arrange
		const f = fixture();
		// Act
		const report = await f.action.run(f.messages);
		// Assert
		expect(f.execute).toHaveBeenCalledExactlyOnceWith(
			{ repository: "example/meetups", issueNumber: 42 },
			[],
			{ kind: "ai", provider: "gemini", model: "synthetic-model" },
			"Concise",
		);
		expect(report.details).toEqual([
			"social_target=engineering:d0 status=complete",
		]);
		expect(JSON.stringify(report)).not.toContain("private-");
	});
	it("rejects an unsupported model before preparing any draft", async () => {
		// Arrange
		const f = fixture();
		f.supported.mockReturnValue(false);
		// Act
		const result = f.action.run(f.messages);
		// Assert
		await expect(result).rejects.toThrow("Unsupported reminder text model");
		expect(f.execute).not.toHaveBeenCalled();
	});
});
