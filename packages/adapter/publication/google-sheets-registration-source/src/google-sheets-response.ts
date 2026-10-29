import type { RegistrationResponseTable } from "@meetup-automation/publication";
import type { GoogleSheetsSelectedRows } from "./google-sheets-selection.js";

export interface GoogleSheetsTab {
	readonly title: string;
	readonly columns: number;
}

/** Checks the selected tab, returned ranges, and primitive cell values. */
export class GoogleSheetsResponse {
	tab(value: unknown, selection: GoogleSheetsSelectedRows): GoogleSheetsTab {
		if (
			!this.object(value) ||
			value.spreadsheetId !== selection.spreadsheetId ||
			!Array.isArray(value.sheets)
		)
			throw new Error("Invalid Google Sheets metadata response");
		const matches = value.sheets.filter(
			(sheet) =>
				this.object(sheet) &&
				this.object(sheet.properties) &&
				this.sheetId(sheet.properties) === selection.sheetId,
		);
		const sheet: unknown = matches[0];
		if (
			matches.length !== 1 ||
			!this.object(sheet) ||
			!this.object(sheet.properties)
		)
			throw new Error("Selected Google Sheets tab is unavailable");
		const properties = sheet.properties;
		const grid = properties.gridProperties;
		if (
			typeof properties.title !== "string" ||
			!properties.title ||
			!this.object(grid) ||
			typeof grid.rowCount !== "number" ||
			!Number.isSafeInteger(grid.rowCount) ||
			grid.rowCount < selection.lastDataRow ||
			typeof grid.columnCount !== "number" ||
			!Number.isSafeInteger(grid.columnCount) ||
			grid.columnCount < 1
		)
			throw new Error("Invalid Google Sheets selected tab bounds");
		return { title: properties.title, columns: Math.min(64, grid.columnCount) };
	}

	ranges(
		tab: GoogleSheetsTab,
		selection: GoogleSheetsSelectedRows,
	): readonly string[] {
		const end =
			tab.columns <= 26
				? String.fromCharCode(64 + tab.columns)
				: String.fromCharCode(
						64 + Math.floor((tab.columns - 1) / 26),
						65 + ((tab.columns - 1) % 26),
					);
		const title = `'${tab.title.replaceAll("'", "''")}'`;
		return [
			`${title}!A1:${end}1`,
			`${title}!A${selection.firstDataRow}:${end}${selection.lastDataRow}`,
		];
	}

	table(
		value: unknown,
		selection: GoogleSheetsSelectedRows,
		tab: GoogleSheetsTab,
	): RegistrationResponseTable {
		if (
			!this.object(value) ||
			value.spreadsheetId !== selection.spreadsheetId ||
			!Array.isArray(value.sheets) ||
			value.sheets.length !== 1
		)
			throw new Error("Invalid Google Sheets registration response");
		const sheet: unknown = value.sheets[0];
		if (
			!this.object(sheet) ||
			!this.object(sheet.properties) ||
			this.sheetId(sheet.properties) !== selection.sheetId ||
			!Array.isArray(sheet.data)
		)
			throw new Error("Unexpected Google Sheets registration tab");
		const rows = new Map<number, readonly unknown[]>();
		for (const block of sheet.data)
			this.rows(block, selection, tab.columns, rows);
		const header = rows.get(0);
		if (!header?.length)
			throw new Error("Google Sheets registration headers are unavailable");
		const table = [header];
		for (
			let row = selection.firstDataRow - 1;
			row < selection.lastDataRow;
			row++
		)
			table.push(rows.get(row) ?? []);
		return table;
	}

	private rows(
		value: unknown,
		selection: GoogleSheetsSelectedRows,
		columns: number,
		rows: Map<number, readonly unknown[]>,
	): void {
		if (!this.object(value))
			throw new Error("Unexpected Google Sheets registration range");
		const startRow = value.startRow === undefined ? 0 : value.startRow;
		const startColumn = value.startColumn === undefined ? 0 : value.startColumn;
		const values: unknown = value.rowData === undefined ? [] : value.rowData;
		if (
			typeof startRow !== "number" ||
			!Number.isSafeInteger(startRow) ||
			startColumn !== 0 ||
			!Array.isArray(values) ||
			values.length > 1001 ||
			!this.selectedRow(startRow, selection)
		)
			throw new Error("Invalid Google Sheets registration rows");
		for (let offset = 0; offset < values.length; offset++) {
			const row = startRow + offset;
			if (!this.selectedRow(row, selection) || rows.has(row))
				throw new Error("Unexpected Google Sheets registration range");
			rows.set(row, this.row(values[offset], columns));
		}
	}

	private row(value: unknown, columns: number): readonly unknown[] {
		if (!this.object(value))
			throw new Error("Invalid Google Sheets registration row");
		const cells: unknown = value.values === undefined ? [] : value.values;
		if (!Array.isArray(cells) || cells.length > columns)
			throw new Error("Invalid Google Sheets registration cells");
		return cells.map((cell) => this.cell(cell));
	}

	private cell(value: unknown): string | number | boolean {
		if (!this.object(value))
			throw new Error("Invalid Google Sheets registration cell");
		if (value.effectiveValue === undefined) return "";
		const effective = value.effectiveValue;
		if (!this.object(effective) || Object.keys(effective).length !== 1)
			throw new Error("Invalid Google Sheets effective cell value");
		if (typeof effective.stringValue === "string") return effective.stringValue;
		if (typeof effective.boolValue === "boolean") return effective.boolValue;
		if (
			typeof effective.numberValue === "number" &&
			Number.isFinite(effective.numberValue)
		)
			return effective.numberValue;
		throw new Error("Invalid Google Sheets effective cell value");
	}

	private selectedRow(
		row: number,
		selection: GoogleSheetsSelectedRows,
	): boolean {
		return (
			row === 0 ||
			(row >= selection.firstDataRow - 1 && row < selection.lastDataRow)
		);
	}

	private sheetId(properties: Record<string, unknown>): unknown {
		return properties.sheetId === undefined ? 0 : properties.sheetId;
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
