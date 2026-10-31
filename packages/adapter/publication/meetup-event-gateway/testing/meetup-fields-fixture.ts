export function fieldsForm(
	hosts: readonly string[],
	topics: readonly string[],
	candidates: readonly string[],
	leaders: readonly string[],
): string {
	return `<div id="topics-panel"><div><div><div><input placeholder="Search topics (max 5)..."></div></div></div><div id="topic-chips"></div></div>
<div id="hosts"><div><div><input placeholder="Search hosts..." oninput="searchHosts(this.value)"><ul id="host-search-dropdown" hidden></ul></div><div id="selected-hosts"></div><div id="suggested-hosts"></div></div></div>
<script>
let selectedHosts=${JSON.stringify(hosts).replaceAll("<", "\\u003c")}, selectedTopics=${JSON.stringify(topics).replaceAll("<", "\\u003c")};
const topicCandidates=${JSON.stringify(candidates).replaceAll("<", "\\u003c")}, leaders=${JSON.stringify(leaders).replaceAll("<", "\\u003c")};
function renderTopics(){
 const parent=document.getElementById('topic-chips');parent.replaceChildren();
 for(const topic of [...new Set([...selectedTopics,...topicCandidates])]){
  const selected=selectedTopics.includes(topic);if(!selected&&selectedTopics.length>=5)continue;
  const button=document.createElement('button');button.type='button';button.textContent=topic;button.setAttribute('aria-pressed',String(selected));
  button.onclick=()=>{selectedTopics=selected?selectedTopics.filter(t=>t!==topic):[...selectedTopics,topic];renderTopics();};parent.append(button);
 }
}
function renderHosts(){
 const parent=document.getElementById('selected-hosts');parent.replaceChildren();
 for(const name of selectedHosts){
  const chip=document.createElement('div'), info=document.createElement('div'), label=document.createElement('p');label.textContent=name;info.append(label);chip.append(info);
  if(selectedHosts.length>1){const remove=document.createElement('button');remove.setAttribute('aria-label','Remove '+name+' as host');remove.onclick=()=>{selectedHosts=selectedHosts.filter(n=>n!==name);renderHosts();};chip.append(remove);}
  parent.append(chip);
 }
}
function searchHosts(query){
 const list=document.getElementById('host-search-dropdown');list.replaceChildren();list.hidden=query.length<2;
 for(const name of leaders.filter(n=>n.includes(query)&&!selectedHosts.includes(n))){
  const li=document.createElement('li'), label=document.createElement('p');label.textContent=name;li.append(label);li.onclick=()=>{selectedHosts.push(name);list.hidden=true;document.querySelector('[placeholder="Search hosts..."]').value='';renderHosts();};list.append(li);
 }
}
renderTopics();renderHosts();
</script>`;
}

export function leadershipPage(
	leaders: readonly string[],
	pageSize: number,
): string {
	return `<main><a href="?op=leaders">${leaders.length} leadership team</a><div id="members"></div><div style="height:1600px"></div></main>
<script>
const names=${JSON.stringify(leaders).replaceAll("<", "\\u003c")};let shown=0;
function append(){for(let i=0;i<${pageSize}&&shown<names.length;i++,shown++){const card=document.createElement('div');card.setAttribute('role','link');card.style.height='300px';const link=document.createElement('a');link.href='/members/'+(shown+1)+'/';link.textContent=names[shown];card.append(link);document.getElementById('members').append(card);}}
append();window.addEventListener('scroll',()=>setTimeout(append,25));
</script>`;
}
