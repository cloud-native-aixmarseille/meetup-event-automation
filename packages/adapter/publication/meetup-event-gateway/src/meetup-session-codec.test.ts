import { describe, expect, it } from "vitest";
import { MeetupSessionCodec } from "./meetup-session-codec.js";

const now = Date.UTC(2030, 0, 1);
const state = {
	cookies: [
		{
			name: "session",
			value: "private-cookie",
			domain: ".example.test",
			path: "/",
			expires: -1,
			httpOnly: true,
			secure: true,
			sameSite: "Lax" as const,
		},
	],
	origins: [
		{
			origin: "https://www.example.test",
			localStorage: [{ name: "token", value: "private-token" }],
		},
	],
};
function codec(
	scope = "repo/account/password",
	key = "synthetic-high-entropy-api-key",
	time = now,
) {
	return new MeetupSessionCodec(
		key,
		scope,
		"https://www.example.test",
		() => time,
	);
}

describe("Meetup session codec", () => {
	it("encrypts a reusable cookie and local-storage snapshot with a fresh nonce", () => {
		// Arrange
		const cipher = codec();

		// Act
		const first = cipher.encode(state);
		const second = cipher.encode(state);
		const decoded = cipher.decode(first);

		// Assert
		expect(first.equals(second)).toBe(false);
		expect(first.includes(Buffer.from("private-cookie"))).toBe(false);
		expect(first.includes(Buffer.from("private-token"))).toBe(false);
		expect(decoded).toEqual(state);
	});

	it.each(["other-repository", "other-account", "rotated-password"])(
		"rejects a snapshot with a different scope: %s",
		(scope) => {
			// Arrange
			const encrypted = codec().encode(state);

			// Act
			const result = codec(scope).decode(encrypted);

			// Assert
			expect(result).toBeUndefined();
		},
	);

	it("invalidates sessions when the encryption secret rotates", () => {
		// Arrange
		const encrypted = codec().encode(state);

		// Act
		const result = codec("repo/account/password", "rotated-api-key").decode(
			encrypted,
		);

		// Assert
		expect(result).toBeUndefined();
	});

	it.each([-1, 7 * 86400_000 + 1])(
		"rejects an out-of-window timestamp: %s",
		(offset) => {
			// Arrange
			const encrypted = codec().encode(state);

			// Act
			const result = codec(
				"repo/account/password",
				"synthetic-high-entropy-api-key",
				now + offset,
			).decode(encrypted);

			// Assert
			expect(result).toBeUndefined();
		},
	);

	it("rejects tampered ciphertext before restoring any state", () => {
		// Arrange
		const encrypted = codec().encode(state);
		encrypted[encrypted.length - 1] ^= 1;

		// Act
		const result = codec().decode(encrypted);

		// Assert
		expect(result).toBeUndefined();
	});

	it("excludes cookies and local storage belonging to unrelated sites", () => {
		// Arrange
		const unrelated = {
			cookies: [
				...state.cookies,
				{ ...state.cookies[0], domain: ".other.test" },
			],
			origins: [
				...state.origins,
				{ ...state.origins[0], origin: "https://other.test" },
			],
		};

		// Act
		const result = codec().decode(codec().encode(unrelated));

		// Assert
		expect(result).toEqual(state);
	});
});
