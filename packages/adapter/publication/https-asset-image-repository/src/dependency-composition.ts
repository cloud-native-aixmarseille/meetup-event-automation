import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { BoundedImageDownload } from "./bounded-image-download.js";
import { HttpsAssetImageRepository } from "./https-asset-image-repository.js";
import { HttpsContentImageLoader } from "./https-content-image-loader.js";
import { PublicImageUrl } from "./public-image-url.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class HttpsAssetImageRepositoryComposition {
	contentImageLoader(): HttpsContentImageLoader {
		return new HttpsContentImageLoader(this.boundedImageDownload());
	}
	boundedImageDownload(
		resolve: typeof lookup = lookup,
		send: typeof request = request,
	): BoundedImageDownload {
		return new BoundedImageDownload(
			{ publicImageUrl: this.publicImageUrl() },
			resolve,
			send,
		);
	}
	httpsAssetImageRepository(): HttpsAssetImageRepository {
		return new HttpsAssetImageRepository(
			{
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
			},
			this.boundedImageDownload(),
		);
	}
	publicImageUrl(): PublicImageUrl {
		return new PublicImageUrl();
	}
}
