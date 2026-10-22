import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { CsvReferentialCodec } from "./csv-referential-codec.js";
import {
	CsvReferentialRepository,
	type CsvReferentialRepositoryArguments,
} from "./csv-referential-repository.js";
import { CsvSpeakerCatalogStore } from "./csv-speaker-catalog-store.js";
import { SpeakerAllocationHistory } from "./speaker-allocation-history.js";
import { SpeakerAllocationStateCodec } from "./speaker-allocation-state-codec.js";
import { SpeakerCatalogCsv } from "./speaker-catalog-csv.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class CsvReferentialRepositoryComposition {
	csvReferentialCodec(): CsvReferentialCodec {
		return new CsvReferentialCodec();
	}
	csvReferentialRepository(
		...args: CsvReferentialRepositoryArguments
	): CsvReferentialRepository {
		return new CsvReferentialRepository(
			{ csvReferentialCodec: this.csvReferentialCodec() },
			...args,
		);
	}
	csvSpeakerCatalogStore(root: string): CsvSpeakerCatalogStore {
		return new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv: this.speakerCatalogCsv(),
				speakerAllocationStateCodec: this.speakerAllocationStateCodec(),
				createCsvReferentialRepository: (...args) =>
					this.csvReferentialRepository(...args),
			},
			root,
			this.speakerAllocationHistory(root),
		);
	}
	speakerAllocationHistory(root: string): SpeakerAllocationHistory {
		return new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			root,
			promisify(execFile),
		);
	}
	speakerAllocationStateCodec(): SpeakerAllocationStateCodec {
		return new SpeakerAllocationStateCodec({
			referentialIdentifiers:
				new ReferentialDomainComposition().referentialIdentifiers(),
		});
	}
	speakerCatalogCsv(): SpeakerCatalogCsv {
		return new SpeakerCatalogCsv();
	}
}
