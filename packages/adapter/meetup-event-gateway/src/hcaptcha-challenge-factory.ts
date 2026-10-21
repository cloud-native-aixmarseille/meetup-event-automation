import type {
	HcaptchaChallenge,
	HcaptchaChallengeArguments,
} from "./hcaptcha-challenge.js";
import type { HcaptchaProcessFactory } from "./hcaptcha-process-factory.js";

export interface HcaptchaChallengeFactoryCollaborators {
	readonly hcaptchaProcessFactory: Pick<HcaptchaProcessFactory, "create">;
	readonly createHcaptchaChallenge: (
		...args: HcaptchaChallengeArguments
	) => HcaptchaChallenge;
}

export class HcaptchaChallengeFactory {
	constructor(
		private readonly collaborators: HcaptchaChallengeFactoryCollaborators,
	) {}

	create(directory: string, apiKey: string, model: string): HcaptchaChallenge {
		return this.collaborators.createHcaptchaChallenge(
			this.collaborators.hcaptchaProcessFactory.create(directory),
			apiKey,
			model,
		);
	}
}
