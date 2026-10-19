import type { TextField, TextKey } from "./asset-content.js";

export class ContentTextKey {
	static of(field: Pick<TextField, "token" | "slot">): TextKey {
		return (
			field.slot ? `${field.token}:${field.slot}` : field.token
		) as TextKey;
	}
}
