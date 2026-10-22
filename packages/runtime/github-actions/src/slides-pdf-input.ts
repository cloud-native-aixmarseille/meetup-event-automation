import type { SlidesPdfSource } from "@meetup-automation/journey";

/** Accept only public asset identity fields and the opaque issue revision. */
export class SlidesPdfInput {
	parse(value: string): SlidesPdfSource {
		const input: unknown = JSON.parse(value);
		if (!this.record(input)) throw new Error("Invalid PDF source");
		if (Object.keys(input).length === 0) return {};
		if (
			typeof input.revision !== "string" ||
			!/^[a-f0-9]{64}$/.test(input.revision)
		)
			throw new Error("Invalid PDF source revision");
		if (
			!Array.isArray(input.protectedFolderIds) ||
			!input.protectedFolderIds.length
		)
			throw new Error("Invalid protected asset folders");
		return {
			protectedFolderIds: input.protectedFolderIds.map((value) =>
				this.text(value),
			),
			revision: input.revision,
			...(input.container === undefined
				? {}
				: { container: this.container(input.container) }),
			...(input.presentation === undefined
				? {}
				: { presentation: this.presentation(input.presentation) }),
		};
	}
	private container(value: unknown) {
		if (!this.record(value)) throw new Error("Invalid PDF container");
		return {
			id: this.text(value.id),
			name: this.text(value.name),
			url: this.text(value.url),
			eventId: this.text(value.eventId),
		};
	}
	private presentation(value: unknown) {
		if (!this.record(value)) throw new Error("Invalid PDF presentation");
		return {
			id: this.text(value.id),
			name: this.text(value.name),
			templateId: this.text(value.templateId),
		};
	}
	private text(value: unknown): string {
		if (typeof value !== "string" || !value.trim())
			throw new Error("Invalid PDF identity field");
		return value;
	}
	private record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
