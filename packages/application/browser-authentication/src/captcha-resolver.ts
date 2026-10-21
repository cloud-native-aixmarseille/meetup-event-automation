/** Whether CAPTCHA verification currently blocks the bound authentication session. */
export type CaptchaStatus = "clear" | "required";

/** A session-bound capability; provider, browser SDK, and credentials stay in adapters. */
export interface CaptchaResolver {
	/** Read the current state without starting a resolution attempt. */
	inspect(): Promise<CaptchaStatus>;
	/** Attempt supported verification and verify the result; unresolved challenges remain required. */
	resolve(): Promise<CaptchaStatus>;
}
