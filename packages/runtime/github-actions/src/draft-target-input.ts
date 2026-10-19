import * as core from "@actions/core";
import type { ContentTarget } from "@meetup-automation/journey";
export class DraftTargetInput {
	constructor(private readonly targets: readonly ContentTarget[]) {}
	read(): ContentTarget {
		const value = core.getInput("target", { required: true });
		const target = this.targets.find((item) => item === value);
		if (!target) throw new Error("Unsupported draft target for this action");
		return target;
	}
}
