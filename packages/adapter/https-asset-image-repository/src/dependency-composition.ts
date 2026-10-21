import { PublicationDomainComposition } from "@meetup-automation/publication";
import {
	BoundedImageDownload,
	type BoundedImageDownloadArguments,
} from "./bounded-image-download.js";
import {
	HttpsAssetImageRepository,
	type HttpsAssetImageRepositoryArguments,
} from "./https-asset-image-repository.js";
import { PublicImageUrl } from "./public-image-url.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class HttpsAssetImageRepositoryComposition {
	boundedImageDownload(
		...args: BoundedImageDownloadArguments
	): BoundedImageDownload {
		return new BoundedImageDownload(
			{ publicImageUrl: this.publicImageUrl() },
			...args,
		);
	}
	httpsAssetImageRepository(
		...args: HttpsAssetImageRepositoryArguments
	): HttpsAssetImageRepository {
		return new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
				createBoundedImageDownload: (...args) =>
					this.boundedImageDownload(...args),
			},
			...args,
		);
	}
	publicImageUrl(): PublicImageUrl {
		return new PublicImageUrl();
	}
}
