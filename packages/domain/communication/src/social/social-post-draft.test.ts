import { describe, expect, it } from "vitest";
import { SocialPostDraft } from "./social-post-draft.js";

const talk = {
	id: "talk-one",
	title: "Observable clusters",
	abstract: "Telemetry for clusters.",
	speakers: [{ id: "speaker-one", name: "Example Speaker" }],
};
const facts = {
	date: "2026-10-28",
	startTime: "18:45",
	endTime: "21:00",
	timeZone: "Europe/Paris",
	host: { name: "Example Host", city: "Example City" },
	talks: [talk],
	aperitif: false,
};
describe("social post brief", () => {
	it.each(["slack-aix", "slack-openbar", "linkedin"] as const)(
		"uses the %s channel format and canonical registration link",
		(channel) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: ["Example Organizer"],
				privateEmail: "private@example.test",
			};
			// Act
			const brief = posts.brief(source, channel, "announcement", "fr", "");
			// Assert
			expect(brief.instructions.join(" ")).toContain(
				channel === "linkedin" ? "Unicode emoji" : "Slack emoji aliases",
			);
			expect(brief.facts.registrationUrl).toBe(source.registrationUrl);
			expect(brief.facts.aperitif).toBe(false);
			expect(brief.instructions.join(" ")).toContain("only when aperitif=true");
			expect(brief.facts).not.toHaveProperty("privateEmail");
			expect(brief.facts.mentions).toEqual(
				channel === "linkedin" ? source.mentions : undefined,
			);
		},
	);
	it.each([
		["d7", "Dans une semaine :"],
		["d0", "C'est aujourd'hui :"],
	] as const)(
		"keeps the %s reminder short with explicit event details",
		(milestone, opening) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: [],
			};
			// Act
			const brief = posts.brief(source, "linkedin", milestone, "fr", "");
			// Assert
			expect(brief.instructions.join(" ")).toContain(opening);
			expect(brief.instructions.join(" ")).toContain(
				"without detailed teasers",
			);
			expect(brief.facts.date).toBe(source.date);
			expect(brief.facts.startTime).toBe(source.startTime);
		},
	);
});
