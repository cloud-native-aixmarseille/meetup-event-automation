import type { drive_v3 } from "@googleapis/drive";
import { PdfExportError } from "@meetup-automation/publication";
import { requestOptions } from "./google-drive-asset-repository-contracts.js";

/** Grants unlisted reader access to one verified managed PDF, never its parent. */
export class GoogleDrivePdfSharing {
	constructor(private readonly client: Pick<drive_v3.Drive, "permissions">) {}

	async ensure(fileId: string): Promise<boolean> {
		if (!/^[\w-]{1,120}$/.test(fileId)) throw new PdfExportError("invalid");
		try {
			return await this.grant(fileId);
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"response" in error &&
				error.response &&
				typeof error.response === "object" &&
				"status" in error.response &&
				error.response.status === 403
			)
				throw new PdfExportError("sharing");
			throw error;
		}
	}

	private async grant(fileId: string): Promise<boolean> {
		if (await this.readable(fileId)) return false;
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
		if (!(await this.readable(fileId))) throw new PdfExportError("sharing");
		return true;
	}

	private async readable(fileId: string): Promise<boolean> {
		let pageToken: string | undefined;
		const seen = new Set<string>();
		const publicPermissions: drive_v3.Schema$Permission[] = [];
		for (let page = 0; page < 10; page++) {
			const { data } = await this.client.permissions.list(
				{
					fileId,
					supportsAllDrives: true,
					pageSize: 100,
					pageToken,
					fields:
						"nextPageToken,permissions(type,role,allowFileDiscovery,view)",
				},
				requestOptions,
			);
			if (!Array.isArray(data.permissions)) throw new PdfExportError("invalid");
			publicPermissions.push(
				...data.permissions.filter((p) => p.type === "anyone"),
			);
			pageToken = data.nextPageToken ?? undefined;
			if (!pageToken) return this.verified(publicPermissions);
			if (seen.has(pageToken)) throw new PdfExportError("invalid");
			seen.add(pageToken);
		}
		throw new PdfExportError("invalid");
	}

	private verified(
		permissions: readonly drive_v3.Schema$Permission[],
	): boolean {
		if (permissions.length === 0) return false;
		const permission = permissions[0];
		if (
			permissions.length !== 1 ||
			permission?.role !== "reader" ||
			permission.allowFileDiscovery === true ||
			permission.view
		)
			throw new PdfExportError("sharing");
		return true;
	}
}
