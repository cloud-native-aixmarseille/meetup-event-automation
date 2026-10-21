import type { PublicationEvaluation, PublicationReferences } from "./model.js";

export type PublicationUrlConfiguration = Readonly<{
	meetupEventUrlPrefix: string;
	communityEventUrlPrefixes: readonly string[];
	assetFolderUrlPrefix: string;
}>;

export interface PublicationUrlPolicy {
	readonly id: string;
	evaluate(references: PublicationReferences): PublicationEvaluation;
}

export type EvaluateLinkInput<P extends keyof PublicationReferences> =
	Readonly<{
		references: PublicationReferences;
		path: P;
		isValid: (value: string) => boolean;
		code: string;
		message: string;
	}>;
