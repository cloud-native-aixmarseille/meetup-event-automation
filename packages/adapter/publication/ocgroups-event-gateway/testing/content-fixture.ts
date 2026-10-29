export const speaker = {
	userId: "50000000-0000-4000-8000-000000000005",
	username: "example-speaker",
};
export const sponsor = {
	id: "60000000-0000-4000-8000-000000000006",
	name: "Example Sponsor",
	level: "Host",
};

export function contentForm(data: Record<string, string>) {
	const hidden = Object.entries(data).filter(([name]) =>
		/^(photos_urls|speakers\[|sponsors\[)/.test(name),
	);
	const inputs = (prefix: string) =>
		hidden
			.filter(([name]) => name.startsWith(prefix))
			.map(
				([name, value]) =>
					`<input type="hidden" name="${name}" value="${value}">`,
			)
			.join("");
	return `<button data-section="hosts-sponsors">Contributors</button>
 <gallery-field field-name="photos_urls">${inputs("photos_urls")}<input type="file" onchange="uploadPhoto(this)"></gallery-field>
 <div id="event-speakers-selector">${inputs("speakers[")}
 <button onclick="document.querySelector('session-speaker-modal').hidden=false">Add speaker</button>
 <session-speaker-modal hidden><h3>Add speaker</h3><input data-user-search-input>
 <div data-user-search-dropdown><button onclick="this.setAttribute('data-selected','true')">@${speaker.username}</button></div>
 <button onclick="addSpeaker()">Add speaker</button></session-speaker-modal></div>
 <sponsors-section>${inputs("sponsors[")}<input placeholder="Search sponsors">
 <div data-sponsor-search-dropdown><button onclick="document.querySelector('#sponsor-level-input').hidden=false;document.querySelector('#sponsor-add').hidden=false">${sponsor.name}</button></div>
 <input id="sponsor-level-input" hidden><button id="sponsor-add" hidden onclick="addSponsor()">Add</button></sponsors-section>
 <script>
 function addHidden(parent,name,value){const field=document.createElement('input');field.type='hidden';field.name=name;field.value=value;parent.appendChild(field);}
 async function uploadPhoto(input){const payload=new FormData();payload.append('file',input.files[0]);const response=await fetch('/images',{method:'POST',body:payload});const result=await response.json();addHidden(input.parentElement,'photos_urls[]',result.url);}
 function addSpeaker(){const section=document.querySelector('#event-speakers-selector');const index=section.querySelectorAll('input[name$="[user_id]"]').length;addHidden(section,'speakers['+index+'][user_id]','${speaker.userId}');addHidden(section,'speakers['+index+'][featured]','false');section.querySelector('session-speaker-modal').hidden=true;}
 function addSponsor(){const section=document.querySelector('sponsors-section');const index=section.querySelectorAll('input[name$="[group_sponsor_id]"]').length;addHidden(section,'sponsors['+index+'][group_sponsor_id]','${sponsor.id}');addHidden(section,'sponsors['+index+'][level]',document.querySelector('#sponsor-level-input').value);document.querySelector('#sponsor-level-input').hidden=true;document.querySelector('#sponsor-add').hidden=true;}
 </script>`;
}
