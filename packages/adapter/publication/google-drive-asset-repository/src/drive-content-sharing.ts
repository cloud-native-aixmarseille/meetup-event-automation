import type { drive_v3 } from "@googleapis/drive";
import { ContentMediaChangedError } from "@meetup-automation/publication";
import { requestOptions } from "./google-drive-asset-repository-contracts.js";

/** Public reader access for verified managed artwork, never its parent folder. */
export class DriveContentSharing {
	constructor(private readonly client: Pick<drive_v3.Drive, "permissions">) {}
	async ensure(fileId: string): Promise<void> {
		if (await this.readable(fileId)) return;
		await this.client.permissions.create(
			{
				fileId,
				supportsAllDrives: true,
				requestBody: {
					type: "anyone",
					role: "reader",
					allowFileDiscovery: false,
				},
				fields: "id",
			},
			requestOptions,
		);
		if (!(await this.readable(fileId)))
			throw new ContentMediaChangedError(
				"Public cover reader access could not be verified",
			);
	}
	async readable(fileId: string): Promise<boolean> {
		let pageToken: string | undefined;
		let readable = false;
		const seen = new Set<string>();
		for (let page = 0; page < 10; page++) {
			const { data } = await this.client.permissions.list(
				{
					fileId,
					supportsAllDrives: true,
					pageSize: 100,
					pageToken,
					fields: "nextPageToken,permissions(type,role)",
				},
				requestOptions,
			);
			if (!Array.isArray(data.permissions))
				throw new ContentMediaChangedError(
					"Content permissions are unavailable",
				);
			readable ||= data.permissions.some(
				(permission) =>
					permission.type === "anyone" && permission.role === "reader",
			);
			pageToken = data.nextPageToken ?? undefined;
			if (!pageToken) return readable;
			if (seen.has(pageToken)) break;
			seen.add(pageToken);
		}
		throw new ContentMediaChangedError(
			"Content permission listing is incomplete",
		);
	}
}
