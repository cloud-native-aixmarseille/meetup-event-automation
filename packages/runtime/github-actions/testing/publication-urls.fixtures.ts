import type { PublicationUrlConfiguration } from "@meetup-automation/publication";

export const publicationUrls: PublicationUrlConfiguration = {
	meetupEventUrlPrefix: "https://www.meetup.com/example-meetups/events/",
	communityEventUrlPrefixes: [
		"https://ocgroups.dev/cncf/group/example-meetups/event/",
	],
	assetFolderUrlPrefix: "https://drive.google.com/drive/folders/",
};

export const publicationUrlInputs = {
	"meetup-event-url-prefix": publicationUrls.meetupEventUrlPrefix,
	"community-event-url-prefixes": JSON.stringify(
		publicationUrls.communityEventUrlPrefixes,
	),
	"asset-folder-url-prefix": publicationUrls.assetFolderUrlPrefix,
};

export const publicationLinks = {
	meetup: `${publicationUrls.meetupEventUrlPrefix}123/`,
	community: `${publicationUrls.communityEventUrlPrefixes[0]}platform-evening`,
	assets: `${publicationUrls.assetFolderUrlPrefix}public-assets`,
	feedback: "https://openfeedback.io/public-event",
};
