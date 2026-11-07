import { describe, expect, it } from "vitest";
import { AttentionBudgetRecord } from "./attention-budget-record.js";
import { AttentionRecordFields } from "./attention-record-fields.js";

describe("attention budget metadata", () => {
	it("roundtrips every delivery status without storing notification text", () => {
		// Arrange
		const codec = new AttentionBudgetRecord(new AttentionRecordFields());
		const record = {
			channel: "C123",
			slots: ["pending", "accepted", "retry"].map((status, index) => ({
				key: `${index + 1}:attention:100:100`,
				day: 100,
				status,
			})),
		};
		const body = `<!-- meetup-attention-budget:v1 ${JSON.stringify(record)} -->`;
		// Act
		const decoded = codec.read(body);
		const encoded = codec.write(decoded);
		// Assert
		expect(decoded).toEqual(record);
		expect(encoded).toBe(body);
	});
	it.each([
		{ channel: "invalid", slots: [] },
		{
			channel: "C123",
			slots: [{ key: "unsafe", day: 100, status: "pending" }],
		},
		{
			channel: "C123",
			slots: [{ key: "42:attention:100:100", day: "100", status: "pending" }],
		},
		{
			channel: "C123",
			slots: [{ key: "42:attention:100:100", day: 100, status: "unknown" }],
		},
		{
			channel: "C123",
			slots: Array(2).fill({
				key: "42:attention:100:100",
				day: 100,
				status: "pending",
			}),
		},
	])("rejects malformed state %j", (record) => {
		// Arrange
		const codec = new AttentionBudgetRecord(new AttentionRecordFields());
		// Act
		const read = () =>
			codec.read(
				`<!-- meetup-attention-budget:v1 ${JSON.stringify(record)} -->`,
			);
		// Assert
		expect(read).toThrow();
	});
});
