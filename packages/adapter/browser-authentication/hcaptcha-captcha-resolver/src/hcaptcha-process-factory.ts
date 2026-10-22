import { spawn } from "node:child_process";
import type {
	HcaptchaProcess,
	HcaptchaProcessArguments,
} from "./hcaptcha-process.js";

export interface HcaptchaProcessFactoryCollaborators {
	readonly createHcaptchaProcess: (
		...args: HcaptchaProcessArguments
	) => HcaptchaProcess;
}

export class HcaptchaProcessFactory {
	constructor(
		private readonly collaborators: HcaptchaProcessFactoryCollaborators,
	) {}

	create(directory: string): HcaptchaProcess {
		return this.collaborators.createHcaptchaProcess(directory, spawn);
	}
}
