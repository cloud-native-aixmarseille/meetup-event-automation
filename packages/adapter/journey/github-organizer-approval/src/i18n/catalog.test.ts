import { describe, expect, it } from "vitest";
import { inspectCatalog } from "../../../../../presentation/localization/testing/catalog-contract.js";
import { CATALOGS } from "./catalog.js";
import type { MessageParameters } from "./message-parameters.js";

const parameters = {
	"approval.content.image-label": { index: 1 },
	"approval.social.after-approval": {},
	"approval.social.details": {
		target: "announcement",
		destination: "Community",
		identity: "T123/C123",
		plannedAt: "2099-06-01T10:00:00Z",
		expiresAt: "2099-06-08T17:00:00Z",
	},
	"approval.social.request": { approveMark: " ", rejectMark: " " },
	"approval.social.evidence": {
		outcome: "not_published",
		reference: "Verified provider history",
	},
	"approval.social.recovery": {
		approveMark: " ",
		rejectMark: " ",
		outcome: "not_published",
	},
	"approval.social.final": {
		status: "approved",
		actor: "organizer",
		decidedAt: "2099-06-01T10:00:00Z",
	},
	"approval.community.details": {
		title: "Example",
		date: "2099-06-08",
		startTime: "18:45",
		endTime: "20:45",
		timeZone: "Europe/Paris",
		venue: "Example Venue",
		city: "Marseille",
		url: "https://www.meetup.com/example/events/123/",
	},
	"approval.community.request": { approveMark: " ", rejectMark: " " },
	"approval.community.final": {
		status: "approved",
		actor: "organizer",
		decidedAt: "2099-06-01T10:00:00Z",
	},

	"approval.content.planned": { time: "2026-10-21T07:00:00Z" },
	"approval.content.slot": { index: 1, status: "reserved" },
	"approval.content.title": {
		target: "title",
	},
	"approval.content.request": {
		target: "title",
		approve: "Approve",
		rejectMark: " ",
		iterateMark: " ",
	},
	"approval.content.text-choice": { mark: " " },
	"approval.content.image-choice": { mark: " ", index: 1 },
	"approval.content.final": {
		status: "iteration-requested",
		actor: "organizer",
		decidedAt: "2099-06-01T10:00:00Z",
		image: 0,
	},
	"approval.meetup.details": {
		title: "Example",
		date: "2099-06-08",
		startTime: "18:45",
		endTime: "20:45",
		timeZone: "Europe/Paris",
		venue: "Example Venue",
		city: "Marseille",
		url: "https://www.meetup.com/example/events/123/",
	},
	"approval.meetup.request": { approveMark: " ", rejectMark: " " },
	"approval.meetup.final": {
		status: "approved",
		actor: "organizer",
		decidedAt: "2099-06-01T10:00:00Z",
	},
	"follow-up.title": { date: "2099-06-08" },
	"follow-up.instructions": {},
	"follow-up.task": { task: "thank_host" },
	"follow-up.stopped": {},
	"follow-up.waiting": {},
	"follow-up.emails-complete": {},
	"approval.details.summary": {},
	"approval.details.email": { kind: "speaker_thanks" },
	"approval.details.purpose": { kind: "speaker_thanks" },
	"approval.details.link": { kind: "slides" },
	"approval.details.feedback": { title: "Reliable platforms" },
	"approval.details.omitted-emails": { count: 2 },
	"approval.details.omitted-links": { count: 2 },
	"approval.final": {
		kind: "introduction",
		date: "2099-06-08",
		count: 2,
		status: "approved",
		actor: "organizer",
		decidedAt: "2099-06-01T10:00:00Z",
	},
	"approval.request": {
		kind: "introduction",
		date: "2099-06-08",
		count: 2,
		approveMark: " ",
		rejectMark: " ",
	},
} satisfies { [Key in keyof MessageParameters]: MessageParameters[Key] };
describe("owned message catalogs", () => {
	it.each(["en", "fr"] as const)(
		"has complete, valid ICU messages and declared parameters for %s",
		(locale) => {
			// Arrange
			const catalog = CATALOGS[locale];

			// Act
			const inspected = inspectCatalog(CATALOGS, locale, parameters);

			// Assert
			expect(Object.keys(catalog).sort()).toEqual(
				Object.keys(CATALOGS.en).sort(),
			);
			for (const item of inspected) {
				expect(item.text, item.id).toBeTypeOf("string");
				expect(item.text, item.id).not.toBe("");
				expect(item.actual, item.id).toEqual(item.expected);
			}
		},
	);
});
