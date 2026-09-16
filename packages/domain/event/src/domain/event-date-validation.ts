export class EventDateValidation {
	static isValidIsoDate(value: string): boolean {
		const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) {
			return false;
		}
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		if (month < 1 || month > 12 || day < 1) {
			return false;
		}
		const monthLengths = [
			31,
			EventDateValidation.isLeapYear(year) ? 29 : 28,
			31,
			30,
			31,
			30,
			31,
			31,
			30,
			31,
			30,
			31,
		];
		return day <= monthLengths[month - 1];
	}

	static isLeapYear(year: number): boolean {
		return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	}
}
