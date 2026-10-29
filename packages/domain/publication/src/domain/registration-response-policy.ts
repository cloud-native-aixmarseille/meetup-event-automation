import type {
	RegistrationResponseEvaluation,
	RegistrationResponseMapping,
	RegistrationResponseTable,
} from "../application/registration-response-source.js";
import type { PublicationDiagnostic } from "./model.js";

/** Validates one exact event's response identities without asserting registration. */
export class RegistrationResponsePolicy {
	evaluate(
		table: RegistrationResponseTable,
		mapping: RegistrationResponseMapping,
	): RegistrationResponseEvaluation {
		if (!mapping.emailColumn.trim())
			return this.blocked("mapping", "Configure the response email column");
		const header = table[0] ?? [];
		const emailColumn = this.column(header, mapping.emailColumn);
		if (emailColumn === undefined)
			return this.blocked(
				"headers",
				"The configured response email column must occur exactly once",
			);
		const result = this.collect(table.slice(1), emailColumn);
		const diagnostics: PublicationDiagnostic[] = [];
		if (result.invalidCount > 0)
			diagnostics.push(
				this.diagnostic(
					"invalid",
					"Response identities require organizer review",
				),
			);
		if (result.responseCount === 0)
			diagnostics.push(
				this.diagnostic("empty", "No responses were selected for this event"),
			);
		return {
			...result,
			participants: diagnostics.length ? [] : result.participants,
			diagnostics,
		};
	}

	private collect(
		rows: RegistrationResponseTable,
		emailColumn: number,
	): Omit<RegistrationResponseEvaluation, "diagnostics"> {
		const emails = new Set<string>();
		let responseCount = 0;
		let duplicateCount = 0;
		let invalidCount = 0;
		for (const row of rows) {
			if (this.blank(row)) continue;
			responseCount += 1;
			const email = this.email(row[emailColumn]);
			if (!email) invalidCount += 1;
			else if (emails.has(email)) duplicateCount += 1;
			else emails.add(email);
		}
		return {
			participants: [...emails].map((email) => ({ email })),
			responseCount,
			duplicateCount,
			invalidCount,
		};
	}

	private blank(row: readonly unknown[]): boolean {
		return row.every(
			(cell) =>
				cell === undefined ||
				cell === null ||
				(typeof cell === "string" && !cell.trim()),
		);
	}

	private column(header: readonly unknown[], name: string): number | undefined {
		const index = header.indexOf(name);
		return index >= 0 && header.lastIndexOf(name) === index ? index : undefined;
	}

	private email(value: unknown): string | undefined {
		if (typeof value !== "string") return undefined;
		const email = value.trim().toLowerCase();
		const parts = email.split("@");
		if (parts.length !== 2 || email.length > 254) return undefined;
		const [local, domain] = parts;
		if (!local || !domain || local.length > 64) return undefined;
		// Accept unquoted mailbox atoms; unsupported forms need organizer review.
		const atom = /^[\p{L}\p{N}\p{M}!#$%&'*+/=?^_`{|}~-]+$/u;
		const label = /^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?$/u;
		const labels = domain.split(".");
		if (
			!local.split(".").every((part) => atom.test(part)) ||
			labels.length < 2 ||
			!labels.every((part) => part.length <= 63 && label.test(part))
		)
			return undefined;
		return email;
	}

	private blocked(
		code: string,
		message: string,
	): RegistrationResponseEvaluation {
		return {
			participants: [],
			responseCount: 0,
			duplicateCount: 0,
			invalidCount: 0,
			diagnostics: [this.diagnostic(code, message)],
		};
	}

	private diagnostic(code: string, message: string): PublicationDiagnostic {
		return {
			code: `publication.registration.${code}`,
			severity: "warning",
			field: "community",
			message,
		};
	}
}
