import type { Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { sessionStore } from "../testing/session-fixture.js";
import { MeetupAuthentication } from "./meetup-authentication.js";
import type { PublicationAuthenticationStatus } from "./meetup-session-status.js";

function fixture() {
	const state = { cookies: [], origins: [] };
	const context = {
		storageState: vi.fn().mockResolvedValue(state),
		setStorageState: vi.fn(),
	};
	const page = { context: () => context } as unknown as Page;
	const login = {
		login: vi
			.fn<() => Promise<PublicationAuthenticationStatus>>()
			.mockResolvedValue("verified"),
		verifyAccount: vi
			.fn<() => Promise<PublicationAuthenticationStatus>>()
			.mockResolvedValue("verified"),
	};
	const sessions: {
		open: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
	}[] = [];
	const store = sessionStore();
	const delay = vi.fn().mockResolvedValue(undefined);
	const createSession = vi.fn(() => {
		const session = {
			open: vi
				.fn()
				.mockResolvedValue({ page, endpoint: "ws://127.0.0.1:1234" }),
			close: vi.fn().mockResolvedValue(undefined),
		};
		sessions.push(session);
		return session;
	});
	const authentication = new MeetupAuthentication(
		{ createSession, createLogin: () => login, store, delay },
		{ email: "organizer@example.test", password: "synthetic-password" },
	);
	return { authentication, login, store, delay, sessions, context, state };
}

describe("Meetup authentication", () => {
	it("verifies and reuses a saved session without submitting credentials again", async () => {
		// Arrange
		const { authentication, login, store, state, context } = fixture();
		await store.save(state);

		// Act
		await authentication.open("UTC");

		// Assert
		expect(context.setStorageState).toHaveBeenCalledWith(state);
		expect(login.verifyAccount).toHaveBeenCalledWith("organizer@example.test");
		expect(login.login).not.toHaveBeenCalled();
		expect(store.save).toHaveBeenCalledTimes(2);
	});

	it("replaces an expired session with a freshly verified login", async () => {
		// Arrange
		const { authentication, login, store, state, context } = fixture();
		await store.save(state);
		login.verifyAccount.mockResolvedValue("session-not-reusable");

		// Act
		await authentication.open("UTC");

		// Assert
		expect(store.clear).toHaveBeenCalledOnce();
		expect(context.setStorageState).toHaveBeenLastCalledWith({
			cookies: [],
			origins: [],
		});
		expect(login.login).toHaveBeenCalledOnce();
	});

	it("retries a transient login failure with backoff before returning the session", async () => {
		// Arrange
		const { authentication, login, delay, sessions } = fixture();
		login.login
			.mockResolvedValueOnce("login-page-unavailable")
			.mockResolvedValueOnce("redirect-timeout");

		// Act
		const result = await authentication.open("Europe/Paris");

		// Assert
		expect(delay.mock.calls).toEqual([[2_000], [5_000]]);
		expect(sessions).toHaveLength(3);
		expect(sessions[0].close).toHaveBeenCalledOnce();
		expect(sessions[1].close).toHaveBeenCalledOnce();
		expect(result.session).toBe(sessions[2]);
		expect(sessions[2].close).not.toHaveBeenCalled();
	});

	it("preserves the precise failed stage when transient retries are exhausted", async () => {
		// Arrange
		const { authentication, login, store, sessions } = fixture();
		login.login.mockResolvedValue("account-unavailable");

		// Act
		const result = authentication.open("UTC");

		// Assert
		await expect(result).rejects.toMatchObject({
			kind: "authentication-account-unavailable",
		});
		expect(login.login).toHaveBeenCalledTimes(3);
		expect(store.save).not.toHaveBeenCalled();
		for (const session of sessions)
			expect(session.close).toHaveBeenCalledOnce();
	});

	it.each([
		"credentials-rejected",
		"one-time-code",
		"account-mismatch",
		"unexpected-page",
		"rate-limited",
	] as const)("does not retry %s", async (status) => {
		// Arrange
		const { authentication, login, delay, store } = fixture();
		login.login.mockResolvedValue(status);

		// Act
		const result = authentication.open("UTC");

		// Assert
		await expect(result).rejects.toMatchObject({
			kind: `authentication-${status}`,
		});
		expect(login.login).toHaveBeenCalledOnce();
		expect(delay).not.toHaveBeenCalled();
		expect(store.save).not.toHaveBeenCalled();
	});

	it("discards a restored session for a different account without submitting credentials", async () => {
		// Arrange
		const { authentication, login, store, state } = fixture();
		await store.save(state);
		login.verifyAccount.mockResolvedValue("account-mismatch");

		// Act
		const result = authentication.open("UTC");

		// Assert
		await expect(result).rejects.toMatchObject({
			kind: "authentication-account-mismatch",
		});
		expect(login.login).not.toHaveBeenCalled();
		expect(store.save).toHaveBeenCalledOnce();
	});

	it("keeps verified authentication usable when snapshot export fails", async () => {
		// Arrange
		const { authentication, login, context, store } = fixture();
		context.storageState.mockRejectedValue(
			new Error("private browser contents"),
		);

		// Act
		const result = await authentication.open("UTC");

		// Assert
		expect(result.page).toBeDefined();
		expect(login.login).toHaveBeenCalledOnce();
		expect(store.save).not.toHaveBeenCalled();
	});
});

it("retries temporary account verification failures without a fresh password login", async () => {
	// Arrange
	const { authentication, login, store, state, context, delay } = fixture();
	await store.save(state);
	login.verifyAccount.mockResolvedValueOnce("account-unavailable");

	// Act
	await authentication.open("UTC");

	// Assert
	expect(store.load).toHaveBeenCalledOnce();
	expect(login.verifyAccount).toHaveBeenCalledTimes(2);
	expect(login.login).not.toHaveBeenCalled();
	expect(context.setStorageState.mock.calls).toEqual([[state], [state]]);
	expect(delay).toHaveBeenCalledExactlyOnceWith(2_000);
});

it("reports exhausted session checks without needlessly submitting credentials", async () => {
	// Arrange
	const { authentication, login, store, state } = fixture();
	await store.save(state);
	login.verifyAccount.mockResolvedValue("account-unavailable");

	// Act
	const result = authentication.open("UTC");

	// Assert
	await expect(result).rejects.toMatchObject({
		kind: "authentication-account-unavailable",
	});
	expect(login.verifyAccount).toHaveBeenCalledTimes(3);
	expect(login.login).not.toHaveBeenCalled();
	expect(store.save).toHaveBeenCalledOnce();
});

it("does not restore an explicitly expired session during subsequent login retries", async () => {
	// Arrange
	const { authentication, login, store, state } = fixture();
	await store.save(state);
	login.verifyAccount.mockResolvedValue("session-not-reusable");
	login.login.mockResolvedValueOnce("login-page-unavailable");

	// Act
	await authentication.open("UTC");

	// Assert
	expect(login.verifyAccount).toHaveBeenCalledOnce();
	expect(login.login).toHaveBeenCalledTimes(2);
	expect(store.clear).toHaveBeenCalledOnce();
});
