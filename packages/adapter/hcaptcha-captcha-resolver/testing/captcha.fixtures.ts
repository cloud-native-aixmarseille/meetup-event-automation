import type { Page } from "playwright-core";
import { vi } from "vitest";

export function captchaPageFixture() {
	const visible = { hcaptcha: true, recaptcha: false };
	let response = "";
	const browser = {};
	const page = {
		context: () => ({ browser: () => browser }),
		url: () => "https://events.example.test/sign-in",
		locator: (selector: string) => {
			if (selector === '[name="h-captcha-response"]')
				return {
					first: () => ({
						count: async () => 1,
						inputValue: async () => response,
					}),
				};
			if (selector === 'iframe[src*="hcaptcha.com"]')
				return {
					all: async () => [{ isVisible: async () => visible.hcaptcha }],
				};
			if (selector === 'iframe[src*="/recaptcha/"]')
				return {
					all: async () => [{ isVisible: async () => visible.recaptcha }],
				};
			throw new Error(`Unexpected selector: ${selector}`);
		},
	} as unknown as Page;
	return {
		page,
		visible,
		respond: (value: string) => {
			response = value;
		},
		solve: vi.fn().mockResolvedValue(false),
	};
}
