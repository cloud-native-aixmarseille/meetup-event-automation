import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationRuntimeAction } from "./publication-runtime-action.js";

export class PublicationRuntimeActionComposition {
	action(): PublicationRuntimeAction {
		return new PublicationRuntimeAction(
			new GithubActionsComposition().eventPublicationConfiguration(),
		);
	}
}
