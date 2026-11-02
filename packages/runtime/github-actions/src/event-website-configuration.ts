export type EventWebsiteSettings = Readonly<{
	repository: string;
	path: string;
}>;

export class EventWebsiteConfiguration {
	parse(value: unknown): EventWebsiteSettings {
		if (
			!value ||
			typeof value !== "object" ||
			Array.isArray(value) ||
			Object.keys(value).some((key) => !["repository", "path"].includes(key)) ||
			!("repository" in value) ||
			typeof value.repository !== "string" ||
			!/^[a-zA-Z0-9_.-]+$/.test(value.repository) ||
			[".", ".."].includes(value.repository) ||
			!("path" in value) ||
			typeof value.path !== "string" ||
			!value.path.endsWith(".md") ||
			value.path
				.split("/")
				.some(
					(part) =>
						!/^[a-zA-Z0-9_.-]+$/.test(part) || [".", ".."].includes(part),
				)
		)
			throw new Error("Invalid website repository or Markdown path");
		return { repository: value.repository, path: value.path };
	}
}
