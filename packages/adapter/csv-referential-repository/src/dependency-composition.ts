import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { CsvReferentialCodec } from "./csv-referential-codec.js";
import {
	CsvReferentialRepository,
	type CsvReferentialRepositoryArguments,
} from "./csv-referential-repository.js";
import {
	CsvSpeakerCatalogStore,
	type CsvSpeakerCatalogStoreArguments,
} from "./csv-speaker-catalog-store.js";
import {
	SpeakerAllocationHistory,
	type SpeakerAllocationHistoryArguments,
} from "./speaker-allocation-history.js";
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
	csvSpeakerCatalogStore(
		...args: CsvSpeakerCatalogStoreArguments
	): CsvSpeakerCatalogStore {
		return new CsvSpeakerCatalogStore(
			{
				speakerCatalogCsv: this.speakerCatalogCsv(),
				speakerAllocationStateCodec: this.speakerAllocationStateCodec(),
				createSpeakerAllocationHistory: (...args) =>
					this.speakerAllocationHistory(...args),
				createCsvReferentialRepository: (...args) =>
					this.csvReferentialRepository(...args),
			},
			...args,
		);
	}
	speakerAllocationHistory(
		...args: SpeakerAllocationHistoryArguments
	): SpeakerAllocationHistory {
		return new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			...args,
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
