import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import { MEETUP_ORIGIN } from "./meetup-url-contracts.js";

export type PublicationUrlConfiguration = Readonly<{
	meetupEventUrlPrefix: string;
	communityEventUrlPrefixes: readonly string[];
	assetFolderUrlPrefix: string;
}>;

export const DEFAULT_PUBLICATION_URL_CONFIGURATION: PublicationUrlConfiguration =
	Object.freeze({
		meetupEventUrlPrefix: `${MEETUP_ORIGIN}/cloud-native-aix-marseille/events/`,
		communityEventUrlPrefixes: Object.freeze([
			"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/",
			"https://community.cncf.io/events/details/cncf-cloud-native-aix-marseille-presents-",
		]),
		assetFolderUrlPrefix: "https://drive.google.com/drive/folders/",
	});

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
