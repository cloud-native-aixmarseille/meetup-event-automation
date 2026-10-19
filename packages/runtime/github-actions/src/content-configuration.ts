import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AnnouncementExport } from "@meetup-automation/google-drive-asset-repository";
import type { ContentSettings } from "@meetup-automation/journey";
import type { PublicAssetUrl } from "@meetup-automation/publication";
import type { RuntimeInput } from "./runtime-input.js";

export interface ContentConfigurationData extends ContentSettings {
	readonly announcements: Readonly<Record<string, AnnouncementExport>>;
}
export class ContentConfiguration {
	constructor(
		private readonly input: Pick<RuntimeInput, "isObject">,
		private readonly urls: Pick<PublicAssetUrl, "valid">,
	) {}
	async load(root: string): Promise<ContentConfigurationData> {
		const text = await readFile(
			join(root, ".github/meetup-content.json"),
			"utf8",
		);
		if (Buffer.byteLength(text) > 100_000)
			throw new Error("Content configuration exceeds limit");
		return this.parse(JSON.parse(text));
	}
	parse(value: unknown): ContentConfigurationData {
		if (
			!this.input.isObject(value) ||
			value.version !== 1 ||
			Object.keys(value).some(
				(key) =>
					![
						"version",
						"months",
						"mentions",
						"reminderTime",
						"guidance",
						"announcements",
					].includes(key),
			)
		)
			throw new Error("Invalid content configuration");
		if (
			!this.input.isObject(value.months) ||
			!this.input.isObject(value.announcements) ||
			!Array.isArray(value.mentions)
		)
			throw new Error("Invalid content configuration maps");
		const reminderTime = this.text(value.reminderTime, 5);
		if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminderTime))
			throw new Error("Invalid reminder publication time");
		const months: Record<string, string> = {};
		for (const [month, label] of Object.entries(value.months)) {
			if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
				throw new Error("Invalid explicit event month");
			months[month] = this.text(label, 40);
		}
		const announcements: Record<string, AnnouncementExport> = {};
		for (const [date, exported] of Object.entries(value.announcements))
			announcements[date] = this.announcement(date, exported);
		if (value.mentions.length > 20) throw new Error("Too many public mentions");
		return {
			reminderTime,
			months,
			announcements,
			mentions: value.mentions.map((name) => this.text(name, 100)),
			guidance:
				typeof value.guidance === "string" && value.guidance.length <= 2000
					? value.guidance
					: this.text(value.guidance, 2000),
		};
	}
	private announcement(date: string, value: unknown): AnnouncementExport {
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
			!this.input.isObject(value) ||
			Object.keys(value).some(
				(key) =>
					!["sourceId", "sourceRevision", "url", "description"].includes(key),
			)
		)
			throw new Error("Invalid announcement export");
		const url = this.text(value.url, 2000);
		if (!this.urls.valid(url))
			throw new Error("Announcement image must use a public URL");
		return {
			sourceId: this.text(value.sourceId, 200),
			sourceRevision: this.text(value.sourceRevision, 200),
			url,
			description: this.text(value.description, 1000),
		};
	}
	private text(value: unknown, limit: number): string {
		if (
			typeof value !== "string" ||
			!value.trim() ||
			value !== value.trim() ||
			value.length > limit
		)
			throw new Error("Invalid content configuration text");
		return value;
	}
}
