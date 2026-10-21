import * as G from './geometry.mjs';
import {analyze} from './topology.mjs';
const $=s=>document.getElementById(s),canvas=$('disk'),ctx=canvas.getContext('2d'),TAU=2*Math.PI;
const colors={primary:'#66d4ca',vertex:'#f3c66a',dual:'#9b8fea',center:'#f28eb4',crossing:'#c2e9ef',radial:'#d29570'};
let visible={primary:true,vertex:true,dual:true,center:true,crossing:true,radial:true,shading:true};
let mesh,labels={},pairs=[],selected=new Set(),mode='inspect',camera={A:[1,0],B:[0,0]},rotation=0,hover=null,listHover=[],edgeSelection=new Set(),pending=null,active=null,drag=null,size={w:0,h:0,c:[0,0],r:1},projected=new Map(),pickables=[],dirty=false,saveTimer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),5000)}
function transform(z,c=camera){return G.div(G.add(G.mul(c.A,z),c.B),G.add(G.mul(G.conj(c.B),z),G.conj(c.A)))}
function compose(c,d){let A=G.add(G.mul(c.A,d.A),G.mul(c.B,G.conj(d.B))),B=G.add(G.mul(c.A,d.B),G.mul(c.B,G.conj(d.A))),n=Math.sqrt(Math.max(1e-16,G.norm(A)**2-G.norm(B)**2));return {A:G.scale(A,1/n),B:G.scale(B,1/n)}}
const shift=a=>({A:[1/Math.sqrt(1-G.norm(a)**2),0],B:G.scale(a,1/Math.sqrt(1-G.norm(a)**2))});
const turn=t=>({A:[Math.cos(t/2),Math.sin(t/2)],B:[0,0]});
function screen(z){return [size.c[0]+size.r*z[0],size.c[1]-size.r*z[1]]}
function diskPoint(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left-size.c[0])/size.r,-(e.clientY-r.top-size.c[1])/size.r]}
function appendGeo(path,a,b,move=false){let [x,y]=screen(a),[u,v]=screen(b);if(move)path.moveTo(x,y);const det=a[0]*b[1]-a[1]*b[0];if(Math.abs(det)<1e-10||G.norm(G.sub(a,b))<1e-8){path.lineTo(u,v);return}let aa=(1+G.norm(a)**2)/2,bb=(1+G.norm(b)**2)/2,c=[(aa*b[1]-bb*a[1])/det,(a[0]*bb-b[0]*aa)/det],r=G.norm(G.sub(a,c)),s=screen(c),t1=Math.atan2(y-s[1],x-s[0]),t2=Math.atan2(v-s[1],u-s[0]),d=((t2-t1+3*Math.PI)%TAU)-Math.PI;if(!Number.isFinite(r)||r>1e6){path.lineTo(u,v);return}path.arc(s[0],s[1],r*size.r,t1,t1+d,d<0)}
function polygon(ids){let path=new Path2D();for(let i=0;i<ids.length;i++)appendGeo(path,projected.get(ids[i]),projected.get(ids[(i+1)%ids.length]),i===0);path.closePath();return path}
function object(id){return mesh.dots.get(id)||mesh.edges.get(id)}
function pairGroups(){const groups=new Map();for(const p of pairs){if(!groups.has(p.group))groups.set(p.group,{id:p.group,name:p.name,records:[]});groups.get(p.group).records.push(p)}return [...groups.values()]}
function groupEdges(group){return group.records.flatMap(p=>[p.e1,p.e2])}
function pairMark(i){return {color:`hsl(${(Math.floor(i/3)*360/Math.max(1,Math.ceil(pairGroups().length/3))+15)%360} 85% 69%)`,n:i%3+1}}
function edgeGroup(id){return pairGroups().find(g=>g.records.some(p=>p.e1===id||p.e2===id))}
function displayName(id){return labels[id]||edgeGroup(id)?.name||'Unlabeled'}
function nextGroupId(){let n=1;const used=new Set(pairs.map(p=>p.group));while(used.has('g'+n))n++;return 'g'+n}
function render(){dirty=false;const {w,h,r,c}=size;ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(...c,r,0,TAU);ctx.fillStyle='#0e2029';ctx.fill();ctx.clip();projected=new Map([...mesh.dots].map(([id,d])=>[id,transform(d.z)]));pickables=[];
const contrast=+$('contrast').value;
for(const f of mesh.faces){const z=projected.get(f.c);if(G.norm(z)>.9985)continue;if(visible.shading){for(const tri of f.triangles){ctx.fillStyle=tri[3]?`rgba(117,163,181,${.08+.29*contrast})`:'#122932';ctx.fill(polygon(tri.slice(0,3)))}}}
const regionBoundary=new Map();
for(const id of selected){
  const t=mesh.triangleById.get(id);if(!t)continue;
  ctx.fillStyle='#cfbc6255';ctx.fill(polygon(t.vertices));
  for(const e of t.edges)regionBoundary.set(e,(regionBoundary.get(e)||0)+1);
}
ctx.strokeStyle='#ffe394';ctx.lineWidth=1.3;
for(const [id,count]of regionBoundary){if(count!==1)continue;const e=mesh.edges.get(id),path=new Path2D();appendGeo(path,projected.get(e.a),projected.get(e.b),true);ctx.stroke(path)}
const edgeWidth=+$('width').value;
function strokeEdge(e,color,mult=1){const a=projected.get(e.a),b=projected.get(e.b),mid=G.midpoint(a,b),rs=G.norm(mid);if(rs>.999||(!visible[e.type]&&mult===1))return;const n=Math.max(2,Math.min(18,Math.ceil(G.norm(G.sub(a,b))*r/14)));ctx.strokeStyle=color;ctx.globalAlpha=e.type==='radial'&&mult===1?0.55:1;ctx.lineCap='round';for(let i=0;i<n;i++){const u=G.interpolate(a,b,i/n),v=G.interpolate(a,b,(i+1)/n),m=G.midpoint(u,v),width=edgeWidth*(e.type==='radial'?+$('radialWidth').value:1)*(1-G.norm(m)**2)*r/2*mult;if(width<.055)continue;ctx.lineWidth=width;let path=new Path2D();appendGeo(path,u,v,true);ctx.stroke(path)}ctx.globalAlpha=1}
for(const e of mesh.edges.values()){const a=projected.get(e.a),b=projected.get(e.b);strokeEdge(e,colors[e.type]);const mid=G.midpoint(a,b),len=G.norm(G.sub(a,b))*r;if(visible[e.type]&&G.norm(mid)<.94&&len>11){pickables.push({id:e.id,a:screen(a),b:screen(b),z:mid,edge:true})}}
const groups=pairGroups();
for(let i=0;i<groups.length;i++){
  const group=groups[i],{color,n}=pairMark(i);
  for(const id of groupEdges(group))strokeEdge(mesh.edges.get(id),color,2.5);
  const sides=G.identificationSides(mesh,groupEdges(group));
  for(const side of sides){
    const start=side.ends.find(v=>group.records.some(p=>(side.edges.includes(p.e1)&&p.v1===v)||(side.edges.includes(p.e2)&&p.v2===v)));
    const a=projected.get(start),b=projected.get(side.ends.find(v=>v!==start)),mid=G.midpoint(a,b);
    if(G.norm(mid)>.98)continue;
    const len=G.norm(G.sub(a,b))*r;if(len<8)continue;
    for(let j=0;j<n;j++){
      const t=.5+(j-(n-1)/2)*Math.min(.16,7/len),m=G.interpolate(a,b,t),s=screen(m),u=screen(G.interpolate(a,b,Math.min(.98,t+.01))),ang=Math.atan2(u[1]-s[1],u[0]-s[0]),sz=Math.min(5,len/5);
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(.7,Math.min(2,len/15));ctx.beginPath();ctx.moveTo(s[0]-sz*Math.cos(ang-.65),s[1]-sz*Math.sin(ang-.65));ctx.lineTo(...s);ctx.lineTo(s[0]-sz*Math.cos(ang+.65),s[1]-sz*Math.sin(ang+.65));ctx.stroke();
    }
  }
}
const hr=+$('radius').value,t=Math.tanh(hr/2);
for(const [id,d]of mesh.dots){if(!visible[d.type])continue;const z=projected.get(id),r2=G.norm(z)**2;if(r2>.9995)continue;const rr=(1-r2)*t/(1-r2*t*t)*r;if(rr<.07)continue;const center=G.scale(z,(1-t*t)/(1-r2*t*t)),s=screen(center);ctx.beginPath();ctx.arc(...s,rr,0,TAU);ctx.fillStyle=colors[d.type];ctx.fill();if(G.norm(z)<.94&&rr>.65)pickables.push({id,z,s:screen(z),radius:rr,edge:false})}
for(const id of new Set([hover?.id,...listHover,...edgeSelection,...orientationDots(),active])){if(!id||!object(id))continue;ctx.strokeStyle='#ffffff';ctx.lineWidth=edgeSelection.has(id)?3:2;if(mesh.dots.has(id)){ctx.beginPath();ctx.arc(...screen(projected.get(id)),7,0,TAU);ctx.stroke()}else{const e=mesh.edges.get(id);let path=new Path2D();appendGeo(path,projected.get(e.a),projected.get(e.b),true);ctx.stroke(path)}}
ctx.restore();ctx.beginPath();ctx.arc(...c,r,0,TAU);ctx.strokeStyle='#53737c';ctx.lineWidth=1;ctx.stroke();const handle=screen(G.rotate([1,0],Math.PI/2+rotation));ctx.beginPath();ctx.arc(...handle,8,0,TAU);ctx.fillStyle='#a9e5d4';ctx.fill();ctx.strokeStyle='#143333';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(...handle,2,0,TAU);ctx.fillStyle='#244c48';ctx.fill();$('viewInfo').textContent=pending?'Orient selected edges':edgeSelection.size?edgeSelection.size+' segments selected':mode==='region'?'Region Construction':'Drag to travel';}
function requestRender(){if(!dirty){dirty=true;requestAnimationFrame(render)}}
function resize(){let box=$('canvasWrap').getBoundingClientRect(),dpr=devicePixelRatio||1;canvas.width=box.width*dpr;canvas.height=box.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);size={w:box.width,h:box.height,c:[box.width/2,box.height/2],r:Math.max(30,Math.min(box.width,box.height)/2-28)};requestRender()}
function pick(z){const s=screen(z);if(pending){let nearest=null,best=10;for(const id of orientationDots()){const d=G.norm(G.sub(s,screen(projected.get(id))));if(d<best){nearest={id,edge:false};best=d}}if(nearest)return nearest}if(G.norm(z)>.94)return null;let best=null,min=Infinity;for(const o of pickables){let d;if(!o.edge){d=G.norm(G.sub(s,o.s));if(d<(mode==='region'?Math.max(2,o.radius+1):Math.max(5,o.radius+3))&&d<min){best=o;min=d}}}if(best)return best;for(const o of pickables){if(!o.edge)continue;const e=mesh.edges.get(o.id),a=projected.get(e.a),b=projected.get(e.b);let prev=screen(a),dist=Infinity;for(let i=1;i<=10;i++){const next=screen(G.interpolate(a,b,i/10)),v=G.sub(next,prev),w=G.sub(s,prev),t=Math.max(0,Math.min(1,(w[0]*v[0]+w[1]*v[1])/(v[0]**2+v[1]**2)));dist=Math.min(dist,G.norm(G.sub(s,G.add(prev,G.scale(v,t)))));prev=next}if(dist<(mode==='region'?2:5)&&dist<min){best=o;min=dist}}return best}
function setStatus(s){$('status').textContent=s}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const z=diskPoint(e),handle=G.rotate([1,0],Math.PI/2+rotation);if(G.norm(G.sub(z,handle))*size.r<17){drag={rotate:true,start:Math.atan2(z[1],z[0]),camera,rotation,moved:false,meta:e.metaKey||e.ctrlKey,p:[e.clientX,e.clientY]}}else if(G.norm(z)<.985){drag={z,camera,moved:false,meta:e.metaKey||e.ctrlKey,p:[e.clientX,e.clientY]}}else return;canvas.setPointerCapture(e.pointerId);$('selection').hidden=true;active=null;$('tooltip').hidden=true});
canvas.addEventListener('pointermove',e=>{const z=diskPoint(e);if(drag){if(Math.hypot(e.clientX-drag.p[0],e.clientY-drag.p[1])>3)drag.moved=true;if(drag.rotate){let t=Math.atan2(z[1],z[0])-drag.start;camera=compose(turn(t),drag.camera);rotation=drag.rotation+t}else if(drag.moved){let v=z;if(G.norm(v)>.97)v=G.scale(v,.97/G.norm(v));const candidate=compose(compose(shift(v),shift(G.scale(drag.z,-1))),drag.camera);const worldCenter=G.scale(G.div(candidate.B,candidate.A),-1);if(G.norm(worldCenter)<.975){camera=candidate}else setStatus('Numerical patch limit reached. Reset view or choose a larger patch.')}requestRender();return}hover=pick(z);canvas.style.cursor=G.norm(G.sub(z,G.rotate([1,0],Math.PI/2+rotation)))*size.r<17?'crosshair':hover?'pointer':'grab';if(hover){const ob=object(hover.id);setStatus(`${displayName(hover.id)} · ${ob.type} ${hover.edge?'segment · length '+ob.length.toFixed(4):'dot'}`);if(displayName(hover.id)!=='Unlabeled'){const tip=$('tooltip'),rect=canvas.getBoundingClientRect();tip.textContent=displayName(hover.id);tip.hidden=false;tip.style.left=Math.min(size.w-150,e.clientX-rect.left+15)+'px';tip.style.top=Math.max(5,e.clientY-rect.top-35)+'px'}else $('tooltip').hidden=true}else {$('tooltip').hidden=true;setStatus(mode==='region'?'Click a triangle, an edge, or a dot to add or remove its incident triangles.':'Cmd-click edges to select · click vertices to label · drag to travel')}requestRender()});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved,wasRotate=drag.rotate,meta=drag.meta;drag=null;if(moved||wasRotate){persist();return}const z=diskPoint(e);const hit=pick(z);if(pending){if(hit&&!hit.edge)chooseOrientation(hit.id);else toast('Click a highlighted outer endpoint to specify the orientation.');return}if(meta||e.metaKey||e.ctrlKey){if(hit?.edge)toggleEdge(hit.id);else toast('Cmd-click an edge segment to select it.');return}if(mode==='region'){selectRegion(z,hit);return}if(hit){if(hit.edge){const group=edgeGroup(hit.id);if(group)showGroupEditor(group);else toast('Cmd-click this segment and its partner, then choose Identify.')}else showEditor(hit.id,screen(z))}else {active=null;$('selection').hidden=true;requestRender()}});
canvas.addEventListener('pointercancel',()=>{drag=null});canvas.addEventListener('pointerleave',()=>{if(!drag){hover=null;$('tooltip').hidden=true;requestRender()}});
function selectRegion(z,hit){
  if(G.norm(z)>.94)return;
  // Inverse of the current disk isometry: hit-test in fixed mesh coordinates.
  const world=transform(z,{A:G.conj(camera.A),B:G.scale(camera.B,-1)});
  const triangle=hit?null:G.triangleAt(mesh,world);
  const ids=hit?G.regionTriangles(mesh,hit.id):triangle?[triangle.id]:[];
  if(!ids.length)return;
  const {remove,changed}=G.toggleRegionTriangles(selected,ids);
  updateTopology();persist();requestRender();
  setStatus(`${remove?'Removed':'Added'} ${changed} triangle${changed===1?'':'s'} · ${selected.size} selected`);
}
function centerOn(id){let dot=mesh.dots.get(id);if(!dot)return;const z=transform(dot.z),start=camera,t0=performance.now();function step(now){const t=Math.min(1,(now-t0)/350),w=G.interpolate([0,0],z,t*t*(3-2*t));camera=compose(shift(G.scale(w,-1)),start);requestRender();if(t<1)requestAnimationFrame(step);else persist()}requestAnimationFrame(step)}
function showEditor(id,s=[15,40]){active=id;const ob=object(id),pop=$('selection');pop.hidden=false;pop.style.left=Math.max(4,Math.min(size.w-260,s[0]+12))+'px';pop.style.top=Math.max(4,Math.min(size.h-185,s[1]-25))+'px';pop.innerHTML=`<p>${esc(ob.type)} ${mesh.edges.has(id)?'segment · ℓ = '+ob.length.toFixed(5):'dot'}</p><label>Hover label<input id="labelInput" type="text" maxlength="80" value="${esc(labels[id]||'')}" placeholder="Give this object a name"></label><div class="actions"><button id="saveLabel" class="active">Save label</button>${mesh.dots.has(id)?'<button id="centerDot">Center</button>':''}<button id="closeEditor">×</button></div>`;const input=$('labelInput');input.focus();input.select();function save(){const value=input.value.trim();if(value&&Object.entries(labels).some(([k,v])=>k!==id&&v===value)){toast('Another vertex already has this name.');return}if(value)labels[id]=value;else delete labels[id];pop.hidden=true;active=null;updateLists();persist();requestRender()}$('saveLabel').onclick=save;input.onkeydown=e=>{if(e.key==='Enter')save();if(e.key==='Escape')pop.hidden=true};$('closeEditor').onclick=()=>{pop.hidden=true;active=null;requestRender()};if($('centerDot'))$('centerDot').onclick=()=>{pop.hidden=true;centerOn(id)};requestRender()}
function markHTML(i){let m=pairMark(i);return `<span style="color:${m.color}" title="Identification ${i+1}">${'❯'.repeat(m.n)}</span>`}
function updateLists(){
  listHover=[];
  const query=$('search').value.toLowerCase(),direction=$('sort').value==='desc'?-1:1;
  const sorted=items=>items.filter(x=>x.name.toLowerCase().includes(query)).sort((a,b)=>direction*a.name.localeCompare(b.name,undefined,{numeric:true}));
  const groups=pairGroups();
  $('edgeCount').textContent=groups.length;
  $('vertexCount').textContent=Object.keys(labels).filter(id=>mesh.dots.has(id)).length;
  $('identifiedList').innerHTML=sorted(groups).map(g=>`<div class="object-row" data-pair="${esc(g.id)}"><button class="object-name" data-rename="${esc(g.id)}">${esc(g.name)}</button>${markHTML(groups.findIndex(x=>x.id===g.id))}<button class="tiny" data-remove="${esc(g.id)}" title="Remove identification" aria-label="Remove ${esc(g.name)}">×</button></div>`).join('')||'<div class="empty">Cmd-click segments to select two matching straight chains.</div>';
  $('vertexList').innerHTML=sorted(Object.entries(labels).filter(([id])=>mesh.dots.has(id)).map(([id,name])=>({id,name}))).map(v=>`<div class="object-row" data-object="${esc(v.id)}"><button class="object-name" data-edit="${esc(v.id)}">${esc(v.name)}</button><button class="tiny" data-center="${esc(v.id)}" title="Center on vertex" aria-label="Center on ${esc(v.name)}">⌾</button></div>`).join('')||'<div class="empty">Click any dot in the disk to name it for navigation.</div>';
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>showEditor(b.dataset.edit));
  document.querySelectorAll('[data-center]').forEach(b=>b.onclick=()=>centerOn(b.dataset.center));
  document.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>showGroupEditor(groups.find(g=>g.id===b.dataset.rename)));
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{pairs=pairs.filter(p=>p.group!==b.dataset.remove);updateLists();updateTopology();persist();requestRender()});
  updateIdentification();requestRender();
}
for(const listId of ['identifiedList','vertexList']){
  const list=$(listId);
  list.addEventListener('pointerover',e=>{
    const row=e.target.closest('[data-object], [data-pair]');if(!row||!list.contains(row))return;
    listHover=row.dataset.pair?groupEdges(pairGroups().find(g=>g.id===row.dataset.pair)):[row.dataset.object];requestRender();
  });
  list.addEventListener('pointerout',e=>{const row=e.target.closest('[data-object], [data-pair]');if(row?.contains(e.relatedTarget))return;listHover=[];requestRender()});
}
function showGroupEditor(group){
  const pop=$('selection');pop.hidden=false;pop.style.left='15px';pop.style.top='40px';
  pop.innerHTML=`<p>Identified edge pair</p><label>Shared name<input id="groupName" type="text" maxlength="80" value="${esc(group.name)}"></label><div class="actions"><button id="saveGroup" class="active">Save name</button><button id="closeEditor">×</button></div>`;
  $('groupName').focus();$('groupName').select();
  $('saveGroup').onclick=()=>{const name=$('groupName').value.trim();if(!validGroupName(name,group.id))return;for(const p of group.records)p.name=name;pop.hidden=true;updateLists();persist();requestRender()};
  $('groupName').onkeydown=e=>{if(e.key==='Enter')$('saveGroup').click()};$('closeEditor').onclick=()=>{pop.hidden=true};
}
function validGroupName(name,except=null){if(!name){toast('Give this identified edge pair a name.');return false}if(name.length>80||pairGroups().some(g=>g.id!==except&&g.name===name)){toast('Choose a unique name for this identified edge pair.');return false}return true}
function orientationDots(){
  if(!pending)return [];
  if(pending.phase==='first')return pending.sides.flatMap(s=>s.ends);
  if(pending.phase==='second')return [...pending.sides[1].ends,pending.first];
  return [pending.first,pending.second];
}
function toggleEdge(id){
  $('objectsTab').click();
  if(edgeSelection.has(id))edgeSelection.delete(id);
  else {
    if(edgeGroup(id))return toast('That segment is already identified. Remove its identification to pair it again.');
    edgeSelection.add(id);
  }
  updateIdentification();requestRender();
}
function cancelIdentification(){pending=null;edgeSelection.clear();updateIdentification();requestRender()}
function updateIdentification(){
  $('cancelIdentify').hidden=!pending&&!edgeSelection.size;
  $('identify').hidden=!!pending;
  $('namePair').hidden=pending?.phase!=='name';
  let message;
  if(pending){
    message=pending.phase==='first'?'Click an outer endpoint of either highlighted edge.':pending.phase==='second'?'Now click the matching outer endpoint of the other edge.':'Orientation set. Give this identified edge pair one shared name.';
  }else {
    message=edgeSelection.size?`${edgeSelection.size} segments selected. `:'Cmd-click segments in the disk. ';
    try{const sides=G.identificationSides(mesh,[...edgeSelection]);$('identify').disabled=false;message+=`Two matching straight chains ready (${sides[0].edges.length} segments each).`}
    catch(e){$('identify').disabled=true;message+=edgeSelection.size?e.message:'Select two straight chains with matching segment types and lengths.'}
  }
  $('identificationHint').textContent=message;setStatus(message);
}
$('identify').onclick=()=>{
  try{pending={sides:G.identificationSides(mesh,[...edgeSelection]),phase:'first'};updateIdentification();requestRender()}
  catch(e){toast(e.message)}
};
function chooseOrientation(id){
  if(pending.phase==='name')return toast('Enter the shared name in the sidebar, or cancel to start again.');
  if(pending.phase==='first'){
    const i=pending.sides.findIndex(s=>s.ends.includes(id));if(i<0)return toast('Choose an outer endpoint, not an interior dot of the chain.');
    if(i===1)pending.sides.reverse();pending.first=id;pending.phase='second';
  }else {
    if(!pending.sides[1].ends.includes(id))return toast('Choose an outer endpoint of the other selected edge.');
    try{pending.records=G.orientIdentification(mesh,pending.sides,pending.first,id);pending.second=id;pending.phase='name';$('pairName').value=''}
    catch(e){return toast(e.message)}
  }
  updateIdentification();requestRender();if(pending.phase==='name')$('pairName').focus();
}
$('cancelIdentify').onclick=cancelIdentification;
$('savePair').onclick=()=>{
  if(pending?.phase!=='name')return;
  const name=$('pairName').value.trim();if(!validGroupName(name))return;
  const group=nextGroupId();pairs.push(...pending.records.map(p=>({...p,group,name})));
  cancelIdentification();updateLists();updateTopology();persist();requestRender();toast(`Identified as “${name}”.`);
};
$('pairName').onkeydown=e=>{if(e.key==='Enter')$('savePair').click();if(e.key==='Escape')cancelIdentification()};
function updateTopology(){let r;try{r=analyze(mesh,selected,pairs)}catch(e){r={status:'invalid',message:'This project contains inconsistent cells: '+e.message}}let html=`<div class="topo-card ${r.status==='closed'&&r.smooth?'good':r.status!=='empty'?'warn':''}">${esc(r.message)}</div><div class="mini">${selected.size} selected triangles</div>`;if(r.status==='closed'){html+=`<div class="metrics">${[['Vertices',r.V],['Edges',r.E],['Triangles',r.F],['Euler χ',r.chi],['Area / π',(r.area/Math.PI).toFixed(4)],['Orientable',r.orientable?'Yes':'No']].map(([k,v])=>`<div class="metric">${k}<strong>${v}</strong></div>`).join('')}</div><div class="topo-card ${r.smooth?'good':'warn'}">${r.smooth?'Smooth hyperbolic metric: every vertex angle is 2π.':'Cone metric: some vertex angles differ from 2π. The topological surface is closed, but this metric is not smooth.'}</div><h3>Quotient vertex angles</h3><div class="angles">${r.angleSums.map((a,i)=>`v${i+1}: ${(a/Math.PI).toFixed(4)}π ${Math.abs(a-TAU)<1e-4?'✓':'· deficit '+((TAU-a)/Math.PI).toFixed(4)+'π'}`).join('<br>')}</div><p class="mini">Vertex links: single circles ✓<br>Equal-length edge gluings ✓<br>Gauss–Bonnet residual: ${Math.abs(r.gaussBonnet).toExponential(1)}<br>Cell counts use the triangle subdivision.<br>Area is measured at curvature −1.</p>`} $('topology').innerHTML=html}
function snapshot(){return {format:'hyperbolic-studio',version:3,preset:$('tiling').value,density:+$('density').value,labels,pairs,selected:[...selected],camera,rotation,colors,visible,width:+$('width').value,radius:+$('radius').value,contrast:+$('contrast').value,radialWidth:+$('radialWidth').value}}
function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('hyperbolic-studio',JSON.stringify(snapshot()))}catch{toast('Browser storage is full. Use Save to keep your work.')}},250)}
function build(reset=true){pending=null;edgeSelection.clear();mesh=G.buildMesh($('tiling').value,+$('density').value);if(reset){labels={};pairs=[];selected=new Set();camera={A:[1,0],B:[0,0]};rotation=0}active=null;hover=null;$('selection').hidden=true;$('coverage').textContent=`${mesh.faces.length.toLocaleString()} primary polygons · ${mesh.dots.size.toLocaleString()} dots. Finite patch; fine details fade at the rim.`;updateLists();updateTopology();requestRender()}
function migrateProject(input){
  const s=JSON.parse(JSON.stringify(input));
  if(s?.version===1){
    const old=s.labels||{},names=new Set();
    s.pairs=(s.pairs||[]).map((p,i)=>{
      const base=old[p.e1]===old[p.e2]&&old[p.e1]?old[p.e1]:[old[p.e1],old[p.e2]].filter(Boolean).join(' ↔ ')||'Identification '+(i+1);
      let name=base.slice(0,70),n=2;while(names.has(name))name=base.slice(0,70)+' ('+(n++)+')';names.add(name);
      return {...p,group:'legacy'+i,name};
    });
    s.labels=Object.fromEntries(Object.entries(old).filter(([id])=>!id.startsWith('p:')&&!id.startsWith('d:')));s.version=2;
  }
  return s;
}
function validateProject(s){
  if(s?.format!=='hyperbolic-studio'||![2,3].includes(s.version)||!G.presets[s.preset]||![450,1000,2500].includes(s.density))throw Error('Unsupported project format.');
  if(!s.labels||typeof s.labels!=='object'||Array.isArray(s.labels)||!Array.isArray(s.pairs)||!Array.isArray(s.selected))throw Error('Invalid project records.');
  const candidate=G.buildMesh(s.preset,s.density),names=new Set();
  for(const [id,name]of Object.entries(s.labels)){
    if(!candidate.dots.has(id)||typeof name!=='string'||!name.trim()||name.length>80||names.has(name))throw Error('Vertex names must be nonempty and unique.');names.add(name);
  }
  const used=new Set(),groups=new Map();
  for(const p of s.pairs){
    const a=candidate.edges.get(p.e1),b=candidate.edges.get(p.e2);
    if(!a||!b||a.type!==b.type||Math.abs(a.length-b.length)>1e-5||p.e1===p.e2||used.has(p.e1)||used.has(p.e2)||![a.a,a.b].includes(p.v1)||![b.a,b.b].includes(p.v2))throw Error('Invalid oriented gluing.');
    if(typeof p.group!=='string'||!p.group||p.group.length>100||typeof p.name!=='string'||!p.name.trim()||p.name.length>80)throw Error('Invalid identification name.');
    if(!groups.has(p.group))groups.set(p.group,[]);groups.get(p.group).push(p);used.add(p.e1);used.add(p.e2);
  }
  const groupNames=new Set();
  for(const records of groups.values()){
    const name=records[0].name;if(records.some(p=>p.name!==name)||groupNames.has(name))throw Error('Identified edge pairs must have unique shared names.');groupNames.add(name);
    const sides=G.identificationSides(candidate,records.flatMap(p=>[p.e1,p.e2]));
    if(sides.some(side=>records.some(p=>side.edges.includes(p.e1)&&side.edges.includes(p.e2))))throw Error('Invalid chain grouping.');
    const starts=sides.map(side=>side.ends.find(v=>records.some(p=>(side.edges.includes(p.e1)&&p.v1===v)||(side.edges.includes(p.e2)&&p.v2===v))));
    if(starts.some(v=>!v))throw Error('Inconsistent chain orientation.');
    const expected=G.orientIdentification(candidate,sides,...starts);
    if(expected.some(e=>!records.some(p=>(p.e1===e.e1&&p.v1===e.v1&&p.e2===e.e2&&p.v2===e.v2)||(p.e2===e.e1&&p.v2===e.v1&&p.e1===e.e2&&p.v1===e.v2))))throw Error('Inconsistent chain orientation.');
  }
  if(s.version===2){
    if(!['primary','dual'].includes(s.family))throw Error('Invalid legacy region family.');
    const faceIds=new Set((s.family==='primary'?candidate.faces:candidate.dualFaces).map(f=>f.id));
    if(s.selected.some(id=>!faceIds.has(id)))throw Error('Region contains unknown cells.');
    s.selected=[...G.expandRegionSelection(candidate,s.selected)];s.version=3;delete s.family;
  }else if(s.selected.some(id=>!candidate.triangleById.has(id)))throw Error('Region contains unknown triangles.');
  if(!s.camera||![s.camera.A,s.camera.B].every(z=>Array.isArray(z)&&z.length===2&&z.every(Number.isFinite))||Math.abs(G.norm(s.camera.A)**2-G.norm(s.camera.B)**2-1)>1e-5||!Number.isFinite(s.rotation))throw Error('Invalid view transform.');
  return candidate;
}
function load(input){const s=migrateProject(input),candidate=validateProject(s);$('radialWidth').value=Number.isFinite(s.radialWidth)?s.radialWidth:0.4;visible.radial=s.visible?.radial??true;colors.radial=/^#[0-9a-f]{6}$/i.test(s.colors?.radial)?s.colors.radial:'#d29570';pending=null;edgeSelection.clear();$('tiling').value=s.preset;$('density').value=s.density;mesh=candidate;labels=s.labels;pairs=s.pairs;selected=new Set(s.selected);camera=s.camera;rotation=s.rotation;for(const k of Object.keys(colors))if(/^#[0-9a-f]{6}$/i.test(s.colors?.[k]))colors[k]=s.colors[k];for(const k of Object.keys(visible))if(typeof s.visible?.[k]==='boolean')visible[k]=s.visible[k];for(const k of ['width','radius','contrast','radialWidth'])if(Number.isFinite(s[k]))$(k).value=s[k];renderLayers();active=null;hover=null;$('selection').hidden=true;updateLists();updateTopology();$('coverage').textContent=`${mesh.faces.length.toLocaleString()} primary polygons · finite numerical patch`;requestRender();persist()}
function renderLayers(){$('layers').innerHTML=[['primary','Primary edges'],['vertex','Primary vertices'],['dual','Dual edges'],['center','Dual vertices / centers'],['crossing','Intersections'],['radial','Center-to-vertex edges'],['shading','Triangle checkerboard']].map(([k,name])=>`<div class="layer"><input type="checkbox" data-layer="${k}" aria-label="Show ${name}" ${visible[k]?'checked':''}><span>${name}</span>${k!=='shading'?`<input type="color" data-color="${k}" aria-label="${name} color" value="${colors[k]}">`:''}</div>`).join('');document.querySelectorAll('[data-layer]').forEach(x=>x.onchange=()=>{visible[x.dataset.layer]=x.checked;persist();requestRender()});document.querySelectorAll('[data-color]').forEach(x=>x.oninput=()=>{colors[x.dataset.color]=x.value;updateLists();persist();requestRender()})}
$('tiling').innerHTML=Object.entries(G.presets).map(([id,s])=>`<option value="${id}">${s.name}</option>`).join('');$('tiling').onchange=()=>{fileHandle=null;projectFilename='hyperbolic-studio.json';$('fileName').textContent='Untitled';build();persist()};$('density').onchange=()=>{const s=snapshot();mesh=G.buildMesh(s.preset,s.density);labels=Object.fromEntries(Object.entries(labels).filter(([id])=>object(id)));const removedGroups=new Set(pairs.filter(p=>![p.e1,p.e2,p.v1,p.v2].every(id=>object(id))).map(p=>p.group));pairs=pairs.filter(p=>!removedGroups.has(p.group));pending=null;edgeSelection.clear();const valid=new Set(mesh.triangleById.keys());selected=new Set([...selected].filter(id=>valid.has(id)));updateLists();updateTopology();$('coverage').textContent=`${mesh.faces.length.toLocaleString()} primary polygons · finite numerical patch`;requestRender();persist()};
for(const id of ['width','radius','contrast','radialWidth'])$(id).oninput=()=>{persist();requestRender()};for(const id of ['search','sort'])$(id).oninput=updateLists;
function setMode(m){cancelIdentification();mode=m;$('fullscreenMode').value=m;$('inspect').classList.toggle('active',m==='inspect');$('region').classList.toggle('active',m==='region');$('selection').hidden=true;requestRender()}
$('fullscreenMode').onchange=()=>setMode($('fullscreenMode').value);$('inspect').onclick=()=>setMode('inspect');$('region').onclick=()=>setMode('region');$('clearRegion').onclick=()=>{selected.clear();updateTopology();persist();requestRender()};$('home').onclick=()=>{camera={A:[1,0],B:[0,0]};rotation=0;persist();requestRender()};
for(const [tab,panel,other,otherPanel]of [['objectsTab','objectsPanel','topologyTab','topologyPanel'],['topologyTab','topologyPanel','objectsTab','objectsPanel']])$(tab).onclick=()=>{$(tab).classList.add('active');$(other).classList.remove('active');$(panel).hidden=false;$(otherPanel).hidden=true};
$('help').onclick=()=>$('guide').showModal();$('closeGuide').onclick=()=>$('guide').close();
let fileHandle=null,projectFilename='hyperbolic-studio.json',saving=false,expanded=false;
function setProjectFile(handle,name){fileHandle=handle;projectFilename=name||'hyperbolic-studio.json';$('fileName').textContent=projectFilename}
function downloadProject(name){
  const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setProjectFile(null,name);toast('Downloaded '+name+'. Your browser controls replacement of existing files.');
}
async function saveProject(asNew=false){
  if(saving)return;
  if(!window.showSaveFilePicker&&!fileHandle){
    if(asNew||$('fileName').textContent==='Untitled'){$('saveFilename').value=projectFilename;$('saveDialog').showModal();$('saveFilename').focus();$('saveFilename').select()}
    else downloadProject(projectFilename);
    return;
  }
  saving=true;$('export').disabled=true;$('saveAs').disabled=true;
  try{
    const handle=asNew||!fileHandle?await window.showSaveFilePicker({suggestedName:projectFilename,types:[{description:'Hyperbolic Studio project',accept:{'application/json':['.json']}}]}):fileHandle;
    const stream=await handle.createWritable();
    try{await stream.write(JSON.stringify(snapshot(),null,2));await stream.close()}catch(error){try{await stream.abort()}catch{}throw error}
    setProjectFile(handle,handle.name);toast('Saved '+projectFilename+'.');
  }catch(error){if(error.name!=='AbortError')toast('Could not save: '+error.message+' Try Save As to choose another file.')}
  finally{saving=false;$('export').disabled=false;$('saveAs').disabled=false}
}
$('export').onclick=()=>saveProject();$('saveAs').onclick=()=>saveProject(true);
$('confirmSave').onclick=()=>{let name=$('saveFilename').value.trim().replace(/[\\/:*?"<>|]/g,'-');if(!name){toast('Enter a filename.');return}if(!/\.json$/i.test(name))name+='.json';downloadProject(name);$('saveDialog').close()};
$('cancelSave').onclick=()=>$('saveDialog').close();$('saveFilename').onkeydown=e=>{if(e.key==='Enter')$('confirmSave').click()};
async function readProjectFile(f,handle=null){if(f.size>5e6)throw Error('Project file is too large.');load(JSON.parse(await f.text()));setProjectFile(handle,f.name);toast('Project opened.')}
$('import').onclick=async()=>{
  if(!window.showOpenFilePicker){$('file').click();return}
  try{const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:'Hyperbolic Studio project',accept:{'application/json':['.json']}}]});await readProjectFile(await handle.getFile(),handle)}catch(error){if(error.name!=='AbortError')toast('Could not open project: '+error.message)}
};
$('file').onchange=async()=>{const f=$('file').files[0];if(!f)return;try{await readProjectFile(f)}catch(e){toast('Could not open project: '+e.message)}$('file').value=''};
function setExpanded(value){expanded=value;$('fullscreenMode').value=mode;$('workspace').classList.toggle('expanded',value);$('studioLayout').classList.toggle('expanded-layout',value);$('fullscreen').textContent=value?'Exit fullscreen':'Fullscreen';resize()}
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement}
async function toggleFullscreen(){
  if(expanded){try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit.call(document)}}catch{}setExpanded(false);return}
  setExpanded(true);
  const target=document.documentElement,enter=target?.requestFullscreen||target?.webkitRequestFullscreen;
  if(enter)try{await enter.call(target)}catch{toast('Expanded disk view. Browser fullscreen is unavailable.')}
}
$('fullscreen').onclick=toggleFullscreen;
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>setExpanded(!!fullscreenElement()));
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject(e.shiftKey);return}
  if(e.key==='Escape'){if(expanded)toggleFullscreen();cancelIdentification();$('selection').hidden=true;active=null;requestRender()}
});
$('demo').onclick=()=>{
  fileHandle=null;projectFilename='hyperbolic-studio.json';$('fileName').textContent='Untitled';
  $('tiling').value='bolza';build();const f=mesh.faces.find(f=>G.norm(mesh.dots.get(f.c).z)<1e-7);selected=new Set(G.regionTriangles(mesh,f.c));
  for(let i=0;i<f.vertices.length;i++)labels[f.vertices[i]]=i%2?'m'+((i+1)/2):'v'+(i/2+1);
  for(let i=0;i<4;i++){
    const sides=G.identificationSides(mesh,[f.edges[2*i],f.edges[2*i+1],f.edges[2*i+8],f.edges[2*i+9]]);
    const records=G.orientIdentification(mesh,sides,f.vertices[2*i],f.vertices[(2*i+10)%16]);
    pairs.push(...records.map(p=>({...p,group:'g'+(i+1),name:['a','b','c','d'][i]})));
  }
  updateLists();updateTopology();$('topologyTab').click();persist();requestRender();toast('Genus 2: four complete edge pairs, area 4π.');
};
$('macbeath').onclick=()=>{
  try{
    const candidate=G.buildMesh('hept',1000),example=G.macbeathExample(candidate),report=analyze(candidate,example.selected,example.pairs);
    if(report.status!=='closed'||report.chi!==-12||!report.orientable||!report.smooth||report.components!==1)throw Error('Macbeath verification failed.');
    load({...snapshot(),preset:'hept',density:1000,labels:{},pairs:example.pairs,selected:[...example.selected],camera:{A:[1,0],B:[0,0]},rotation:0});
    fileHandle=null;projectFilename='macbeath-genus-7.json';$('fileName').textContent='Untitled';
    $('topologyTab').click();toast('Macbeath genus 7: 72 heptagons, 97 boundary-edge pairs, area 24π.');
  }catch(error){toast('Could not load Macbeath example: '+error.message)}
};
renderLayers();build();try{const saved=localStorage.getItem('hyperbolic-studio');if(saved)load(JSON.parse(saved))}catch(e){toast('Saved project could not be restored: '+e.message)}new ResizeObserver(resize).observe($('canvasWrap'));resize();render();
// Expose read-only diagnostics for local verification.
window.hyperbolicDiagnostics=()=>({mesh:{faces:mesh.faces.length,dualFaces:mesh.dualFaces.length,dots:mesh.dots.size,edges:mesh.edges.size,triangles:mesh.triangles.length},topology:analyze(mesh,selected,pairs),project:snapshot(),pickables:pickables.length,edgeSelection:[...edgeSelection],orientation:pending?{phase:pending.phase,candidates:orientationDots()}:null,highlights:[...listHover],groups:pairGroups()});
