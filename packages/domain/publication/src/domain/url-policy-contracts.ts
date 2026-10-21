import type { PublicationEvaluation, PublicationReferences } from "./model.js";

export interface PublicationUrlPolicy {
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
