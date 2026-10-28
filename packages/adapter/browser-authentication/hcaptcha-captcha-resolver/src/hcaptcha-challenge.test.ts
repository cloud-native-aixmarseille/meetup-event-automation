import type { Page } from "playwright-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HcaptchaChallenge } from "./hcaptcha-challenge.js";

function fixture() {
	const browser = {};
	const page = {
		context: () => ({ browser: () => browser }),
		url: () => "https://events.example.test/sign-in",
	} as unknown as Page;
	const run = vi.fn().mockResolvedValue("solved");
	const challenge = new HcaptchaChallenge(
		{ run },
		"synthetic-key",
		"synthetic-model",
	);
	return { challenge, page, run };
}

afterEach(() => vi.restoreAllMocks());

describe("hCaptcha challenge", () => {
	it("makes a single configured solver attempt per authentication check", async () => {
		// Arrange
		const { challenge, page, run } = fixture();

		// Act
		const first = await challenge.solve(
			page,
			"ws://127.0.0.1:1234/devtools/browser/abc",
		);
		const second = await challenge.solve(
			page,
			"ws://127.0.0.1:1234/devtools/browser/abc",
		);

		// Assert
		expect(first).toBe(true);
		expect(second).toBe(false);
		expect(run).toHaveBeenCalledExactlyOnceWith({
			endpoint: "ws://127.0.0.1:1234/devtools/browser/abc",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "synthetic-key",
			model: "synthetic-model",
		});
	});

	it("returns a blocked challenge when the attempt cannot solve it", async () => {
		// Arrange
		const { challenge, page, run } = fixture();
		run.mockResolvedValue("blocked");

		// Act
		const result = await challenge.solve(
			page,
			"ws://127.0.0.1:1234/devtools/browser/abc",
		);

		// Assert
		expect(result).toBe(false);
	});

	it("reports a fixed technical error when the provider is unavailable", async () => {
		// Arrange
		const { challenge, page, run } = fixture();
		run.mockResolvedValue("unavailable");

		// Act
		const result = challenge.solve(
			page,
			"ws://127.0.0.1:1234/devtools/browser/abc",
		);

		// Assert
		await expect(result).rejects.toThrow("Challenge solver unavailable.");
	});

	it.each([
		["", "model"],
		["key", " "],
	])("requires a key and model", (key, model) => {
		// Arrange
		const run = vi.fn();

		// Act
		const construct = () => new HcaptchaChallenge({ run }, key, model);

		// Assert
		expect(construct).toThrow("Gemini credentials and model are required.");
		expect(run).not.toHaveBeenCalled();
	});
});
