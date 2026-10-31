export const TEXT_TOKENS = [
	"event.title",
	"event.date",
	"event.date.month",
	"event.date.numeric",
	"event.date.weekday",
	"event.start_time",
	"host.name",
	"host.address",
	"host.postal_code",
	"host.city",
	"agenda",
	"event.feedback_url",
	"next_event.date",
	"next_event.date.numeric",
	"next_event.host.name",
	"next_event.host.city",
] as const;
export const SLOTTED_TEXT_TOKENS = [
	"talk.title",
	"talk.abstract",
	"talk.speakers",
	"speaker.name",
] as const;
export type SlottedTextToken = (typeof SLOTTED_TEXT_TOKENS)[number];
export type DateTextToken = "event.date" | "next_event.date";
export type TextToken = (typeof TEXT_TOKENS)[number] | SlottedTextToken;
export type TextKey =
	| (typeof TEXT_TOKENS)[number]
	| `${DateTextToken}:format:${string}`
	| `${SlottedTextToken}:${string}`;
export type ImageSource = Readonly<{ url: string; description: string }>;
export type TextField = Readonly<{
	type: "text";
	token: TextToken;
	slot?: string;
	format?: string;
	required: boolean;
	fallback?: string;
}>;
export type ImageField = Readonly<{
	type: "image";
	token: "speaker.picture" | "host.logo" | "event.cover";
	slot: string;
	sourceSlot?: string;
	objectId: string;
	pageId?: string;
	tabId?: string;
	required: boolean;
	fallback?: ImageSource;
	fit: "CENTER_CROP" | "CENTER_INSIDE";
}>;
export type TemplateContentDefaults = Readonly<{
	missingNextEvent: string;
	missingAbstract: string;
	speaker: ImageSource;
	host: ImageSource;
}>;
/** One native container, repeated in agenda order and owned as a single binding. */
export type CollectionField = Readonly<{
	type: "collection";
	token: "talks" | "speakers";
	slot: string;
	objectId: string;
	pageId: string;
	template: string;
	fields: readonly (TextField | ImageField)[];
}>;
export type ContentField = TextField | ImageField | CollectionField;
export type ContentContract = Readonly<{
	version: 1;
	revision: string;
	kind: string;
	fields: readonly ContentField[];
}>;
export type PublicAssetModel = Readonly<{
	text: Readonly<Partial<Record<TextKey, string>>>;
	dates?: Readonly<Partial<Record<DateTextToken, string>>>;
	pictures: Readonly<Record<string, ImageSource & { speakerId: string }>>;
	hostLogo?: ImageSource & { hostId: string };
	cover?: import("./content-media.js").ContentMedia;
}>;
export type ContentAnchor = Readonly<{
	objectId?: string;
	pageId?: string;
	tabId?: string;
	segmentId?: string;
	rangeName?: string;
	start?: number;
	end?: number;
}>;
export type ContentBinding = Readonly<{
	id: string;
	type: "text" | "image" | "collection";
	key: string;
	anchor: ContentAnchor;
	applied: string;
	desired?: string;
	speakerId?: string;
	hostId?: string;
	fallback?: boolean;
}>;
export type ObservedLocation = Readonly<{
	id: string;
	type: "text" | "image" | "collection";
	key: string;
	anchor: ContentAnchor;
	fingerprint: string;
}>;
export type ContentSnapshot = Readonly<{
	revision: string;
	locations: readonly ObservedLocation[];
}>;
export type ContentValue = Readonly<{
	type: "text" | "image" | "collection";
	key: string;
	fingerprint: string;
	text?: string;
	collection?: Readonly<{
		template: string;
		items: readonly (readonly ContentValue[])[];
	}>;
	image?: ImageSource;
	speakerId?: string;
	hostId?: string;
	fallback?: boolean;
	fit?: "CENTER_CROP" | "CENTER_INSIDE";
}>;
export type ContentChange = Readonly<{
	location: ObservedLocation;
	value: ContentValue;
}>;
export type ContentManifest = Readonly<{
	version: 1;
	fileId: string;
	templateId: string;
	mimeType: string;
	contract: ContentContract;
	bindings: readonly ContentBinding[];
	initialRevision?: string;
	recoveryId?: string;
	pending?: Readonly<{
		revision: string;
		bindings: readonly ContentBinding[];
	}>;
}>;
export type ContentStatus =
	| "copy-only"
	| "ready"
	| "pending"
	| "conflict"
	| "recovery-required";
export type ContentRecovery = Readonly<{
	operation: "restore" | "remove" | "enroll";
	revision: string;
	bindingId?: string;
}>;
