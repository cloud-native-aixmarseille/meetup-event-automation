import { createHash } from "node:crypto";
import type {
	ContentImageBytes,
	ContentMedia,
	MeetupCoverJournal,
	MeetupCoverRecord,
} from "@meetup-automation/publication";
import { vi } from "vitest";

export const coverImage: ContentImageBytes = {
	mimeType: "image/png",
	bytes: Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVd0AAAAASUVORK5CYII=",
		"base64",
	),
};
export const cover: ContentMedia = {
	id: "approved-cover",
	url: "https://images.example.test/cover.png",
	fingerprint: createHash("sha256").update(coverImage.bytes).digest("hex"),
	description: "Approved event illustration",
	mimeType: "image/png",
	width: 1,
	height: 1,
	sourceRevision: "reviewed-revision",
};

export function coverJournal(initial?: MeetupCoverRecord) {
	let record = initial;
	return {
		readCover: vi
			.fn<MeetupCoverJournal["readCover"]>()
			.mockImplementation(async () => record),
		reserveCover: vi
			.fn<MeetupCoverJournal["reserveCover"]>()
			.mockImplementation(async (value) => {
				record = value;
			}),
		recordCover: vi
			.fn<MeetupCoverJournal["recordCover"]>()
			.mockImplementation(async (value) => {
				record = value;
			}),
	};
}

export function coverForm(photoId: string | undefined, delay: number) {
	return `<div id="cover-area"></div><script>
let photoId=${JSON.stringify(photoId ?? "")};
function renderCover(){document.getElementById('cover-area').innerHTML=photoId?
'<div><div><div style="background-image:url(https://secure.meetupstatic.com/photos/event/a/600_'+photoId+'.jpeg);width:200px;height:100px"></div></div><button onclick="openCoverMenu()">Edit cover</button></div>':
'<button onclick="openCoverPicker()">imagePlusFilled icon Select</button>';}
function openCoverMenu(){document.getElementById('cover-area').insertAdjacentHTML('beforeend','<div role="menu"><button onclick="this.parentElement.remove();openCoverPicker()">Replace</button></div>');}
function openCoverPicker(){document.body.insertAdjacentHTML('beforeend','<div role="dialog"><button>Choose photo</button><input type="file" onchange="showCrop()"></div>');}
function showCrop(){document.querySelector('[role=dialog]').innerHTML='<button onclick="uploadCover()">Save</button>';}
async function uploadCover(){const result=await fetch('/__synthetic-cover-upload',{method:'POST'});photoId=(await result.json()).photoId;document.querySelector('[role=dialog]').remove();renderCover();}
if (${delay}) setTimeout(renderCover,${delay}); else renderCover();
</script>`;
}
