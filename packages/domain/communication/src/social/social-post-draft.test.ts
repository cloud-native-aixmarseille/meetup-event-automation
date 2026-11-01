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
	it.each(["slack", "linkedin"] as const)(
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
				channel === "linkedin"
					? ["@Example Host", "@Example Speaker", "@Example Organizer"]
					: undefined,
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
	it.each([
		["slack", "<!channel>"],
		["slack", "<@U123>"],
		["slack", "<#C123>"],
		["slack", String.fromCharCode(0)],
		["linkedin", "@[Example](urn:li:person:123)"],
	] as const)(
		"rejects unsupported %s text before review",
		(channel, markup) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: [],
			};
			// Act
			const valid = posts.valid(
				source,
				`${markup} ${source.registrationUrl}`,
				channel,
			);
			// Assert
			expect(valid).toBe(false);
		},
	);
	it.each(["slack", "linkedin"] as const)(
		"accepts %s text with the registration link and public mentions",
		(channel) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: [],
			};
			// Act
			const valid = posts.valid(
				source,
				`:rocket: Meet @Example Speaker 🚀 chez @Example Host ${source.registrationUrl}`,
				channel,
			);
			// Assert
			expect(valid).toBe(true);
		},
	);
	it("includes every speaker and organizer once in agenda order", () => {
		// Arrange
		const posts = new SocialPostDraft();
		const source = {
			...facts,
			talks: [
				talk,
				{
					...talk,
					id: "talk-two",
					speakers: [
						...talk.speakers,
						{ id: "speaker-two", name: "Second Speaker" },
					],
				},
			],
			registrationUrl: "https://www.meetup.com/example/events/123/",
			mentions: ["Example Speaker", "@Example Organizer", "Example Organizer"],
		};
		// Act
		const brief = posts.brief(source, "linkedin", "announcement", "fr", "");
		// Assert
		expect(brief.facts.mentions).toEqual([
			"@Example Host",
			"@Example Speaker",
			"@Second Speaker",
			"@Example Organizer",
		]);
	});
	it.each(["@Example Host", "@Example Speaker", "@Example Organizer"])(
		"rejects LinkedIn copy missing the complete %s mention",
		(missing) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: ["Example Organizer"],
			};
			const text = `${source.registrationUrl}\n@Example Host - @Example Speaker - @Example Organizer`;
			// Act
			const absent = posts.valid(
				source,
				text.replace(missing, missing.slice(1)),
				"linkedin",
			);
			const differentName = posts.valid(
				source,
				text.replace(missing, `${missing}son`),
				"linkedin",
			);
			// Assert
			expect(absent).toBe(false);
			expect(differentName).toBe(false);
		},
	);
	it.each(["slack", "linkedin"] as const)(
		"rejects %s copy without the exact Meetup registration URL",
		(channel) => {
			// Arrange
			const posts = new SocialPostDraft();
			const source = {
				...facts,
				registrationUrl: "https://www.meetup.com/example/events/123/",
				mentions: [],
			};
			const mentions = "@Example Host - @Example Speaker";
			const links = [
				"",
				"https://example.test/register",
				`${source.registrationUrl}?tracking=1`,
				`https://example.test/${source.registrationUrl}`,
			];
			// Act
			const results = links.map((url) =>
				posts.valid(source, `${mentions}\nInscription : ${url}`, channel),
			);
			// Assert
			expect(results).toEqual([false, false, false, false]);
		},
	);
});
