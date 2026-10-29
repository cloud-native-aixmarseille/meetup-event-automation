/** Only service-account key fields may influence authentication. */
export class GoogleSheetsCredentials {
	parse(credentialsJson: string): { email: string; key: string } {
		try {
			const credentials: unknown = JSON.parse(credentialsJson);
			if (
				!credentials ||
				typeof credentials !== "object" ||
				Array.isArray(credentials) ||
				!("type" in credentials) ||
				credentials.type !== "service_account" ||
				!("client_email" in credentials) ||
				typeof credentials.client_email !== "string" ||
				!credentials.client_email.trim() ||
				!("private_key" in credentials) ||
				typeof credentials.private_key !== "string" ||
				!credentials.private_key.trim()
			)
				throw new Error();
			return { email: credentials.client_email, key: credentials.private_key };
		} catch {
			throw new Error("Invalid Google Sheets service-account credentials");
		}
	}
}
