import { expect } from "vitest";
import { DELIVERY_LEDGER_MARKER } from "../src/github-delivery-ledger-contracts.js";

/** Inspect the complete generated format without stripping or sanitizing HTML. */
export function inspectLedgerComment(body: string) {
	const sections =
		/^(?<marker><!--[^\r\n]*-->)\n\n(?<visible>[^<>]+)\n\n<!--\n```json\n(?<metadata>[^<>`]+)\n```\n-->$/u.exec(
			body,
		)?.groups;
	expect(sections).toBeDefined();
	expect(sections?.marker).toBe(DELIVERY_LEDGER_MARKER);
	expect(sections?.metadata).not.toContain("--");
	return {
		visible: sections?.visible ?? "",
		persisted: JSON.parse(sections?.metadata ?? ""),
	};
}
