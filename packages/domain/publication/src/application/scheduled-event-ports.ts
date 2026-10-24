export type ScheduledEvent = Readonly<{
	title: string;
	description: string;
	date: string;
	startTime: string;
	endTime: string;
	timeZone: string;
	venue: Readonly<{ name: string; city: string }>;
}>;
