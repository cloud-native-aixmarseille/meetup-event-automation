import type { ContentRecovery } from "./asset-content.js";
import { ContentFingerprint } from "./content-fingerprint.js";

/** Persisted recovery identity uses only the operation, revision and optional binding. */
export class ContentRecoveryFingerprint {
	static create(recovery: ContentRecovery): string {
		return ContentFingerprint.of(
			JSON.stringify({
				operation: recovery.operation,
				revision: recovery.revision,
				bindingId: recovery.bindingId,
			}),
		);
	}

	static matches(recovery: ContentRecovery, fingerprint?: string): boolean {
		if (!fingerprint) return false;
		// Existing manifests can contain any JSON property order. Recognize those
		// exact identities so formatting cannot reapply a completed recovery.
		const orders = [
			["operation", "revision", "bindingId"],
			["operation", "bindingId", "revision"],
			["revision", "operation", "bindingId"],
			["revision", "bindingId", "operation"],
			["bindingId", "operation", "revision"],
			["bindingId", "revision", "operation"],
		] as const;
		return orders.some(
			(keys) =>
				ContentFingerprint.of(
					JSON.stringify(
						Object.fromEntries(keys.map((key) => [key, recovery[key]])),
					),
				) === fingerprint,
		);
	}
}
