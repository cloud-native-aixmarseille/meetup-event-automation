import type { Host, RawHostRecord } from "../../domain/referential-catalog.js";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";

type PublicDetails = Pick<Host, "publicVenue" | "logo">;

/** Public venue and logo values never fall back to private contact fields. */
export class HostPublicDetails {
	parse(
		record: RawHostRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	): PublicDetails | undefined {
		const venue = [
			record.venueAddress,
			record.venuePostalCode,
			record.venueCity,
		];
		const logo = [record.logoUrl, record.logoDescription];
		const hasVenue = venue.some((value) => value !== undefined && value !== "");
		const hasLogo = logo.some((value) => value !== undefined && value !== "");
		if (
			(hasVenue && !venue.every((value) => this.text(value))) ||
			(hasLogo &&
				(!logo.every((value) => this.text(value)) || !this.url(record.logoUrl)))
		) {
			diagnostics.push({
				code: "referential.host.public-details.invalid",
				severity: "error",
				path: `hosts[${index}]`,
				message:
					"Public venue fields and public logo fields must each be complete and valid when supplied.",
			});
			return undefined;
		}
		return {
			...(hasVenue &&
			this.text(record.venueAddress) &&
			this.text(record.venuePostalCode) &&
			this.text(record.venueCity)
				? {
						publicVenue: Object.freeze({
							address: record.venueAddress,
							postalCode: record.venuePostalCode,
							city: record.venueCity,
						}),
					}
				: {}),
			...(hasLogo &&
			this.text(record.logoUrl) &&
			this.text(record.logoDescription)
				? {
						logo: Object.freeze({
							url: record.logoUrl,
							description: record.logoDescription,
						}),
					}
				: {}),
		};
	}
	equal(left: PublicDetails, right: PublicDetails): boolean {
		return (
			left.publicVenue?.address === right.publicVenue?.address &&
			left.publicVenue?.postalCode === right.publicVenue?.postalCode &&
			left.publicVenue?.city === right.publicVenue?.city &&
			left.logo?.url === right.logo?.url &&
			left.logo?.description === right.logo?.description
		);
	}
	private text(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.trim() === value &&
			value.length > 0 &&
			value.length <= 2000 &&
			!/[\r\n<>\p{Cc}]/u.test(value)
		);
	}
	private url(value: unknown): boolean {
		if (!this.text(value)) return false;
		try {
			const url = new URL(value);
			return url.protocol === "https:" && !url.username && !url.password;
		} catch {
			return false;
		}
	}
}
