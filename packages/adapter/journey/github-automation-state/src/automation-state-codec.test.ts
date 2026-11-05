import { describe, expect, it } from "vitest";
import { AutomationStateCodec } from "./automation-state-codec.js";

describe("automation state envelope", () => {
	it("preserves embedded records without exposing their HTML or terminating the marker", () => {
		// Arrange
		const codec = new AutomationStateCodec();
		const record =
			'<!-- meetup-content-proposal:v1 {"text":"</script> & -->"} -->';
		const state = {
			...codec.empty(),
			records: { ...codec.empty().records, content: [record] },
		};
		// Act
		const body = `${codec.write(state)}\n\nAutomation`;
		const decoded = codec.read(body);
		// Assert
		expect(decoded).toEqual(state);
		expect(body.match(/-->/g)).toHaveLength(1);
		expect(body).not.toContain("</script>");
	});
	it.each([
		{ version: 2, records: {}, imports: [] },
		{
			version: 1,
			records: {
				content: [],
				social: [],
				meetup: [],
				community: [],
				unknown: [],
			},
			imports: [],
		},
		{
			version: 1,
			records: { content: [], social: [], meetup: [], community: 1 },
			imports: [],
		},
		{
			version: 1,
			records: {
				content: ["not a record"],
				social: [],
				meetup: [],
				community: [],
			},
			imports: [],
		},
		{
			version: 1,
			records: { content: [], social: [], meetup: [], community: [] },
			imports: [{ id: 1, digest: "invalid" }],
		},
	])("rejects unsupported or malformed state %#", (value) => {
		// Arrange
		const codec = new AutomationStateCodec();
		const body = `<!-- meetup-automation-state:v1 ${JSON.stringify(value)} -->\n\nAutomation`;
		// Act
		const read = () => codec.read(body);
		// Assert
		expect(read).toThrow();
	});
});
