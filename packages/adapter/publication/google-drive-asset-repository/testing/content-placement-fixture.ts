import { createHash } from "node:crypto";
import type { drive_v3 } from "@googleapis/drive";
import { vi } from "vitest";
import { DriveContentImage } from "../src/drive-content-image.js";
import { DriveContentSharing } from "../src/drive-content-sharing.js";
import { DriveContentLocation } from "../src/drive-content-location.js";
import { GoogleDriveContentMediaStore } from "../src/google-drive-content-media-store.js";

export function contentPlacementFixture() {
	const bytes = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		"base64",
	);
	const image = new DriveContentImage();
	const media = {
		...image.inspect({ bytes, mimeType: "image/png" }),
		id: "selected-cover",
		mimeType: "image/png" as const,
		url: "https://drive.google.com/uc?export=download&id=selected-cover",
		description: "Approved artwork",
		sourceRevision: "1",
	};
	const key = createHash("sha256")
		.update("example/meetups#42:assets:v1")
		.digest("hex");
	const folder: drive_v3.Schema$File = {
		id: "event-folder",
		mimeType: "application/vnd.google-apps.folder",
		appProperties: { meetup_event_key: key },
	};
	const file: drive_v3.Schema$File = {
		id: media.id,
		name: "candidate.png",
		mimeType: media.mimeType,
		description: media.description,
		version: "1",
		parents: ["tmp-covers"],
		appProperties: { contentSchema: "1", contentHash: media.fingerprint },
	};
	let directReader = false;
	const get = vi.fn(async (input: drive_v3.Params$Resource$Files$Get) => ({
		status: 200,
		data: input.alt
			? "image-stream"
			: structuredClone(input.fileId === folder.id ? folder : file),
	}));
	const update = vi.fn(async (input: drive_v3.Params$Resource$Files$Update) => {
		const properties = {
			...file.appProperties,
			...input.requestBody?.appProperties,
		};
		Object.assign(file, input.requestBody);
		file.appProperties = properties;
		if (input.addParents) {
			file.parents = [input.addParents];
			directReader = false;
		}
		file.version = String(Number(file.version) + 1);
		return { data: structuredClone(file) };
	});
	const share = vi.fn(async () => {
		directReader = true;
		return { data: { id: "anyone" } };
	});
	const list = vi.fn(async () => ({
		data: {
			permissions:
				directReader || file.parents?.[0] === "tmp-covers"
					? [{ type: "anyone", role: "reader" }]
					: [],
		},
	}));
	const client = {
		files: { get, update },
		permissions: { create: share, list },
	} as unknown as drive_v3.Drive;
	const folders = { resolve: async () => "tmp-covers" };
	const sharing = new DriveContentSharing(client);
	const location = new DriveContentLocation(client, folders, sharing);
	const store = new GoogleDriveContentMediaStore(
		client,
		folders,
		image,
		{ read: async () => bytes },
		{ verify: vi.fn() },
		location,
		sharing,
	);
	const input = {
		media,
		container: {
			id: "event-folder",
			name: "Event",
			eventId: "example/meetups#42",
			url: "https://drive.google.com/drive/folders/event-folder",
		},
		name: "2099-11-05 - Cover.png",
	};
	return {
		bytes,
		file,
		folder,
		media,
		key,
		input,
		get,
		update,
		share,
		list,
		location,
		store,
		sharing,
	};
}
