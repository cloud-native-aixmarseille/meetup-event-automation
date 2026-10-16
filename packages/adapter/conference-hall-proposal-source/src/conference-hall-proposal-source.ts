import {
	ProposalSourceError,
	type ProposalSnapshot,
	type ProposalSource,
} from "@meetup-automation/referential";
import { ProposalExportParser } from "./proposal-export-parser.js";

export class ConferenceHallProposalSource implements ProposalSource {
	private snapshot?: Promise<ProposalSnapshot>;
	constructor(
		private readonly event: string,
		private readonly apiKey: string,
		private readonly request: typeof fetch = fetch,
	) {}
	load(): Promise<ProposalSnapshot> {
		this.snapshot ??= this.fetchSnapshot();
		return this.snapshot;
	}
	private async fetchSnapshot(): Promise<ProposalSnapshot> {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.event) || !this.apiKey.trim())
			throw new ProposalSourceError("unavailable");
		try {
			const response = await this.request(
				`https://conference-hall.io/api/v1/event/${this.event}`,
				{
					headers: { "X-API-Key": this.apiKey, Accept: "application/json" },
					redirect: "error",
					signal: AbortSignal.timeout(15000),
				},
			);
			if (response.status === 429) {
				await response.body?.cancel();
				throw new ProposalSourceError(
					"rate-limited",
					this.retryAfter(response.headers.get("retry-after")),
				);
			}
			if (!response.ok) {
				await response.body?.cancel();
				throw new ProposalSourceError("unavailable");
			}
			return ProposalExportParser.parse(
				JSON.parse(await this.readBounded(response)),
				this.event,
			);
		} catch (error) {
			if (error instanceof ProposalSourceError) throw error;
			throw new ProposalSourceError("unavailable");
		}
	}
	private async readBounded(response: Response): Promise<string> {
		const limit = 5 * 1024 * 1024;
		if (
			Number(response.headers.get("content-length")) > limit ||
			!response.body
		) {
			await response.body?.cancel();
			throw new ProposalSourceError("invalid");
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8", { fatal: true });
		let size = 0;
		let result = "";
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > limit) throw new ProposalSourceError("invalid");
				result += decoder.decode(value, { stream: true });
			}
			return result + decoder.decode();
		} finally {
			await reader.cancel();
			reader.releaseLock();
		}
	}
	private retryAfter(value: string | null): number {
		if (value && /^\d+$/.test(value)) return Math.max(1, Number(value));
		const date = value ? Date.parse(value) : Number.NaN;
		return Number.isFinite(date)
			? Math.max(1, Math.ceil((date - Date.now()) / 1000))
			: 3600;
	}
}
