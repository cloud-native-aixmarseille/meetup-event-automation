import type {
	ContentBinding,
	ContentChange,
	ContentManifest,
	ContentSnapshot,
	ContentValue,
} from "./asset-content.js";
import { ContentError } from "./content-error.js";
import { ContentContractPolicy } from "./content-contract-policy.js";

export class ContentRenderPlan {
	static changes(
		manifest: ContentManifest,
		snapshot: ContentSnapshot,
		values: readonly ContentValue[],
	): readonly ContentChange[] {
		const changes: ContentChange[] = [];
		for (const binding of manifest.bindings) {
			const matches = snapshot.locations.filter(
				(location) => location.id === binding.id,
			);
			const location = matches[0];
			if (matches.length !== 1 || location.fingerprint !== binding.applied)
				throw new ContentError("conflict");
			const value = values.find(
				(item) => item.key === binding.key && item.type === binding.type,
			);
			if (!value) throw new ContentError("contract");
			if (
				binding.desired !== value.fingerprint ||
				(binding.type === "text" && location.fingerprint !== value.fingerprint)
			)
				changes.push({ location, value });
		}
		return changes;
	}

	static pending(
		manifest: ContentManifest,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
	): ContentManifest {
		return {
			...manifest,
			pending: {
				revision: snapshot.revision,
				bindings: manifest.bindings.map((binding) => {
					const value = changes.find(
						(change) => change.location.id === binding.id,
					)?.value;
					return value
						? {
								...binding,
								desired: value.fingerprint,
								applied:
									value.type === "text" ? value.fingerprint : binding.applied,
								speakerId: value.speakerId,
								fallback: value.fallback,
							}
						: binding;
				}),
			},
		};
	}

	static settle(
		manifest: ContentManifest,
		snapshot: ContentSnapshot,
		confirmed: boolean,
	): ContentManifest {
		if (!manifest.pending) return manifest;
		const next = manifest.pending.bindings;
		const applied = next.every((binding) => {
			const location = snapshot.locations.find(
				(item) => item.id === binding.id,
			);
			if (!location) throw new ContentError("conflict");
			const prior = manifest.bindings.find((item) => item.id === binding.id);
			return binding.type === "image" && binding.desired !== prior?.desired
				? confirmed
				: binding.applied === location.fingerprint;
		});
		if (applied)
			return {
				...manifest,
				pending: undefined,
				initialRevision: next.every((binding) => binding.desired)
					? undefined
					: manifest.initialRevision,
				bindings: next.map((binding) => ({
					...binding,
					applied: snapshot.locations.find((item) => item.id === binding.id)
						?.fingerprint as string,
				})),
			};
		const prior = manifest.bindings.every(
			(binding) =>
				snapshot.locations.find((item) => item.id === binding.id)
					?.fingerprint === binding.applied,
		);
		const uncertainImage = next.some(
			(binding, index) =>
				binding.type === "image" &&
				binding.desired !== manifest.bindings[index]?.desired,
		);
		if (!prior)
			throw new ContentError(uncertainImage ? "recovery" : "conflict");
		if (uncertainImage && snapshot.revision !== manifest.pending.revision)
			throw new ContentError("recovery");
		return { ...manifest, pending: undefined };
	}

	static initial(snapshot: ContentSnapshot): readonly ContentBinding[] {
		if (
			!snapshot.locations.length ||
			snapshot.locations.length > 500 ||
			snapshot.locations.some(
				(location) =>
					!ContentContractPolicy.name(location.id) ||
					!ContentContractPolicy.name(location.key),
			) ||
			new Set(snapshot.locations.map((location) => location.id)).size !==
				snapshot.locations.length ||
			new Set(
				snapshot.locations.map((location) => JSON.stringify(location.anchor)),
			).size !== snapshot.locations.length
		)
			throw new ContentError("location");
		return snapshot.locations.map((location) => ({
			id: location.id,
			type: location.type,
			key: location.key,
			anchor: location.anchor,
			applied: location.fingerprint,
		}));
	}
}
