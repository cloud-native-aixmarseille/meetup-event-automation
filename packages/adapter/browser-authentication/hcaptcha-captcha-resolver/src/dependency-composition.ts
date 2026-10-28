import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import type { Page } from "playwright-core";
import { HcaptchaCaptchaResolver } from "./hcaptcha-captcha-resolver.js";
import {
	HcaptchaChallenge,
	type HcaptchaChallengeArguments,
} from "./hcaptcha-challenge.js";
import { HcaptchaChallengeFactory } from "./hcaptcha-challenge-factory.js";
import {
	HcaptchaProcess,
	type HcaptchaProcessArguments,
} from "./hcaptcha-process.js";
import { HcaptchaProcessFactory } from "./hcaptcha-process-factory.js";

/** Assembles the provider adapter and shares its bounded attempt across sessions. */
export class HcaptchaCaptchaResolverComposition {
	captchaResolverFactory(
		directory: string,
		apiKey: string,
		model: string,
	): (page: Page, endpoint: string) => CaptchaResolver {
		const challenge = this.hcaptchaChallengeFactory().create(
			directory,
			apiKey,
			model,
		);
		return (page, endpoint) =>
			new HcaptchaCaptchaResolver(
				{ solve: (page) => challenge.solve(page, endpoint) },
				page,
			);
	}

	hcaptchaChallenge(...args: HcaptchaChallengeArguments): HcaptchaChallenge {
		return new HcaptchaChallenge(...args);
	}

	hcaptchaChallengeFactory(): HcaptchaChallengeFactory {
		return new HcaptchaChallengeFactory({
			hcaptchaProcessFactory: this.hcaptchaProcessFactory(),
			createHcaptchaChallenge: (...args) => this.hcaptchaChallenge(...args),
		});
	}
	hcaptchaProcess(...args: HcaptchaProcessArguments): HcaptchaProcess {
		return new HcaptchaProcess(...args);
	}
	hcaptchaProcessFactory(): HcaptchaProcessFactory {
		return new HcaptchaProcessFactory({
			createHcaptchaProcess: (...args) => this.hcaptchaProcess(...args),
		});
	}
}
