/** Requests a Google-compatible format without changing Wix's crop or dimensions. */
export class WixImageUrl {
	png(value: string): string | undefined {
		const url = new URL(value);
		if (
			url.origin !== "https://static.wixstatic.com" ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			!/^\/media\/[^/]+\/v1\/(?:fit|fill|crop)\/[^/]+\/[^/]+\.webp$/.test(
				url.pathname,
			)
		)
			return undefined;
		url.pathname = url.pathname.replace(/\.webp$/, ".png");
		return url.href;
	}
}
