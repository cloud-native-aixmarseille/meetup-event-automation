import type { CheckOptions } from "archunit";
import "vitest";

declare module "vitest" {
	interface Matchers<R, T = unknown> {
		toPassAsync(options?: CheckOptions): Promise<void>;
	}
}
