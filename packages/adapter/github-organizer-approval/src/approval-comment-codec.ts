import type { StoredApproval } from "./approval-state.js";
import { StoredApprovalSchema } from "./stored-approval-schema.js";

export const APPROVAL_MARKER = "<!-- meetup-organizer-approval:v1 ";

/** The versioned marker retains property order for exact checkbox verification. */
export class ApprovalCommentCodec {
	static read(body: string): StoredApproval {
		const line = body.split("\n", 1)[0];
		if (!line?.startsWith(APPROVAL_MARKER) || !line.endsWith(" -->"))
			throw new Error("Invalid approval record");
		const record: unknown = JSON.parse(line.slice(APPROVAL_MARKER.length, -4));
		StoredApprovalSchema.validate(record);
		return record;
	}

	static marker(record: StoredApproval): string {
		const json = JSON.stringify(record)
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e")
			.replaceAll("&", "\\u0026");
		return `${APPROVAL_MARKER}${json} -->`;
	}
}
