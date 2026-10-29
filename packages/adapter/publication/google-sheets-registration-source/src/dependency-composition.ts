import type { RegistrationResponseSource } from "@meetup-automation/publication";
import { JWT } from "google-auth-library";
import { GoogleSheetsCredentials } from "./google-sheets-credentials.js";
import { GoogleSheetsRegistrationSource } from "./google-sheets-registration-source.js";
import { GoogleSheetsResponse } from "./google-sheets-response.js";
import { GoogleSheetsSelection } from "./google-sheets-selection.js";

export interface GoogleSheetsRegistrationSourceInput {
	readonly url: string;
	readonly firstDataRow: number;
	readonly lastDataRow: number;
	readonly credentials: string;
}

export class GoogleSheetsRegistrationSourceComposition {
	constructor(private readonly request: typeof fetch) {}

	source(
		input: GoogleSheetsRegistrationSourceInput,
	): RegistrationResponseSource {
		return new GoogleSheetsRegistrationSource(
			new GoogleSheetsSelection().parse(
				input.url,
				input.firstDataRow,
				input.lastDataRow,
			),
			new JWT({
				...new GoogleSheetsCredentials().parse(input.credentials),
				scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
			}),
			this.request,
			new GoogleSheetsResponse(),
		);
	}
}
