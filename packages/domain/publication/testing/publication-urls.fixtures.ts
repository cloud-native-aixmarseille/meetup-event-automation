import type { PublicationUrlConfiguration } from "../src/domain/url-policy-contracts.js";

export const publicationUrls: PublicationUrlConfiguration = {
	meetupEventUrlPrefix: "https://www.meetup.com/example-meetups/events/",
	communityEventUrlPrefixes: [
		"https://ocgroups.dev/cncf/group/example-meetups/event/",
		"https://community.example.test/events/",
	],
	assetFolderUrlPrefix: "https://assets.example.test/folders/",
};
