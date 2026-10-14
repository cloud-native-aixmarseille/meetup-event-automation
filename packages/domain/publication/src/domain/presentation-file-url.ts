/** Accept direct Google presentation or Drive file links, never asset folders. */
export class PresentationFileUrl {
	static normalize(value?: string): string | undefined {
		if (!value?.trim()) return undefined;
		try {
			const url = new URL(value.trim());
			if (url.protocol !== "https:" || url.username || url.password || url.port)
				return undefined;
			const presentation =
				url.hostname === "docs.google.com" &&
				/^\/presentation\/d\/[a-zA-Z0-9_-]+(?:\/(?:edit|view|preview|present))?\/?$/.test(
					url.pathname,
				);
			const file =
				url.hostname === "drive.google.com" &&
				/^\/file\/d\/[a-zA-Z0-9_-]+(?:\/(?:view|preview|edit))?\/?$/.test(
					url.pathname,
				);
			return presentation || file ? url.href : undefined;
		} catch {
			return undefined;
		}
	}
}
