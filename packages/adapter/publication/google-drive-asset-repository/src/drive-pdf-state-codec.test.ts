import { PdfExportPolicy } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import {
	exportIdentity,
	exportSnapshot,
	exportState,
} from "../testing/pdf-drive.fixtures.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import { DrivePdfStateCodec } from "./drive-pdf-state-codec.js";

describe("DrivePdfStateCodec", () => {
	it("round-trips pending and confirmed state using its owned schema", () => {
		// Arrange
		const codec = new DrivePdfStateCodec(
			new DrivePdfMetadata(),
			new PdfExportPolicy(),
		);
		const state = { ...exportState, confirmed: exportSnapshot };

		// Act
		const json = codec.encode(state);
		const restored = codec.decode(JSON.parse(json), exportIdentity);

		// Assert
		expect(restored).toEqual(state);
		expect(JSON.parse(json).version).toBe(1);
	});

	it.each([
		null,
		[],
		{ version: 2 },
		{ version: 1, ...exportState, identity: {} },
		{
			version: 1,
			...exportState,
			identity: { ...exportIdentity, eventId: "other" },
		},
		{ version: 1, ...exportState, fileId: exportIdentity.sourceId },
		{ version: 1, ...exportState, fileId: "unsafe/value" },
		{ version: 1, ...exportState, pending: undefined },
		{
			version: 1,
			...exportState,
			pending: { ...exportSnapshot, sourceVersion: "" },
		},
		{
			version: 1,
			...exportState,
			pending: { ...exportSnapshot, fingerprint: "unverified" },
		},
		{
			version: 1,
			...exportState,
			pending: { ...exportSnapshot, contract: "unknown" },
		},
		{ version: 1, ...exportState, pending: { ...exportSnapshot, name: "" } },
		{ version: 1, ...exportState, confirmed: false },
	])("requires recovery for malformed or mismatched state %#", (value) => {
		// Arrange
		const codec = new DrivePdfStateCodec(
			new DrivePdfMetadata(),
			new PdfExportPolicy(),
		);

		// Act
		const decode = () => codec.decode(value, exportIdentity);

		// Assert
		expect(decode).toThrow(expect.objectContaining({ code: "recovery" }));
	});
});
