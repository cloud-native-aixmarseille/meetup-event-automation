import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import { describe, expect, it } from "vitest";
import { captchaPageFixture } from "../testing/captcha.fixtures.js";
import { HcaptchaCaptchaResolver } from "./hcaptcha-captcha-resolver.js";

describe("hCaptcha resolver", () => {
	it.each([
		{ hcaptcha: false, recaptcha: false, response: "", expected: "clear" },
		{ hcaptcha: true, recaptcha: false, response: "", expected: "required" },
		{
			hcaptcha: true,
			recaptcha: false,
			response: "response",
			expected: "clear",
		},
		{
			hcaptcha: false,
			recaptcha: true,
			response: "response",
			expected: "required",
		},
	])(
		"inspects CAPTCHA state without invoking the solver: %j",
		async ({ hcaptcha, recaptcha, response, expected }) => {
			// Arrange
			const f = captchaPageFixture();
			Object.assign(f.visible, { hcaptcha, recaptcha });
			f.respond(response);
			const resolver: CaptchaResolver = new HcaptchaCaptchaResolver(
				{ solve: f.solve },
				f.page,
			);

			// Act
			const status = await resolver.inspect();

			// Assert
			expect(status).toBe(expected);
			expect(f.solve).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ hcaptcha: false, recaptcha: false, response: "", expected: "clear" },
		{
			hcaptcha: true,
			recaptcha: false,
			response: "response",
			expected: "clear",
		},
		{ hcaptcha: true, recaptcha: true, response: "", expected: "required" },
	])(
		"does not attempt absent, satisfied, or unsupported challenges: %j",
		async ({ hcaptcha, recaptcha, response, expected }) => {
			// Arrange
			const f = captchaPageFixture();
			Object.assign(f.visible, { hcaptcha, recaptcha });
			f.respond(response);
			const resolver = new HcaptchaCaptchaResolver({ solve: f.solve }, f.page);

			// Act
			const status = await resolver.resolve();

			// Assert
			expect(status).toBe(expected);
			expect(f.solve).not.toHaveBeenCalled();
		},
	);

	it("reports clear only after a successful attempt and verified response", async () => {
		// Arrange
		const f = captchaPageFixture();
		f.solve.mockImplementation(async () => {
			f.respond("verified-response");
			return true;
		});
		const resolver = new HcaptchaCaptchaResolver({ solve: f.solve }, f.page);

		// Act
		const status = await resolver.resolve();

		// Assert
		expect(status).toBe("clear");
		expect(f.solve).toHaveBeenCalledExactlyOnceWith(f.page);
	});

	it.each([true, false])(
		"requires a response after solver success even when the frame is visible: %s",
		async (visible) => {
			// Arrange
			const f = captchaPageFixture();
			f.solve.mockImplementation(async () => {
				f.visible.hcaptcha = visible;
				return true;
			});
			const resolver = new HcaptchaCaptchaResolver({ solve: f.solve }, f.page);

			// Act
			const status = await resolver.resolve();

			// Assert
			expect(status).toBe("required");
		},
	);

	it("keeps an unresolved challenge blocked", async () => {
		// Arrange
		const f = captchaPageFixture();
		const resolver = new HcaptchaCaptchaResolver({ solve: f.solve }, f.page);

		// Act
		const status = await resolver.resolve();

		// Assert
		expect(status).toBe("required");
		expect(f.solve).toHaveBeenCalledOnce();
	});

	it("blocks an unsupported challenge appearing during resolution", async () => {
		// Arrange
		const f = captchaPageFixture();
		f.solve.mockImplementation(async () => {
			f.respond("response");
			f.visible.recaptcha = true;
			return true;
		});
		const resolver = new HcaptchaCaptchaResolver({ solve: f.solve }, f.page);

		// Act
		const status = await resolver.resolve();

		// Assert
		expect(status).toBe("required");
	});
});
