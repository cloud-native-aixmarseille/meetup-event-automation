import {
	ProposalSourceError,
	type ReferentialIdentifiers,
} from "@meetup-automation/referential";

// Match the repository JSON formatter's default line width and visual tab width.
const STATE_LINE_WIDTH = 80;
const STATE_INDENT_WIDTH = 2;

interface StoredAllocation {
	version: 1;
	reservedIds: readonly string[];
}

export interface SpeakerAllocationStateCodecCollaborators {
	readonly referentialIdentifiers: Pick<ReferentialIdentifiers, "asSpeakerId">;
}

export class SpeakerAllocationStateCodec {
	constructor(
		private readonly collaborators: SpeakerAllocationStateCodecCollaborators,
	) {}

	decode(source: string): readonly string[] {
		let value: unknown;
		try {
			value = JSON.parse(source);
		} catch {
			throw new ProposalSourceError("invalid");
		}
		if (!this.validState(value)) throw new ProposalSourceError("invalid");
		return [...value.reservedIds];
	}
	encode(reservedIds: readonly string[]): string {
		const state: StoredAllocation = { version: 1, reservedIds };
		const text = `${JSON.stringify(state, null, "\t")}\n`;
		const inline = `[${state.reservedIds.map((id) => JSON.stringify(id)).join(", ")}]`;
		const property = '"reservedIds": ';
		if (STATE_INDENT_WIDTH + property.length + inline.length > STATE_LINE_WIDTH)
			return text;
		const expanded = JSON.stringify(state.reservedIds, null, "\t").replaceAll(
			"\n",
			"\n\t",
		);
		return text.replace(`\t${property}${expanded}`, `\t${property}${inline}`);
	}
	private validState(value: unknown): value is StoredAllocation {
		if (!value || typeof value !== "object" || Array.isArray(value))
			return false;
		const state = value as Record<string, unknown>;
		return (
			state.version === 1 &&
			Array.isArray(state.reservedIds) &&
			state.reservedIds.every(
				(id) =>
					typeof id === "string" &&
					this.collaborators.referentialIdentifiers.asSpeakerId(id) !==
						undefined,
			)
		);
	}
}
