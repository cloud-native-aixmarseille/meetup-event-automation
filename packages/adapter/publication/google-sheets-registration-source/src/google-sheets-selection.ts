export interface GoogleSheetsSelectedRows {
	readonly spreadsheetId: string;
	readonly sheetId: number;
	readonly firstDataRow: number;
	readonly lastDataRow: number;
}

/** Validates an explicit tab and bounded, inclusive source-row selection. */
export class GoogleSheetsSelection {
	parse(
		urlText: string,
		firstDataRow: number,
		lastDataRow: number,
	): GoogleSheetsSelectedRows {
		try {
			const url = new URL(urlText);
			const path = url.pathname.match(
				/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)\/edit$/,
			);
			if (
				urlText.trim() !== urlText ||
				url.origin !== "https://docs.google.com" ||
				url.username ||
				url.password ||
				!path
			)
				throw new Error();
			const query = url.searchParams;
			const fragment = new URLSearchParams(url.hash.slice(1));
			for (const parameters of [query, fragment]) {
				if (
					[...parameters.keys()].some((key) => key !== "gid") ||
					parameters.getAll("gid").length > 1
				)
					throw new Error();
			}
			const gids = [...query.getAll("gid"), ...fragment.getAll("gid")];
			if (
				!gids.length ||
				gids.some((gid) => !/^(0|[1-9]\d*)$/.test(gid) || gid !== gids[0])
			)
				throw new Error();
			const sheetId = Number(gids[0]);
			if (
				!Number.isSafeInteger(sheetId) ||
				sheetId > 2147483647 ||
				!Number.isSafeInteger(firstDataRow) ||
				!Number.isSafeInteger(lastDataRow) ||
				firstDataRow < 2 ||
				lastDataRow < firstDataRow ||
				lastDataRow - firstDataRow >= 1000 ||
				lastDataRow > 10000000
			)
				throw new Error();
			return { spreadsheetId: path[1], sheetId, firstDataRow, lastDataRow };
		} catch {
			throw new Error("Invalid Google Sheets registration source selection");
		}
	}
}
