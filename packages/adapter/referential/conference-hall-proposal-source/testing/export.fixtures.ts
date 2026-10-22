export const speaker = {
	id: "source-speaker",
	name: "Example Speaker",
	email: "private@example.test",
	company: "Example",
	picture: "https://example.test/portrait.png",
	bio: "Unused biography",
	location: "PRIVATE LOCATION",
	survey: ["PRIVATE SURVEY"],
};
export const proposal = {
	id: "proposal-one",
	title: "Reliable systems",
	abstract: "An abstract",
	deliberationStatus: "ACCEPTED",
	confirmationStatus: "CONFIRMED",
	languages: ["en"],
	formats: ["Talk"],
	speakers: [speaker],
	review: "PRIVATE REVIEW",
};
export const sourceExport = { name: "Example CFP", proposals: [proposal] };
