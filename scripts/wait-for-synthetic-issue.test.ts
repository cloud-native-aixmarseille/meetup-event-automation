import { describe, expect, it, vi } from "vitest";
import { waitForSyntheticIssue } from "./wait-for-synthetic-issue.mjs";

function fixture() {
	const listForRepo = vi.fn();
	const wait = vi.fn().mockResolvedValue(undefined);
	const issue = { number: 42, state: "open" };
	return {
		issue,
		listForRepo,
		wait,
		options: {
			github: { rest: { issues: { listForRepo } } },
			owner: "example-community",
			repo: "automation",
			issueNumber: issue.number,
			wait,
		},
	};
}

describe("waitForSyntheticIssue", () => {
	it("accepts an immediately visible fixture without waiting", async () => {
		// Arrange
		const f = fixture();
		f.listForRepo.mockResolvedValue({ data: [f.issue] });

		// Act
		await waitForSyntheticIssue(f.options);

		// Assert
		expect(f.listForRepo).toHaveBeenCalledExactlyOnceWith({
			owner: "example-community",
			repo: "automation",
			state: "open",
			labels: "meetup",
			page: 1,
			per_page: 100,
		});
		expect(f.wait).not.toHaveBeenCalled();
	});

	it("waits between checks until the created issue is listed", async () => {
		// Arrange
		const f = fixture();
		f.listForRepo
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: [f.issue] });

		// Act
		await waitForSyntheticIssue(f.options);

		// Assert
		expect(f.listForRepo).toHaveBeenCalledTimes(3);
		expect(f.wait.mock.calls).toEqual([[2000], [2000]]);
		expect(f.listForRepo.mock.invocationCallOrder[0]).toBeLessThan(
			f.wait.mock.invocationCallOrder[0] ?? 0,
		);
		expect(f.wait.mock.invocationCallOrder[0]).toBeLessThan(
			f.listForRepo.mock.invocationCallOrder[1] ?? 0,
		);
	});

	it.each([
		{ number: 43, state: "open" },
		{ number: 42, state: "closed" },
		{ number: 42, state: "open", pull_request: {} },
	])("ignores entries that are not the active fixture: %j", async (entry) => {
		// Arrange
		const f = fixture();
		f.listForRepo
			.mockResolvedValueOnce({ data: [entry] })
			.mockResolvedValueOnce({ data: [f.issue] });

		// Act
		await waitForSyntheticIssue(f.options);

		// Assert
		expect(f.listForRepo).toHaveBeenCalledTimes(2);
		expect(f.wait).toHaveBeenCalledExactlyOnceWith(2000);
	});

	it("fails after bounded checks without waiting after the last response", async () => {
		// Arrange
		const f = fixture();
		f.listForRepo.mockResolvedValue({ data: [] });

		// Act
		const operation = waitForSyntheticIssue(f.options);

		// Assert
		await expect(operation).rejects.toThrow(
			"Synthetic meetup issue did not become visible in the active issue listing",
		);
		expect(f.listForRepo).toHaveBeenCalledTimes(31);
		expect(f.wait).toHaveBeenCalledTimes(30);
		expect(
			f.wait.mock.calls.flat().reduce((sum, delay) => sum + delay, 0),
		).toBe(60_000);
		expect(f.wait.mock.invocationCallOrder.at(-1)).toBeLessThan(
			f.listForRepo.mock.invocationCallOrder.at(-1) ?? 0,
		);
	});

	it("propagates API failures without retrying them", async () => {
		// Arrange
		const f = fixture();
		const failure = new Error("Synthetic API failure");
		f.listForRepo.mockRejectedValue(failure);

		// Act
		const operation = waitForSyntheticIssue(f.options);

		// Assert
		await expect(operation).rejects.toBe(failure);
		expect(f.listForRepo).toHaveBeenCalledOnce();
		expect(f.wait).not.toHaveBeenCalled();
	});
});
