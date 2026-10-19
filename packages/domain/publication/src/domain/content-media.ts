export interface ContentMedia {
	readonly source?: Readonly<{ id: string; revision: string }>;
	readonly id: string;
	readonly url: string;
	readonly fingerprint: string;
	readonly description: string;
	readonly mimeType: "image/png" | "image/jpeg";
	readonly width: number;
	readonly height: number;
	readonly sourceRevision: string;
}
