import { describe, expect, it } from "vitest";
import { PublicImageUrl } from "./public-image-url.js";

describe("public image URLs", () => {
	it.each([
		"http://images.example.org/a.png",
		"https://user:password@images.example.org/a.png",
		"https://127.0.0.1/a.png",
		"https://10.0.0.1/a.png",
		"https://[::ffff:127.0.0.1]/a.png",
		"https://images.example.org/a.png?X-Amz-Signature=secret",
		"https://localhost/a.png",
		"https://images.example.org:8443/a.png",
	])("rejects unsafe image source %s", (value) => {
		// Arrange
		let rejected = false;

		// Act
		try {
			new PublicImageUrl().parse(value);
		} catch {
			rejected = true;
		}

		// Assert
		expect(rejected).toBe(true);
	});

	it.each([
		"127.0.0.1",
		"10.0.0.1",
		"169.254.169.254",
		"172.16.1.1",
		"192.168.1.1",
		"100.64.0.1",
		"::1",
		"fe80::1",
		"fc00::1",
		"::ffff:10.0.0.1",
	])("rejects non-public DNS answer %s", (address) => {
		// Arrange
		const value = address;

		// Act
		const allowed = new PublicImageUrl().publicAddress(value);

		// Assert
		expect(allowed).toBe(false);
	});

	it("accepts public HTTPS without credentials", () => {
		// Arrange
		const value = "https://images.example.org/portrait.png";

		// Act
		const result = new PublicImageUrl().parse(value);

		// Assert
		expect(result.href).toBe(value);
	});
});
