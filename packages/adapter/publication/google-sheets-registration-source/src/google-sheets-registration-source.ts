import type {
	RegistrationResponseSource,
	RegistrationResponseTable,
} from "@meetup-automation/publication";
import type { GoogleSheetsResponse } from "./google-sheets-response.js";
import type { GoogleSheetsSelectedRows } from "./google-sheets-selection.js";

export interface GoogleSheetsAuthentication {
	getAccessToken(): Promise<{ token?: string | null }>;
}

/** Reads only the selected tab's header and explicit rows with read-only scope. */
export class GoogleSheetsRegistrationSource
	implements RegistrationResponseSource
{
	constructor(
		private readonly selection: GoogleSheetsSelectedRows,
		private readonly authentication: GoogleSheetsAuthentication,
		private readonly request: typeof fetch,
		private readonly response: Pick<
			GoogleSheetsResponse,
			"tab" | "ranges" | "table"
		>,
	) {}

	async read(): Promise<RegistrationResponseTable> {
		try {
			const { token } = await this.authentication.getAccessToken();
			if (!token) throw new Error();
			const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${this.selection.spreadsheetId}`;
			const metadataQuery = new URLSearchParams({
				fields:
					"spreadsheetId,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))",
			});
			const tab = this.response.tab(
				await this.json(`${endpoint}?${metadataQuery}`, token),
				this.selection,
			);
			const query = new URLSearchParams({
				fields:
					"spreadsheetId,sheets(properties(sheetId),data(startRow,startColumn,rowData(values(effectiveValue))))",
			});
			for (const range of this.response.ranges(tab, this.selection))
				query.append("ranges", range);
			return this.response.table(
				await this.json(`${endpoint}?${query}`, token),
				this.selection,
				tab,
			);
		} catch {
			throw new Error("Google Sheets registration source could not be read");
		}
	}

	private async json(url: string, token: string): Promise<unknown> {
		const result = await this.request(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			redirect: "error",
			signal: AbortSignal.timeout(30000),
		});
		if (!result.ok || result.redirected) {
			await result.body?.cancel();
			throw new Error();
		}
		return JSON.parse(await this.boundedText(result));
	}

	private async boundedText(response: Response): Promise<string> {
		const limit = 4 * 1024 * 1024;
		if (
			!response.body ||
			Number(response.headers.get("content-length")) > limit
		) {
			await response.body?.cancel();
			throw new Error();
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8", { fatal: true });
		let size = 0;
		let text = "";
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > limit) throw new Error();
				text += decoder.decode(value, { stream: true });
			}
			return text + decoder.decode();
		} finally {
			await reader.cancel();
			reader.releaseLock();
		}
	}
}
