import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import type { request } from "node:https";
import type { lookup } from "node:dns/promises";
import { describe, expect, it, vi } from "vitest";
import { BoundedImageDownload } from "./bounded-image-download.js";

function response(
	statusCode: number,
	headers: IncomingMessage["headers"],
	body = Buffer.from("image"),
): IncomingMessage {
	return Object.assign(Readable.from([body]), {
		statusCode,
		headers,
	}) as IncomingMessage;
}

describe("bounded image retrieval", () => {
	it("pins validated DNS answers and sends no integration credentials", async () => {
		// Arrange
		const resolve = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
		const send = vi.fn((_url, _options, callback) => {
			const req = Object.assign(new EventEmitter(), {
				end: () => callback(response(200, { "content-type": "image/png" })),
			});
			return req;
		});
		const download = new BoundedImageDownload(
			resolve as unknown as typeof lookup,
			send as unknown as typeof request,
		);
		// Act
		const result = await download.get(
			"https://images.example.org/portrait.png",
		);
		// Assert
		expect(result.bytes.toString()).toBe("image");
		expect(send.mock.calls[0][1]).toMatchObject({
			agent: false,
			lookup: expect.any(Function),
			signal: expect.any(AbortSignal),
		});
		expect(send.mock.calls[0][1]).not.toHaveProperty("headers");
	});

	it("revalidates every redirect and blocks private DNS answers", async () => {
		// Arrange
		const resolve = vi
			.fn()
			.mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
			.mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
		const send = vi.fn((_url, _options, callback) =>
			Object.assign(new EventEmitter(), {
				end: () =>
					callback(
						response(302, { location: "https://private.example.org/a.png" }),
					),
			}),
		);
		const download = new BoundedImageDownload(
			resolve as unknown as typeof lookup,
			send as unknown as typeof request,
		);
		// Act
		const result = download.get("https://images.example.org/a.png");
		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("stops oversized downloads before retaining an unbounded body", async () => {
		// Arrange
		const resolve = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
		const send = vi.fn((_url, _options, callback) =>
			Object.assign(new EventEmitter(), {
				end: () =>
					callback(
						response(
							200,
							{ "content-type": "image/png" },
							Buffer.alloc(50_000_000),
						),
					),
			}),
		);
		const download = new BoundedImageDownload(
			resolve as unknown as typeof lookup,
			send as unknown as typeof request,
		);
		// Act
		const result = download.get("https://images.example.org/a.png");
		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
	});
});
