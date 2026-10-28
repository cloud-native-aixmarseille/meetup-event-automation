import { describe, expect, it } from "vitest";
import { createDownloadFixture } from "../testing/pdf-download.fixtures.js";
import { pdfBytes, pdfFingerprint } from "../testing/pdf-drive.fixtures.js";

describe("GoogleDrivePdfDownload", () => {
	it("downloads and verifies a prepared PDF with provider authentication", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.operation.metadata = { resourceKey: "synthetic-key" };

		// Act
		const result = await fixture.adapter.export("source");

		// Assert
		expect(result).toEqual({ bytes: pdfBytes, fingerprint: pdfFingerprint });
		expect(fixture.download).toHaveBeenCalledWith(
			{ fileId: "source", mimeType: "application/pdf" },
			{ retry: false, timeout: 30_000 },
		);
		expect(fixture.request).toHaveBeenCalledWith(
			new URL(fixture.operation.response?.downloadUri),
			expect.objectContaining({
				redirect: "manual",
				signal: expect.any(AbortSignal),
				headers: {
					Authorization: "Bearer synthetic-token",
					"X-Goog-Drive-Resource-Keys": "source/synthetic-key",
				},
			}),
		);
	});

	it("polls pending downloads before fetching bytes", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.download.mockResolvedValueOnce({
			data: { name: "operations/synthetic", done: false },
		});

		// Act
		await fixture.adapter.export("source");

		// Assert
		expect(fixture.wait).toHaveBeenCalledWith(10_000);
		expect(fixture.get).toHaveBeenCalledWith(
			{ name: "operations/synthetic" },
			{ retry: false, timeout: 30_000 },
		);
		expect(fixture.request).toHaveBeenCalledOnce();
	});

	it("bounds polling when preparation does not finish", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.operation.done = false;

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toThrow("preparation timed out");
		expect(fixture.get).toHaveBeenCalledTimes(11);
		expect(fixture.request).not.toHaveBeenCalled();
	});

	it("redacts operation errors before any download", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.operation.error = { code: 403, message: "private provider detail" };

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toThrow("Google Drive PDF preparation failed");
		expect(fixture.request).not.toHaveBeenCalled();
	});

	it("strips credentials and resource keys on content-host redirects", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.operation.metadata = { resourceKey: "synthetic-key" };
		fixture.request.mockResolvedValueOnce(
			new Response(null, {
				status: 302,
				headers: { location: "https://download.googleusercontent.com/signed" },
			}),
		);

		// Act
		const result = await fixture.adapter.export("source");

		// Assert
		expect(result.fingerprint).toBe(pdfFingerprint);
		expect(fixture.request).toHaveBeenNthCalledWith(
			2,
			new URL("https://download.googleusercontent.com/signed"),
			expect.objectContaining({ headers: {}, redirect: "manual" }),
		);
	});

	it.each([
		"https://attacker.test/private",
		"http://docs.google.com/private",
		"https://docs.google.com:8443/private",
		"https://secret@docs.google.com/private",
		"https://docs.google.com.attacker.test/private",
		"https://download.googleusercontent.com/private",
		undefined,
	])("rejects an untrusted initial destination %#", async (url) => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.operation.response = { downloadUri: url };

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toBeInstanceOf(Error);
		expect(fixture.token).not.toHaveBeenCalled();
		expect(fixture.request).not.toHaveBeenCalled();
	});

	it("rejects redirects outside the download provider", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.request.mockResolvedValueOnce(
			new Response(null, {
				status: 302,
				headers: { location: "https://attacker.test/private" },
			}),
		);

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toThrow("Untrusted Google Drive download URL");
		expect(fixture.request).toHaveBeenCalledOnce();
	});

	it("bounds redirect loops", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.request.mockImplementation(
			async () =>
				new Response(null, { status: 302, headers: { location: "/loop" } }),
		);

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toThrow(
			"Too many Google Drive download redirects",
		);
		expect(fixture.request).toHaveBeenCalledTimes(6);
	});

	it("rejects a failed media response without exposing its body", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		fixture.request.mockResolvedValueOnce(
			new Response("private provider detail", { status: 401 }),
		);

		// Act
		const result = fixture.adapter.export("source");

		// Assert
		await expect(result).rejects.toThrow("Google Drive PDF download failed");
	});

	it("accepts complete PDFs larger than the synchronous export limit", async () => {
		// Arrange
		const fixture = createDownloadFixture();
		const bytes = Buffer.concat([
			Buffer.from("%PDF-1.7\n"),
			Buffer.alloc(10_000_000, 32),
			Buffer.from("\n%%EOF\n"),
		]);
		fixture.request.mockResolvedValueOnce(
			new Response(bytes, { headers: { "content-type": "application/pdf" } }),
		);

		// Act
		const result = await fixture.adapter.export("source");

		// Assert
		expect(Buffer.from(result.bytes).equals(bytes)).toBe(true);
	});
});
