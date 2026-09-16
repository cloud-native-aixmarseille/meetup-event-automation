import * as core from "@actions/core";
import { RuntimeInput } from "./runtime-input.js";
export class ActionRunner {
	static async run(operation: () => Promise<void>): Promise<void> {
		try {
			await operation();
		} catch (error) {
			core.setFailed(RuntimeInput.publicErrorMessage(error));
		}
	}
}
