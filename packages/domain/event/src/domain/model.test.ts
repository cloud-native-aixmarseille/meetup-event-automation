import { describe, expect, it } from "vitest";
import {
	EXPECTED_POST_EVENT_TASK_NAMES,
	MeetupEventOperations,
} from "./model.js";

describe("post-event checklist completion", () => {
	const completedExpectedTasks = EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
		name,
		completed: true,
	}));

	it("requires every expected named task to be completed", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = MeetupEventOperations.postEventChecklistIsComplete(
			completedExpectedTasks,
		);
		const actual1 = MeetupEventOperations.postEventChecklistIsComplete(
			[...completedExpectedTasks].reverse(),
		);

		// Assert
		expect(actual).toBe(true);
		expect(actual1).toBe(true);
	});

	it.each([
		{
			name: "an all-checked subset",
			items: completedExpectedTasks.slice(0, 2),
		},
		{
			name: "an unchecked expected task",
			items: completedExpectedTasks.map((item, index) =>
				index === 2 ? { ...item, completed: false } : item,
			),
		},
		{
			name: "a duplicate replacing an expected task",
			items: [
				...completedExpectedTasks.slice(0, -1),
				completedExpectedTasks[0],
			],
		},
		{
			name: "an additional unknown task",
			items: [
				...completedExpectedTasks,
				{ name: "Unexpected task", completed: true },
			],
		},
	])("rejects $name", ({ items }) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = MeetupEventOperations.postEventChecklistIsComplete(items);

		// Assert
		expect(actual).toBe(false);
	});
});
