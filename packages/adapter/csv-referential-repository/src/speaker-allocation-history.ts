import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
	ReferentialIdentifiers,
	SpeakerCatalogHistoryError,
} from "@meetup-automation/referential";

type GitCommand = (
	command: string,
	args: readonly string[],
	options: {
		cwd: string;
		encoding: "utf8";
		timeout: number;
		maxBuffer: number;
	},
) => Promise<{ stdout: string }>;

/** Recover deleted IDs before the catalog has a persisted allocation history. */
export class SpeakerAllocationHistory {
	constructor(
		private readonly root: string,
		private readonly command: GitCommand = promisify(execFile),
	) {}

	async read(): Promise<readonly string[]> {
		const options = {
			cwd: this.root,
			encoding: "utf8" as const,
			timeout: 30_000,
			maxBuffer: 16 * 1024 * 1024,
		};
		try {
			const shallow = await this.command(
				"git",
				["rev-parse", "--is-shallow-repository"],
				options,
			);
			if (shallow.stdout.trim() !== "false")
				throw new SpeakerCatalogHistoryError();
			const history = await this.command(
				"git",
				["log", "--all", "--format=", "-p", "--", "referentials/speakers.csv"],
				options,
			);
			const words = history.stdout.match(/\b[\w-]+\b/g) ?? [];
			return [
				...new Set(words.filter(ReferentialIdentifiers.asSpeakerId)),
			].sort();
		} catch {
			// Git errors may contain private file contents; never expose them to reports.
			throw new SpeakerCatalogHistoryError();
		}
	}
}
