import type { LocalDate } from "./plan-communications-contracts.js";

export class CommunicationCalendar {
	static parseIsoLocalDate(value: string): LocalDate | undefined {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (!match) {
			return undefined;
		}

		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const candidate = new Date(Date.UTC(year, month - 1, day));
		if (
			candidate.getUTCFullYear() !== year ||
			candidate.getUTCMonth() !== month - 1 ||
			candidate.getUTCDate() !== day
		) {
			return undefined;
		}

		return { year, month, day };
	}

	static getLocalDate(instant: Date, timeZone: string): LocalDate | undefined {
		try {
			const parts = new Intl.DateTimeFormat("en-US", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).formatToParts(instant);
			const values = new Map(parts.map((part) => [part.type, part.value]));
			const year = Number(values.get("year"));
			const month = Number(values.get("month"));
			const day = Number(values.get("day"));

			if (![year, month, day].every(Number.isInteger)) {
				return undefined;
			}

			return { year, month, day };
		} catch {
			return undefined;
		}
	}

	static toEpochDay(date: LocalDate): number {
		return Math.floor(
			Date.UTC(date.year, date.month - 1, date.day) / 86_400_000,
		);
	}

	static isValidInstant(value: Date): boolean {
		return value instanceof Date && Number.isFinite(value.getTime());
	}
}
