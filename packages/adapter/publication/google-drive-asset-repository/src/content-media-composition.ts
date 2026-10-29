import { drive } from "@googleapis/drive";
import type {
	AssetFileName,
	ContentImageLoader,
} from "@meetup-automation/publication";
import { DriveAnnouncementImage } from "./drive-announcement-image.js";
import { DriveBoundedStream } from "./drive-bounded-stream.js";
import { DriveContentImage } from "./drive-content-image.js";
import { GoogleDriveAuthentication } from "./google-drive-authentication.js";
import { GoogleDriveContentMediaStore } from "./google-drive-content-media-store.js";
import { GoogleDrivePublicAssetFolder } from "./google-drive-public-asset-folder.js";

export class GoogleDriveContentMediaComposition {
	create(
		credentials: string,
		folderId: string,
		loader: ContentImageLoader,
		names: Pick<AssetFileName, "render">,
	): GoogleDriveContentMediaStore {
		const client = drive({
			version: "v3",
			auth: new GoogleDriveAuthentication().create(credentials),
		});
		return new GoogleDriveContentMediaStore(
			client,
			new GoogleDrivePublicAssetFolder(client, folderId, "tmp-covers"),
			new DriveContentImage(),
			new DriveBoundedStream(),
			this.announcement(credentials, loader, names),
		);
	}
	announcement(
		credentials: string,
		loader: ContentImageLoader,
		names: Pick<AssetFileName, "render">,
	): DriveAnnouncementImage {
		return new DriveAnnouncementImage(
			drive({
				version: "v3",
				auth: new GoogleDriveAuthentication().create(credentials),
			}),
			loader,
			new DriveContentImage(),
			names,
		);
	}
}
