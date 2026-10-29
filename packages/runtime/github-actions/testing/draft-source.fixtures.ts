import { vi } from "vitest";
import type { ContentConfiguration } from "../src/content-configuration.js";
import { DraftSourceInput } from "../src/draft-source-input.js";
import type { EventPublicationConfiguration } from "../src/event-publication-configuration.js";
import { RuntimeInput } from "../src/runtime-input.js";
import type { SocialPublicationConfiguration } from "../src/social-publication-configuration.js";

export const draftInputs: Readonly<Record<string, string>> = {
	"issue-number": "42",
	"github-token": "synthetic-token",
	"managed-comment-author": "organizer[bot]",
	"slack-token": "synthetic-slack-token",
	"slack-organizer-channel-id": "CORGANIZERS",
};

export function draftSourceFixture() {
	const configuration = {
		load: vi.fn<ContentConfiguration["load"]>().mockResolvedValue({
			months: {},
			mentions: [],
			reminderTime: "09:00",
			guidance: "",
			announcements: {},
		}),
	};
	const publication = {
		load: vi.fn<EventPublicationConfiguration["load"]>().mockResolvedValue({
			schedule: { startTime: "18:45", endTime: "22:00", venues: {} },
			destinations: [],
		}),
	};
	const social = {
		load: vi
			.fn<SocialPublicationConfiguration["load"]>()
			.mockResolvedValue({ destinations: [] }),
	};
	const source = new DraftSourceInput(
		new RuntimeInput(),
		{
			readMeetupEventUrlPrefix: () => "https://www.meetup.com/example/events/",
			readCommunityEventUrlPrefixes: () => [
				"https://community.example.org/events/",
			],
			readAssetFolderUrlPrefix: () => "https://drive.google.com/drive/folders/",
		},
		{
			read: () => ({
				conferenceHallEvent: "synthetic-event",
				conferenceHallApiKey: "synthetic-key",
			}),
		},
		configuration,
		publication,
		social,
	);
	return { source, configuration, publication, social };
}
