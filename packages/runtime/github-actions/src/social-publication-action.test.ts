import * as core from "@actions/core";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it, vi } from "vitest";
import type { DraftSource } from "./draft-workspace-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { SocialPublicationAction } from "./social-publication-action.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn(() => "CORGANIZERS") }));
function fixture() {
	const source = {
		owner: "example",
		repo: "events",
		issueNumber: 42,
		destinations: [],
	} as unknown as DraftSource;
	const input = {
		read: vi.fn(async () => source),
		secret: vi.fn(() => "organizer-token"),
	};
	const credentials = { read: vi.fn(() => ({})) };
	const execute = vi
		.fn()
		.mockResolvedValue({ publications: [], diagnostics: [] });
	const compose = vi.fn(() => ({ execute }));
	const messages = new ActionMessages(
		{ localeResolver: new LocalizationComposition().localeResolver() },
		"en",
	);
	return {
		source,
		input,
		credentials,
		execute,
		compose,
		messages,
		subject: new SocialPublicationAction({ input, credentials, compose }),
	};
}
describe("social publication action", () => {
	it("reports no publication work for an empty configured list without requesting generation credentials", async () => {
		// Arrange
		const f = fixture();
		// Act
		const result = await f.subject.run(f.messages);
		// Assert
		expect(result).toEqual({
			details: ["social_publications=0"],
			diagnostics: [],
		});
		expect(f.credentials.read).toHaveBeenCalledExactlyOnceWith([]);
		expect(f.execute).toHaveBeenCalledExactlyOnceWith({
			repository: "example/events",
			issueNumber: 42,
		});
		expect(f.input.secret).toHaveBeenCalledExactlyOnceWith("slack-token");
		expect(core.getInput).toHaveBeenCalledWith("slack-organizer-channel-id", {
			required: true,
		});
	});
	it("reports independent destination outcomes while preserving unresolved diagnostics", async () => {
		// Arrange
		const f = fixture();
		const diagnostics = [
			{
				code: "communication.social.uncertain",
				severity: "warning" as const,
				message: "Social publication requires recovery",
			},
		];
		f.execute.mockResolvedValue({
			publications: [
				{
					target: "engineering:announcement",
					status: "published",
					diagnostics: [],
				},
				{ target: "community:announcement", status: "uncertain", diagnostics },
			],
			diagnostics,
		});
		// Act
		const result = await f.subject.run(f.messages);
		// Assert
		expect(result.details).toEqual([
			"social_target=engineering:announcement status=published",
			"social_target=community:announcement status=uncertain",
		]);
		expect(result.diagnostics).toEqual(diagnostics);
		expect(JSON.stringify(result)).not.toContain("organizer-token");
	});
	it("leaves unexpected failures to the shared action runner", async () => {
		// Arrange
		const f = fixture();
		f.execute.mockRejectedValue(new Error("journal unavailable"));
		// Act
		const result = f.subject.run(f.messages);
		// Assert
		await expect(result).rejects.toThrow("journal unavailable");
	});
});
