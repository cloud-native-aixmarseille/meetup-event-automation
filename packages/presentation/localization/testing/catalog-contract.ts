import { parse } from "@formatjs/icu-messageformat-parser";
import type {
	MessageCatalogs,
	MessageValues,
} from "../src/message-catalogs.js";
import { MessageLocalizer } from "../src/message-localizer.js";

export function inspectCatalog(
	catalogs: MessageCatalogs,
	locale: "en" | "fr",
	samples: Readonly<Record<string, MessageValues>>,
) {
	const localizer = new MessageLocalizer<string, Record<string, MessageValues>>(
		catalogs,
		locale,
	);
	return Object.keys(catalogs.en).map((id) => ({
		id,
		text: localizer.t(id, samples[id] ?? {}),
		actual: argumentNames(
			parse(catalogs[locale][id] ?? "", { ignoreTag: true }),
		),
		expected: Object.keys(samples[id] ?? {}).sort(),
	}));
}

function argumentNames(value: unknown, names = new Set<string>()): string[] {
	if (Array.isArray(value))
		for (const child of value) argumentNames(child, names);
	else if (value && typeof value === "object") {
		const node = value as Record<string, unknown>;
		if (
			[1, 2, 3, 4, 5, 6].includes(Number(node.type)) &&
			typeof node.value === "string"
		)
			names.add(node.value);
		for (const child of Object.values(node))
			if (typeof child === "object") argumentNames(child, names);
	}
	return [...names].sort();
}
