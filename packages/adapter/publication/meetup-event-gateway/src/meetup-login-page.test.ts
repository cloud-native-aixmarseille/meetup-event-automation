import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import type { Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { MeetupEventGatewayComposition } from "./dependency-composition.js";
import { MeetupLoginPage } from "./meetup-login-page.js";

function fixture() {
	let url = "https://events.example.test:8443/login/";
	const email = {
		waitFor: vi.fn().mockResolvedValue(undefined),
		fill: vi.fn().mockResolvedValue(undefined),
		inputValue: vi.fn().mockResolvedValue("organizer@example.test"),
	};
	const password = { fill: vi.fn().mockResolvedValue(undefined) };
	const submit = {
		isEnabled: vi.fn().mockResolvedValue(true),
		click: vi.fn().mockResolvedValue(undefined),
	};
	const oneTimeCode = { isVisible: vi.fn().mockResolvedValue(false) };
	const solver = {
		inspect: vi.fn<CaptchaResolver["inspect"]>().mockResolvedValue("clear"),
		resolve: vi.fn<CaptchaResolver["resolve"]>().mockResolvedValue("required"),
	};
	const rejected = { isVisible: vi.fn().mockResolvedValue(false) };
	const cookieNotice = {
		waitFor: vi.fn().mockRejectedValue(new Error("No cookie notice")),
		click: vi.fn(),
	};
	const page = {
		setDefaultTimeout: vi.fn(),
		setDefaultNavigationTimeout: vi.fn(),
		goto: vi.fn().mockImplementation(async (destination) => {
			url = destination;
		}),
		url: () => url,
		waitForURL: vi.fn().mockImplementation(async () => {
			url = "https://events.example.test:8443/home";
		}),
		locator: vi.fn().mockImplementation((selector) => {
			if (selector === 'input[name="email"]') return email;
			if (selector === 'input[name="current-password"]') return password;
			if (selector === 'input[autocomplete="one-time-code"]')
				return { all: async () => [oneTimeCode] };
			throw new Error(`Unexpected selector: ${selector}`);
		}),
		getByRole: vi
			.fn()
			.mockImplementation((_, { name }) =>
				name === "Log in" ? submit : cookieNotice,
			),
		getByText: vi.fn().mockReturnValue({ first: () => rejected }),
	} as unknown as Page;
	return {
		login: new MeetupLoginPage(
			{
				meetupBrowserRoutes:
					new MeetupEventGatewayComposition().meetupBrowserRoutes(),
			},
			page,
			solver,
			"https://events.example.test:8443",
		),
		page,
		email,
		password,
		submit,
		solver,
		oneTimeCode,
		rejected,
		cookieNotice,
		redirect: (destination: string) => {
			url = destination;
		},
	};
}

describe("Meetup login page", () => {
	it("does not enter credentials on an origin different from the supplied input", async () => {
		// Arrange
		const { login, page, redirect, email, password, submit } = fixture();
		vi.mocked(page.goto).mockImplementation(async () => {
			redirect("https://www.meetup.com/login/");
			return null;
		});

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("unexpected-page");
		expect(email.fill).not.toHaveBeenCalled();
		expect(password.fill).not.toHaveBeenCalled();
		expect(submit.click).not.toHaveBeenCalled();
	});

	it("does not enter credentials after a solver redirects to another site", async () => {
		// Arrange
		const { login, solver, email, redirect } = fixture();
		solver.inspect.mockResolvedValue("required");
		solver.resolve.mockImplementation(async () => {
			redirect("https://unexpected.example.test/login/");
			return "clear";
		});

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("unexpected-page");
		expect(email.fill).not.toHaveBeenCalled();
	});

	it("solves a pre-login challenge before filling credentials and submits once", async () => {
		// Arrange
		const { login, solver, email, password, submit } = fixture();
		solver.inspect.mockResolvedValue("required");
		solver.resolve.mockImplementation(async () => {
			solver.inspect.mockResolvedValue("clear");
			return "clear";
		});

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("verified");
		expect(solver.resolve).toHaveBeenCalledOnce();
		expect(solver.resolve.mock.invocationCallOrder[0]).toBeLessThan(
			email.fill.mock.invocationCallOrder[0],
		);
		expect(password.fill).toHaveBeenCalledWith("secret");
		expect(submit.click).toHaveBeenCalledOnce();
	});

	it("requires the resolver to confirm the challenge is cleared after resolution", async () => {
		// Arrange
		const { login, solver, email, submit } = fixture();
		solver.inspect.mockResolvedValue("required");
		solver.resolve.mockResolvedValue("clear");

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("challenge-required");
		expect(email.fill).not.toHaveBeenCalled();
		expect(submit.click).not.toHaveBeenCalled();
	});

	it("does not send one-time-code challenges to the solver", async () => {
		// Arrange
		const { login, oneTimeCode, solver, email } = fixture();
		solver.inspect.mockResolvedValue("required");
		oneTimeCode.isVisible.mockResolvedValue(true);

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("challenge-required");
		expect(solver.resolve).not.toHaveBeenCalled();
		expect(email.fill).not.toHaveBeenCalled();
	});

	it("stops at a visible challenge without entering or submitting credentials", async () => {
		// Arrange
		const { login, solver, email, password, submit } = fixture();
		solver.inspect.mockResolvedValue("required");

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("challenge-required");
		expect(email.fill).not.toHaveBeenCalled();
		expect(password.fill).not.toHaveBeenCalled();
		expect(submit.click).not.toHaveBeenCalled();
	});

	it("stops if a one-time-code challenge appears during CAPTCHA resolution", async () => {
		// Arrange
		const { login, oneTimeCode, solver, email } = fixture();
		solver.inspect.mockResolvedValue("required");
		solver.resolve.mockImplementation(async () => {
			oneTimeCode.isVisible.mockResolvedValue(true);
			return "clear";
		});

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("challenge-required");
		expect(email.fill).not.toHaveBeenCalled();
	});

	it("never fills credentials after an unexpected redirect", async () => {
		// Arrange
		const { login, page, redirect, email, password } = fixture();
		vi.mocked(page.goto).mockImplementation(async () => {
			redirect("https://unexpected.example.test/login/");
			return null;
		});

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("unexpected-page");
		expect(email.fill).not.toHaveBeenCalled();
		expect(password.fill).not.toHaveBeenCalled();
	});

	it("verifies the account email after one login submission", async () => {
		// Arrange
		const { login, email, password, submit, page } = fixture();

		// Act
		const result = await login.login("organizer@example.test", " secret ");

		// Assert
		expect(result).toBe("verified");
		expect(email.fill).toHaveBeenCalledWith("organizer@example.test");
		expect(password.fill).toHaveBeenCalledWith(" secret ");
		expect(submit.click).toHaveBeenCalledOnce();
		expect(email.inputValue).toHaveBeenCalledOnce();
		expect(page.goto).toHaveBeenLastCalledWith(
			"https://events.example.test:8443/account/management/",
			{
				waitUntil: "domcontentloaded",
			},
		);
	});

	it("does not accept a different authenticated account", async () => {
		// Arrange
		const { login, email } = fixture();
		email.inputValue.mockResolvedValue("someone-else@example.test");

		// Act
		const result = await login.verifyAccount("organizer@example.test");

		// Assert
		expect(result).toBe("unexpected-page");
	});

	it("reports a login redirect as an unusable session", async () => {
		// Arrange
		const { login, page, redirect, email } = fixture();
		vi.mocked(page.goto).mockImplementation(async () => {
			redirect(
				"https://events.example.test:8443/login/?returnUri=%2Faccount%2F",
			);
			return null;
		});

		// Act
		const result = await login.verifyAccount("organizer@example.test");

		// Assert
		expect(result).toBe("session-not-reusable");
		expect(email.inputValue).not.toHaveBeenCalled();
	});

	it("reports a challenge appearing after submission without resubmitting", async () => {
		// Arrange
		const { login, page, submit, solver } = fixture();
		solver.inspect.mockResolvedValueOnce("clear").mockResolvedValue("required");
		vi.mocked(page.waitForURL).mockRejectedValue(new Error("Timed out"));

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("challenge-required");
		expect(submit.click).toHaveBeenCalledOnce();
		expect(solver.resolve).not.toHaveBeenCalled();
	});

	it("reports rejected credentials without retrying", async () => {
		// Arrange
		const { login, page, rejected, submit } = fixture();
		rejected.isVisible.mockResolvedValue(true);
		vi.mocked(page.waitForURL).mockRejectedValue(new Error("Timed out"));

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("credentials-rejected");
		expect(submit.click).toHaveBeenCalledOnce();
	});

	it("does not force a disabled login button", async () => {
		// Arrange
		const { login, submit } = fixture();
		submit.isEnabled.mockResolvedValue(false);

		// Act
		const result = await login.login("organizer@example.test", "secret");

		// Assert
		expect(result).toBe("unexpected-page");
		expect(submit.click).not.toHaveBeenCalled();
	});

	it("dismisses the cookie notice without accepting optional tracking", async () => {
		// Arrange
		const { login, cookieNotice } = fixture();
		cookieNotice.waitFor.mockResolvedValue(undefined);

		// Act
		await login.login("organizer@example.test", "secret");

		// Assert
		expect(cookieNotice.click).toHaveBeenCalledOnce();
	});
});
