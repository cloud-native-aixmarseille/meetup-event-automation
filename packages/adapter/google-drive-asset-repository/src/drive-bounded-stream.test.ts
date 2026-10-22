import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { DriveBoundedStream } from "./drive-bounded-stream.js";

describe("DriveBoundedStream", () => {
	it("combines binary chunks within the bound and closes the stream", async () => {
		// Arrange
		const stream = Readable.from([Buffer.from("ab"), Buffer.from("cd")]);
		const reader = new DriveBoundedStream();

		// Act
		const result = await reader.read(stream, 4);

		// Assert
		expect(result.toString()).toBe("abcd");
		expect(stream.destroyed).toBe(true);
	});

	it("destroys an oversized stream without returning partial bytes", async () => {
		// Arrange
		const stream = Readable.from([Buffer.alloc(3), Buffer.alloc(3)]);
		const reader = new DriveBoundedStream();

		// Act
		const operation = reader.read(stream, 5);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "limit" });
		expect(stream.destroyed).toBe(true);
	});

	it("rejects nonbinary chunks", async () => {
		// Arrange
		const stream = Readable.from(["unexpected text"]);
		const reader = new DriveBoundedStream();

		// Act
		const operation = reader.read(stream, 100);

		// Assert
		await expect(operation).rejects.toMatchObject({ code: "invalid" });
		expect(stream.destroyed).toBe(true);
	});
});
