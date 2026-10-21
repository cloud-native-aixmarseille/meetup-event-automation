import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type {
	RawReferentialCatalog,
	ReferentialRepository,
} from "@meetup-automation/referential";
import { CsvReferentialCodec } from "./csv-referential-codec.js";
import type { CsvReferentialRepositoryOptions } from "./csv-referential-repository-contracts.js";

export class CsvReferentialRepository implements ReferentialRepository {
	constructor(private readonly options: CsvReferentialRepositoryOptions) {}

	async load(): Promise<RawReferentialCatalog> {
		const [hostsSource, speakersSource] = await Promise.all([
			readFile(
				await CsvReferentialRepository.localPath(
					this.options.workspaceRoot,
					this.options.hostsPath,
				),
				"utf8",
			),
			readFile(
				await CsvReferentialRepository.localPath(
					this.options.workspaceRoot,
					this.options.speakersPath,
				),
				"utf8",
			),
		]);

		return CsvReferentialCodec.decode(
			hostsSource,
			speakersSource,
			this.options.hostsPath,
			this.options.speakersPath,
		);
	}

	private static async localPath(
		rootInput: string,
		relativeInput: string,
	): Promise<string> {
		const root = await realpath(resolve(rootInput));
		const absolute = resolve(root, relativeInput);
		CsvReferentialRepository.assertInside(root, absolute);
		const resolved = await realpath(absolute);
		CsvReferentialRepository.assertInside(root, resolved);
		return resolved;
	}

	private static assertInside(root: string, candidate: string): void {
		const child = relative(root, candidate);
		if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) {
			throw new Error("Referential path must stay inside the checkout");
		}
	}
}
