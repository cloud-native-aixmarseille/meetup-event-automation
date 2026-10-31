import { expect, it } from "vitest";
import { MeetupTopicPolicy } from "./meetup-topic-policy.js";

it("accepts ranked provider topics and excludes unrelated event fields from the brief", () => {
	// Arrange
	const policy = new MeetupTopicPolicy();
	const candidates = ["Gardening", "Containers", "Cloud Computing"];
	const event = {
		title: "Practical containers",
		description: "Shipping workloads together.",
		privateEmail: "private@example.test",
	};

	// Act
	const selected = policy.selection("Containers\nCloud Computing", candidates);
	const brief = policy.brief(event, candidates);

	// Assert
	expect(selected).toEqual(["Containers", "Cloud Computing"]);
	expect(brief.facts).toEqual({
		title: event.title,
		description: event.description,
		candidates,
	});
});

it.each([
	"",
	"Invented topic",
	"Containers\nContainers",
	"1. Containers",
	"A\nB\nC\nD\nE\nF",
])("rejects an invalid topic selection %j", (text) => {
	// Arrange
	const policy = new MeetupTopicPolicy();
	const candidates = ["Containers", "A", "B", "C", "D", "E", "F"];

	// Act
	const selected = policy.selection(text, candidates);

	// Assert
	expect(selected).toBeUndefined();
});
