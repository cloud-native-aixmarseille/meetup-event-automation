/** Internal organizer-page result, normalized by the gateway at the port boundary. */
export type SavedMeetupEvent = Readonly<{
	url: string;
	status: "draft" | "published";
}>;
