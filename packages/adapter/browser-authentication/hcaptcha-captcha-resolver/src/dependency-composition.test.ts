import { describe, expect, it, vi } from "vitest";
import { captchaPageFixture } from "../testing/captcha.fixtures.js";
import { HcaptchaCaptchaResolverComposition } from "./dependency-composition.js";
import { HcaptchaChallenge } from "./hcaptcha-challenge.js";

describe("hCaptcha resolver lifetime", () => {
	it("binds separate pages while sharing a two-attempt budget per invocation", async () => {
		// Arrange
		const first = captchaPageFixture();
		const second = captchaPageFixture();
		const run = vi.fn().mockResolvedValue("blocked");
		const challenge = new HcaptchaChallenge(
			{ run },
			"synthetic-key",
			"synthetic-model",
		);
		const composition = new HcaptchaCaptchaResolverComposition();
		vi.spyOn(composition, "hcaptchaChallenge").mockReturnValue(challenge);
		const factory = composition.captchaResolverFactory(
			"/synthetic/solver",
			"synthetic-key",
			"synthetic-model",
		);
		const firstResolver = factory(
			first.page,
			"ws://127.0.0.1:1234/devtools/browser/abc",
		);
		const secondResolver = factory(
			second.page,
			"ws://127.0.0.1:2345/devtools/browser/def",
		);

		// Act
		const results = [
			await firstResolver.resolve(),
			await secondResolver.resolve(),
			await firstResolver.resolve(),
		];
		second.visible.hcaptcha = false;
		const states = [
			await firstResolver.inspect(),
			await secondResolver.inspect(),
		];

		// Assert
		expect(results).toEqual(["required", "required", "required"]);
		expect(states).toEqual(["required", "clear"]);
		expect(run).toHaveBeenCalledTimes(2);
		expect(run.mock.calls.map(([input]) => input.endpoint)).toEqual([
			"ws://127.0.0.1:1234/devtools/browser/abc",
			"ws://127.0.0.1:2345/devtools/browser/def",
		]);
	});
});
