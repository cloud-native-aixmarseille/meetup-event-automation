import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type {
	RawReferentialCatalog,
	ReferentialRepository,
} from "@meetup-automation/referential";
import type { CsvReferentialCodec } from "./csv-referential-codec.js";
import type { CsvReferentialRepositoryOptions } from "./csv-referential-repository-contracts.js";

export interface CsvReferentialRepositoryCollaborators {
	readonly csvReferentialCodec: Pick<CsvReferentialCodec, "decode">;
}

export class CsvReferentialRepository implements ReferentialRepository {
	constructor(
		private readonly collaborators: CsvReferentialRepositoryCollaborators,
		private readonly options: CsvReferentialRepositoryOptions,
	) {}

	async load(): Promise<RawReferentialCatalog> {
		const [hostsSource, speakersSource] = await Promise.all([
			readFile(
				await this.localPath(
					this.options.workspaceRoot,
					this.options.hostsPath,
				),
				"utf8",
			),
			readFile(
				await this.localPath(
					this.options.workspaceRoot,
					this.options.speakersPath,
				),
				"utf8",
			),
		]);

		return this.collaborators.csvReferentialCodec.decode(
			hostsSource,
			speakersSource,
			this.options.hostsPath,
			this.options.speakersPath,
		);
	}

	private async localPath(
		rootInput: string,
		relativeInput: string,
	): Promise<string> {
		const root = await realpath(resolve(rootInput));
		const absolute = resolve(root, relativeInput);
		this.assertInside(root, absolute);
		const resolved = await realpath(absolute);
		this.assertInside(root, resolved);
		return resolved;
	}

	private assertInside(root: string, candidate: string): void {
		const child = relative(root, candidate);
		if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) {
			throw new Error("Referential path must stay inside the checkout");
		}
	}
}
export type CsvReferentialRepositoryArguments =
	ConstructorParameters<typeof CsvReferentialRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
