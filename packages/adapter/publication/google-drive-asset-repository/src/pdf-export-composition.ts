import { PublicationDomainComposition } from "@meetup-automation/publication";
import { DriveBoundedStream } from "./drive-bounded-stream.js";
import { DrivePdfBinary } from "./drive-pdf-binary.js";
import { DrivePdfLookup } from "./drive-pdf-lookup.js";
import { DrivePdfMetadata } from "./drive-pdf-metadata.js";
import { DrivePdfStateCodec } from "./drive-pdf-state-codec.js";
import type { GoogleDriveClient } from "./google-drive-asset-repository-contracts.js";
import { GoogleDrivePdfRepository } from "./google-drive-pdf-repository.js";
import { GoogleDrivePdfSource } from "./google-drive-pdf-source.js";
import { GoogleDrivePdfStateRepository } from "./google-drive-pdf-state-repository.js";
import { GoogleDrivePublicFolder } from "./google-drive-public-folder.js";

export class GoogleDrivePdfComposition {
	constructor(
		private readonly client: GoogleDriveClient,
		private readonly publicFolderId: string,
	) {}

	metadata(): DrivePdfMetadata {
		return new DrivePdfMetadata();
	}
	stream(): DriveBoundedStream {
		return new DriveBoundedStream();
	}
	binary(): DrivePdfBinary {
		return new DrivePdfBinary(
			this.stream(),
			new PublicationDomainComposition().contentFingerprint(),
		);
	}
	lookup(): DrivePdfLookup {
		return new DrivePdfLookup(this.client, this.metadata(), this.folders());
	}
	folders(): GoogleDrivePublicFolder {
		return new GoogleDrivePublicFolder(
			this.client,
			this.metadata(),
			this.publicFolderId,
		);
	}
	codec(): DrivePdfStateCodec {
		return new DrivePdfStateCodec(
			this.metadata(),
			new PublicationDomainComposition().pdfExportPolicy(),
		);
	}
	source(): GoogleDrivePdfSource {
		return new GoogleDrivePdfSource(
			this.client,
			this.lookup(),
			this.metadata(),
			this.binary(),
			this.stream(),
		);
	}
	repository(): GoogleDrivePdfRepository {
		return new GoogleDrivePdfRepository(
			this.client,
			this.lookup(),
			this.metadata(),
			this.binary(),
			this.folders(),
		);
	}
	states(): GoogleDrivePdfStateRepository {
		return new GoogleDrivePdfStateRepository(
			this.client,
			this.lookup(),
			this.metadata(),
			this.stream(),
			this.codec(),
		);
	}
}
