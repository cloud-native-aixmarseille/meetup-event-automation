import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationRuntimeAction } from "./publication-runtime-action.js";

export class PublicationRuntimeActionComposition {
	action(bundleUrl: string): PublicationRuntimeAction {
		return new PublicationRuntimeAction(
			new GithubActionsComposition().eventPublicationConfiguration(),
			resolve(fileURLToPath(new URL("../../../../", bundleUrl))),
		);
	}
}
