import { describe, expect, it } from "vitest";
import { AutomationStateCodec } from "./automation-state-codec.js";

describe("automation state envelope", () => {
	it("starts accounting without changing existing records when no budget has been stored", () => {
		// Arrange
		const codec = new AutomationStateCodec();
		const content = ["<!-- meetup-content-proposal:v1 {} -->"];
		const records = { content, social: [], meetup: [], community: [] };
		const body = `<!-- meetup-automation-state:v1 ${JSON.stringify({ version: 1, records, imports: [] })} -->\n\nState`;
		// Act
		const state = codec.read(body);
		// Assert
		expect(state.records).toEqual({ ...records, attention: [] });
	});
	it("rejects a corrupted budget instead of resetting its accounting", () => {
		// Arrange
		const codec = new AutomationStateCodec();
		const state = {
			...codec.empty(),
			records: { ...codec.empty().records, attention: null },
		};
		const body = `<!-- meetup-automation-state:v1 ${JSON.stringify(state)} -->\n\nState`;
		// Act
		const read = () => codec.read(body);
		// Assert
		expect(read).toThrow("Invalid automation state records");
	});
	it.each(["-->", "--!>"])(
		"preserves embedded records containing %s without terminating the marker",
		(ending) => {
			// Arrange
			const codec = new AutomationStateCodec();
			const record = `<!-- meetup-content-proposal:v1 ${JSON.stringify({ text: `</script> & ${ending}` })} -->`;
			const state = {
				...codec.empty(),
				records: { ...codec.empty().records, content: [record] },
			};
			// Act
			const body = `${codec.write(state)}\n\nAutomation`;
			const decoded = codec.read(body);
			// Assert
			expect(decoded).toEqual(state);
			expect(body.match(/--!?>/g)).toEqual(["-->"]);
			expect(body).not.toContain("</script>");
		},
	);
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
