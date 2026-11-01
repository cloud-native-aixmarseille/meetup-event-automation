import {
	createCipheriv,
	createDecipheriv,
	hkdfSync,
	randomBytes,
} from "node:crypto";
import type { MeetupStorageState } from "./meetup-session-store.js";

/** Authenticated encryption; only provider-scoped cookies and local storage survive. */
export class MeetupSessionCodec {
	private readonly key: Buffer;
	constructor(
		secret: string,
		scope: string,
		private readonly origin: string,
		private readonly now: () => number,
	) {
		this.key = Buffer.from(
			hkdfSync("sha256", secret, scope, "meetup-browser-session-v1", 32),
		);
	}
	encode(state: MeetupStorageState): Buffer {
		const filtered = {
			cookies: state.cookies.filter((cookie) =>
				this.allowedDomain(cookie.domain),
			),
			origins: state.origins.filter((entry) => entry.origin === this.origin),
		};
		const iv = randomBytes(12);
		const cipher = createCipheriv("aes-256-gcm", this.key, iv);
		const data = Buffer.from(
			JSON.stringify({ version: 1, savedAt: this.now(), state: filtered }),
		);
		const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
		return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
	}
	decode(data: Buffer): MeetupStorageState | undefined {
		try {
			if (data.length < 29 || data.length > 2_000_000) return undefined;
			const decipher = createDecipheriv(
				"aes-256-gcm",
				this.key,
				data.subarray(0, 12),
			);
			decipher.setAuthTag(data.subarray(12, 28));
			const value: unknown = JSON.parse(
				Buffer.concat([
					decipher.update(data.subarray(28)),
					decipher.final(),
				]).toString("utf8"),
			);
			if (
				!this.record(value) ||
				value.version !== 1 ||
				typeof value.savedAt !== "number" ||
				!Number.isFinite(value.savedAt)
			)
				return undefined;
			const age = this.now() - value.savedAt;
			if (
				age < 0 ||
				age > 7 * 24 * 60 * 60 * 1_000 ||
				!this.validState(value.state)
			)
				return undefined;
			return value.state;
		} catch {
			return undefined;
		}
	}
	private validState(value: unknown): value is MeetupStorageState {
		return (
			this.record(value) &&
			Array.isArray(value.cookies) &&
			Array.isArray(value.origins) &&
			value.cookies.every((cookie) => this.validCookie(cookie)) &&
			value.origins.every(
				(entry) =>
					this.record(entry) &&
					entry.origin === this.origin &&
					Array.isArray(entry.localStorage) &&
					entry.localStorage.every(
						(item: unknown) =>
							this.record(item) &&
							typeof item.name === "string" &&
							typeof item.value === "string",
					),
			)
		);
	}
	private validCookie(value: unknown): boolean {
		return (
			this.record(value) &&
			typeof value.name === "string" &&
			typeof value.value === "string" &&
			typeof value.domain === "string" &&
			this.allowedDomain(value.domain) &&
			typeof value.path === "string" &&
			value.path.startsWith("/") &&
			typeof value.expires === "number" &&
			Number.isFinite(value.expires) &&
			typeof value.httpOnly === "boolean" &&
			typeof value.secure === "boolean" &&
			["Strict", "Lax", "None"].includes(String(value.sameSite))
		);
	}
	private allowedDomain(domain: string): boolean {
		const host = new URL(this.origin).hostname;
		return [host, host.replace(/^www\./, "")].includes(
			domain.replace(/^\./, ""),
		);
	}
	private record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
