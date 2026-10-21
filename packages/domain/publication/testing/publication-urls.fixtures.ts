import { PublicationDomainComposition } from "../src/dependency-composition.js";

export function createPublicationUrlPolicies() {
	const composition = new PublicationDomainComposition();
	return [
		composition.meetupEventUrlPolicy(
			"https://www.meetup.com/example-meetups/events/",
		),
		composition.communityEventUrlPolicy([
			"https://ocgroups.dev/cncf/group/example-meetups/event/",
			"https://community.example.test/events/",
		]),
		composition.assetFolderUrlPolicy("https://assets.example.test/folders/"),
	];
}
