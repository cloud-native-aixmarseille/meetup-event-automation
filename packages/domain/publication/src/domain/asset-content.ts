export const TEXT_TOKENS = [
	"event.title",
	"event.date",
	"event.date.month",
	"event.date.numeric",
	"event.date.weekday",
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
export type TextToken = (typeof TEXT_TOKENS)[number] | SlottedTextToken;
export type TextKey =
	| (typeof TEXT_TOKENS)[number]
	| `${SlottedTextToken}:${string}`;
export type ImageSource = Readonly<{ url: string; description: string }>;
export type TextField = Readonly<{
	type: "text";
	token: TextToken;
	slot?: string;
	required: boolean;
	fallback?: string;
}>;
export type ImageField = Readonly<{
	type: "image";
	token: "speaker.picture";
	slot: string;
	objectId: string;
	pageId?: string;
	tabId?: string;
	required: boolean;
	fallback?: ImageSource;
	fit: "CENTER_CROP" | "CENTER_INSIDE";
}>;
export type ContentContract = Readonly<{
	version: 1;
	revision: string;
	kind: string;
	fields: readonly (TextField | ImageField)[];
}>;
export type PublicAssetModel = Readonly<{
	text: Readonly<Partial<Record<TextKey, string>>>;
	pictures: Readonly<Record<string, ImageSource & { speakerId: string }>>;
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
	type: "text" | "image";
	key: string;
	anchor: ContentAnchor;
	applied: string;
	desired?: string;
	speakerId?: string;
	fallback?: boolean;
}>;
export type ObservedLocation = Readonly<{
	id: string;
	type: "text" | "image";
	key: string;
	anchor: ContentAnchor;
	fingerprint: string;
}>;
export type ContentSnapshot = Readonly<{
	revision: string;
	locations: readonly ObservedLocation[];
}>;
export type ContentValue = Readonly<{
	type: "text" | "image";
	key: string;
	fingerprint: string;
	text?: string;
	image?: ImageSource;
	speakerId?: string;
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
