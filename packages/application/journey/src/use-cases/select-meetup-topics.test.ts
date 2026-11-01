import { MeetupTopicPolicy } from "@meetup-automation/publication";
import { expect, it, vi } from "vitest";
import { SelectMeetupTopics } from "./select-meetup-topics.js";

it("selects relevant available topics from approved event copy", async () => {
	// Arrange
	const generator = {
		provider: "synthetic",
		model: "test",
		supported: () => true,
		generate: vi.fn().mockResolvedValue("Containers\nCloud Computing"),
	};
	const selection = new SelectMeetupTopics(generator, new MeetupTopicPolicy());
	const event = {
		title: "Containers in practice",
		description: "An evening about operating containers.",
	};
	const candidates = ["Gardening", "Cloud Computing", "Containers"];

	// Act
	const selected = await selection.select(event, candidates);

	// Assert
	expect(selected).toEqual(["Containers", "Cloud Computing"]);
	expect(generator.generate).toHaveBeenCalledWith(
		expect.objectContaining({ facts: { ...event, candidates } }),
	);
});

it.each(["unsupported", "empty", "invalid", "failure"])(
	"blocks topic selection when %s",
	async (reason) => {
		// Arrange
		const generator = {
			provider: "synthetic",
			model: "test",
			supported: () => reason !== "unsupported",
			generate: vi.fn().mockResolvedValue("Invented"),
		};
		if (reason === "failure")
			generator.generate.mockRejectedValue(new Error("Provider unavailable"));
		const selection = new SelectMeetupTopics(
			generator,
			new MeetupTopicPolicy(),
		);

		// Act
		const result = selection.select(
			{ title: "Containers", description: "Operating containers" },
			reason === "empty" ? [] : ["Containers"],
		);

		// Assert
		await expect(result).rejects.toThrow();
		if (reason === "empty" || reason === "unsupported")
			expect(generator.generate).not.toHaveBeenCalled();
	},
);
