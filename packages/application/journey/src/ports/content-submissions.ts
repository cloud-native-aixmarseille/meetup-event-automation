import type {
	ContentLanguage,
	ContentTarget,
} from "../proposals/promotional-content.js";

export interface ContentSubmission {
	readonly id: string;
	readonly actor: string;
	readonly target: ContentTarget;
	readonly language: ContentLanguage;
	readonly text: string;
	readonly image: Readonly<{ url: string; description: string }> | null;
}
export interface ContentSubmissions {
	read(): Promise<readonly ContentSubmission[]>;
	verify(submission: ContentSubmission): Promise<boolean>;
}
