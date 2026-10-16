export interface FeedbackTalk {
	readonly title: string;
	readonly sourceIdentity?: string;
	readonly speakers: readonly { readonly id: string; readonly name: string }[];
}

export interface FeedbackAgenda {
	readonly talks: readonly FeedbackTalk[];
}
