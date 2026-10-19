export interface EventCopyTalk {
	readonly id: string;
	readonly title: string;
	readonly abstract: string;
	readonly speakers: readonly Readonly<{ id: string; name: string }>[];
}
export interface EventCopyDescriptionFacts {
	readonly date: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly timeZone: string;
	readonly host: Readonly<{ name: string; city: string }>;
	readonly talks: readonly EventCopyTalk[];
	readonly aperitif: boolean;
}
