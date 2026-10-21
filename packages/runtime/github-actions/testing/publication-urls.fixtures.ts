export const eventPublicationSettings = {
	meetupEventUrlPrefix: "https://www.meetup.com/example-meetups/events/",
	communityEventUrlPrefixes: [
		"https://ocgroups.dev/cncf/group/example-meetups/event/",
	],
	assetFolderUrlPrefix: "https://drive.google.com/drive/folders/",
};

export const publicationUrlInputs = {
	"meetup-event-url-prefix": eventPublicationSettings.meetupEventUrlPrefix,
	"community-event-url-prefixes": JSON.stringify(
		eventPublicationSettings.communityEventUrlPrefixes,
	),
	"asset-folder-url-prefix": eventPublicationSettings.assetFolderUrlPrefix,
};

export const publicationLinks = {
	meetup: `${eventPublicationSettings.meetupEventUrlPrefix}123/`,
	community: `${eventPublicationSettings.communityEventUrlPrefixes[0]}platform-evening`,
	assets: `${eventPublicationSettings.assetFolderUrlPrefix}public-assets`,
	feedback: "https://openfeedback.io/public-event",
};
