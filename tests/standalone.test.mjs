import * as G from '../geometry.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
// Runs the actual bundled application with a DOM/canvas contract, without browser dependencies.
// This catches bundling errors and runtime failures, not browser-specific visual behavior.
function environment(){let operations=0,frames=[],nodes=new Map(),listeners=new Map(),controls=new Map();class Path{moveTo(...a){assert.ok(a.every(Number.isFinite))}lineTo(...a){assert.ok(a.every(Number.isFinite))}arc(...a){assert.ok(a.every(v=>typeof v==='boolean'||Number.isFinite(v)));assert.ok(a[2]>=0)}closePath(){}}
const ctx=new Proxy({isPointInPath:()=>false},{get:(o,k)=>k in o?o[k]:(...args)=>{operations++;if(k==='arc')new Path().arc(...args)}});
function el(id){if(nodes.has(id))return nodes.get(id);let n={id,value:({density:'1000',tiling:'hept',width:'.012',radius:'.022',radialWidth:'.4',contrast:'.65',group:'none',sort:'asc'})[id]||'',hidden:false,style:{},options:[],classList:{add(){},remove(){},toggle(){}},addEventListener:(type,fn)=>listeners.set(id+':'+type,fn),getBoundingClientRect:()=>({width:760,height:700,left:0,top:0}),getContext:()=>ctx,setPointerCapture(){},focus(){},select(){},click(){return this.onclick?.()},showModal(){this.open=true},close(){this.open=false}};Object.defineProperty(n,'innerHTML',{set(v){this.html=v;this.options=[...v.matchAll(/<option value="([^"]*)"/g)].map(m=>({value:m[1].replaceAll('&amp;','&')}))},get(){return this.html}});nodes.set(id,n);return n}
function querySelectorAll(selector){const attr=selector.match(/^\[data-([a-z]+)\]$/)?.[1];if(!attr)return [];const result=[];const pattern=new RegExp('data-'+attr+'="([^"\\n]*)"','g');for(const n of nodes.values())for(const m of (n.html||'').matchAll(pattern)){const b={dataset:{[attr]:m[1].replaceAll('&amp;','&')},click(){this.onclick?.()}};result.push(b)}controls.set(selector,result);return result}
const sandbox={console,document:{getElementById:el,querySelectorAll,addEventListener:(type,fn)=>listeners.set('document:'+type,fn),createElement:()=>el('download')},window:{},devicePixelRatio:2,Path2D:Path,ResizeObserver:class{observe(){}},requestAnimationFrame:f=>frames.push(f),performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>1,clearTimeout(){},URL,Blob};
let html=readFileSync(new URL('../Hyperbolic-Studio.html',import.meta.url),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(script,sandbox,{timeout:10000});function flush(){const pending=frames;frames=[];for(const f of pending)f(1000)}flush();return {sandbox,el,listeners,flush,diag:()=>sandbox.window.hyperbolicDiagnostics(),ops:()=>operations,controls:selector=>controls.get(selector)||[]}}
test('standalone bundle initializes, renders, labels a dot, loads genus 2 and restores its JSON',async()=>{let e=environment();assert.ok(e.ops()>10000);assert.ok(e.diag().pickables>100);assert.equal(e.diag().mesh.faces,1000);assert.equal(e.el('viewInfo').textContent,'Drag to travel');const down=e.listeners.get('disk:pointerdown'),up=e.listeners.get('disk:pointerup');const event={button:0,clientX:380,clientY:350,pointerId:1};down(event);up(event);e.el('labelInput').value='Origin';e.el('saveLabel').click();assert.ok(Object.values(e.diag().project.labels).includes('Origin'));e.el('demo').click();e.flush();let d=e.diag();assert.equal(d.topology.chi,-2);assert.equal(d.topology.smooth,true);assert.equal(d.project.pairs.length,8);assert.match(e.el('topology').innerHTML,/genus 2/);assert.match(e.el('topology').innerHTML,/4.0000/);const saved=JSON.stringify(d.project);e.el('tiling').value='hept';e.el('tiling').onchange();e.el('file').files=[{size:saved.length,text:async()=>saved}];await e.el('file').onchange();e.flush();assert.equal(e.diag().topology.chi,-2);assert.equal(e.diag().project.pairs.length,8)});
test('all presets render finite paths and non-empty selectable geometry',()=>{const e=environment();for(const preset of ['oct','bolza','pent','square','tri','truncated']){e.el('tiling').value=preset;e.el('tiling').onchange();e.flush();assert.ok(e.diag().pickables>20);assert.ok(e.diag().mesh.dualFaces>0)}});
test('dragging and rotation retain a normalized disk isometry',()=>{const e=environment(),down=e.listeners.get('disk:pointerdown'),move=e.listeners.get('disk:pointermove'),up=e.listeners.get('disk:pointerup');down({button:0,clientX:380,clientY:350,pointerId:1});move({clientX:480,clientY:390});up({clientX:480,clientY:390});e.flush();const c=e.diag().project.camera;assert.ok(Math.abs(c.A[0]**2+c.A[1]**2-c.B[0]**2-c.B[1]**2-1)<1e-10);assert.ok(Math.hypot(...c.B)>.1);e.el('home').click();e.flush();assert.deepEqual(Array.from(e.diag().project.camera.B),[0,0])});


async function openProject(e,s){const json=JSON.stringify(s);e.el('file').files=[{size:json.length,text:async()=>json}];await e.el('file').onchange();e.flush()}
function clickAt(e,z,meta=false){const ev={button:0,clientX:380+322*z[0],clientY:350-322*z[1],pointerId:1,metaKey:meta};e.listeners.get('disk:pointerdown')(ev);e.listeners.get('disk:pointerup')(ev);e.flush()}
function clickEdge(e,mesh,id){const edge=mesh.edges.get(id);clickAt(e,G.midpoint(mesh.dots.get(edge.a).z,mesh.dots.get(edge.b).z),true)}
test('Cmd-click complete edges, orient without labels, name once, hover both, and round trip',async()=>{
 const e=environment(),mesh=G.buildMesh('hept',1000),f=mesh.faces[0];
 const ids=[f.edges[0],f.edges[1],f.edges[6],f.edges[7]];
 for(const id of ids)clickEdge(e,mesh,id);
 assert.equal(e.diag().edgeSelection.length,4);assert.equal(e.el('identify').disabled,false);
 e.el('identify').click();assert.equal(e.diag().orientation.phase,'first');
 clickAt(e,mesh.dots.get(f.vertices[0]).z);
 assert.equal(e.diag().orientation.phase,'second');
 clickAt(e,mesh.dots.get(f.vertices[8]).z);
 assert.equal(e.diag().orientation.phase,'name');
 assert.equal(e.diag().project.pairs.length,0);
 e.el('pairName').value='alpha';e.el('savePair').click();e.flush();
 const d=e.diag();assert.equal(d.groups.length,1);assert.equal(d.groups[0].name,'alpha');assert.equal(d.project.pairs.length,2);assert.equal(Object.keys(d.project.labels).length,0);
 assert.equal((e.el('identifiedList').innerHTML.match(/data-pair=/g)||[]).length,1);
 assert.ok(!e.el('identifiedList').innerHTML.includes('class="icon"'));
 const row={dataset:{pair:d.groups[0].id},contains:()=>false};
 e.el('identifiedList').contains=()=>true;
 e.listeners.get('identifiedList:pointerover')({target:{closest:()=>row}});e.flush();
 assert.equal(e.diag().highlights.length,4);
 e.listeners.get('identifiedList:pointerout')({target:{closest:()=>row},relatedTarget:null});e.flush();assert.equal(e.diag().highlights.length,0);
 await openProject(e,d.project);assert.equal(e.diag().groups.length,1);assert.equal(e.diag().project.pairs.length,2);
});
test('two-segment flow supports toggling, cancellation and duplicate name rejection',()=>{
 const e=environment(),mesh=G.buildMesh('hept',1000),f=mesh.faces[0];
 clickEdge(e,mesh,f.edges[0]);clickEdge(e,mesh,f.edges[0]);assert.equal(e.diag().edgeSelection.length,0);
 clickEdge(e,mesh,f.edges[0]);clickEdge(e,mesh,f.edges[6]);e.el('identify').click();e.el('cancelIdentify').click();assert.equal(e.diag().orientation,null);assert.equal(e.diag().project.pairs.length,0);
 for(const [i,j]of [[0,6],[2,8]]){
   clickEdge(e,mesh,f.edges[i]);clickEdge(e,mesh,f.edges[j]);e.el('identify').click();
   clickAt(e,mesh.dots.get(f.vertices[i]).z);clickAt(e,mesh.dots.get(f.vertices[j]).z);
   e.el('pairName').value='alpha';e.el('savePair').click();e.flush();
 }
 assert.equal(e.diag().groups.length,1);assert.match(e.el('toast').textContent,/unique name/);e.el('cancelIdentify').click();
});
test('old saved projects migrate to shared names while preserving gluings and vertex navigation',async()=>{
 const e=environment();e.el('demo').click();e.flush();const saved=e.diag().project;
 saved.version=1;saved.family='primary';saved.selected=[G.buildMesh('bolza',1000).faces[0].id];saved.pairs=saved.pairs.map((p,i)=>{saved.labels[p.e1]='old'+i+'a';saved.labels[p.e2]='old'+i+'b';return {e1:p.e1,e2:p.e2,v1:p.v1,v2:p.v2}});
 await openProject(e,saved);
 assert.equal(e.el('toast').textContent,'Project opened.');assert.equal(e.diag().project.version,3);assert.equal(e.diag().topology.chi,-2);assert.equal(e.diag().groups.length,8);
 assert.equal(e.el('vertexCount').textContent,16);assert.equal(e.diag().project.pairs.length,8);
 assert.ok(Object.keys(e.diag().project.labels).every(id=>!id.startsWith('p:')&&!id.startsWith('d:')));
});
test('imports reject inconsistent complete-edge grouping and duplicate shared names',async()=>{
 const e=environment();e.el('demo').click();e.flush();const saved=e.diag().project;
 const invalid=JSON.parse(JSON.stringify(saved));invalid.pairs[0].name='different';await openProject(e,invalid);
 assert.match(e.el('toast').textContent,/unique shared names/);assert.equal(e.diag().topology.chi,-2);
 const duplicate=JSON.parse(JSON.stringify(saved));duplicate.pairs.filter(p=>p.group==='g2').forEach(p=>p.name='a');await openProject(e,duplicate);
 assert.match(e.el('toast').textContent,/unique shared names/);
});

test('a complete-edge pair renames and removes atomically; vertex names remain independent',()=>{
 const e=environment();e.el('demo').click();e.flush();
 const before=e.diag().project;
 e.controls('[data-rename]')[0].click();e.el('groupName').value='loop A';e.el('saveGroup').click();e.flush();
 assert.equal(e.diag().groups[0].name,'loop A');assert.equal(e.diag().project.pairs.filter(p=>p.name==='loop A').length,2);
 e.controls('[data-remove]')[0].click();e.flush();
 assert.equal(e.diag().groups.length,3);assert.equal(e.diag().project.pairs.length,6);
 assert.equal(Object.keys(e.diag().project.labels).length,Object.keys(before.labels).length);
 assert.equal(e.diag().topology.status,'open');assert.equal(e.diag().topology.open,4);
});

import {mixedChains} from './chain-fixtures.mjs';
test('sixth layer has subtle defaults and long mixed identifications persist and hover together',async()=>{
 const e=environment(),mesh=G.buildMesh('hept',1000),chains=mixedChains(mesh);
 assert.equal(e.diag().project.visible.radial,true);assert.equal(e.diag().project.radialWidth,.4);
 assert.ok(e.diag().project.colors.radial);assert.match(e.el('layers').innerHTML,/Center-to-vertex edges/);
 for(const id of chains.flatMap(c=>c.edges))clickEdge(e,mesh,id);
 assert.equal(e.diag().edgeSelection.length,10);assert.equal(e.el('identify').disabled,false);
 e.el('identify').click();
 clickAt(e,mesh.dots.get(chains[0].ends[1]).z);clickAt(e,mesh.dots.get(chains[1].ends[1]).z);
 assert.equal(e.diag().orientation.phase,'name');e.el('pairName').value='long mixed seam';e.el('savePair').click();e.flush();
 assert.equal(e.diag().groups.length,1);assert.equal(e.diag().project.pairs.length,5);
 const row={dataset:{pair:e.diag().groups[0].id},contains:()=>false};e.el('identifiedList').contains=()=>true;e.listeners.get('identifiedList:pointerover')({target:{closest:()=>row}});e.flush();assert.equal(e.diag().highlights.length,10);
 const saved=e.diag().project;await openProject(e,saved);assert.equal(e.diag().groups[0].records.length,5);
 e.controls('[data-remove]')[0].click();e.flush();assert.equal(e.diag().project.pairs.length,0);
});

test('Region Construction selects polygons, crossings, all edge types, and individual triangles',async()=>{
  const e=environment(),mesh=G.buildMesh('hept',1000),f=mesh.faces[0];e.el('region').click();
  clickAt(e,mesh.dots.get(f.c).z);assert.equal(e.diag().project.selected.length,14);
  clickAt(e,mesh.dots.get(f.c).z);assert.equal(e.diag().project.selected.length,0);
  clickAt(e,mesh.dots.get(f.vertices[0]).z);assert.equal(e.diag().project.selected.length,6);
  e.el('clearRegion').click();e.flush();
  clickAt(e,mesh.dots.get(f.vertices[1]).z);assert.equal(e.diag().project.selected.length,4);
  e.el('clearRegion').click();e.flush();
  const t=mesh.triangles[0];
  for(const id of t.edges){
    const edge=mesh.edges.get(id),mid=G.midpoint(mesh.dots.get(edge.a).z,mesh.dots.get(edge.b).z);
    clickAt(e,mid);assert.equal(e.diag().project.selected.length,2,edge.type);
    clickAt(e,mid);assert.equal(e.diag().project.selected.length,0);
  }
  clickAt(e,G.incenter(...t.vertices.map(id=>mesh.dots.get(id).z)));
  assert.deepEqual(Array.from(e.diag().project.selected),[t.id]);assert.equal(e.diag().topology.boundary,3);
  assert.equal(e.diag().project.family,undefined);assert.equal(e.diag().project.version,3);
  const saved=e.diag().project;e.el('clearRegion').click();await openProject(e,saved);
  assert.deepEqual(Array.from(e.diag().project.selected),[t.id]);
  const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(!source.includes('id="family"'));
});

test('triangle interior selection follows the panned and rotated disk',()=>{
  const e=environment(),mesh=G.buildMesh('hept',1000),t=mesh.triangles[0];e.el('region').click();
  const down=e.listeners.get('disk:pointerdown'),move=e.listeners.get('disk:pointermove'),up=e.listeners.get('disk:pointerup');
  down({button:0,clientX:380,clientY:350,pointerId:1});move({clientX:440,clientY:390});up({clientX:440,clientY:390});e.flush();
  // Rotate using the circumference handle from the top of the disk to the right.
  down({button:0,clientX:380,clientY:28,pointerId:1});move({clientX:702,clientY:350});up({clientX:702,clientY:350});e.flush();
  const p=G.incenter(...t.vertices.map(id=>mesh.dots.get(id).z)),c=e.diag().project.camera;
  const z=G.div(G.add(G.mul(c.A,p),c.B),G.add(G.mul(G.conj(c.B),p),G.conj(c.A)));
  clickAt(e,z);assert.deepEqual(Array.from(e.diag().project.selected),[t.id]);
});

test('version 2 primary and dual regions migrate to triangles, preserving their boundaries',async()=>{
  const e=environment(),mesh=G.buildMesh('hept',1000),base=e.diag().project;
  for(const [family,f]of [['primary',mesh.faces[0]],['dual',mesh.dualFaces[0]]]){
    const old={...base,version:2,family,selected:[f.id]};await openProject(e,old);
    assert.equal(e.el('toast').textContent,'Project opened.');assert.equal(e.diag().project.version,3);
    assert.equal(e.diag().project.selected.length,f.vertices.length);
    assert.equal(e.diag().topology.boundary,f.edges.length);
  }
});

test('Save As writes a chosen file; Save reuses it; cancellation and write failures preserve the target',async()=>{
 const e=environment(),writes=[];let picks=0;
 const handle={name:'surface.json',createWritable:async()=>({write:async s=>writes.push(JSON.parse(s)),close:async()=>{}})};
 e.sandbox.window.showSaveFilePicker=async()=>{picks++;return handle};
 await e.el('saveAs').click();assert.equal(picks,1);assert.equal(writes[0].version,3);assert.equal(e.el('fileName').textContent,'surface.json');
 await e.el('export').click();assert.equal(picks,1);assert.equal(writes.length,2);
 e.sandbox.window.showSaveFilePicker=async()=>{throw Object.assign(Error('cancelled'),{name:'AbortError'})};
 await e.el('saveAs').click();await e.el('export').click();assert.equal(writes.length,3);
 handle.createWritable=async()=>{throw Error('Permission denied')};await e.el('export').click();assert.match(e.el('toast').textContent,/Could not save/);assert.equal(e.el('export').disabled,false);
});
test('download fallback names files and Save reuses the name; fullscreen expands and exits',async()=>{
 const e=environment();e.el('fileName').textContent='Untitled';await e.el('export').click();assert.equal(e.el('saveDialog').open,true);
 e.el('saveFilename').value='My surface';e.el('confirmSave').click();assert.equal(e.el('download').download,'My surface.json');
 await e.el('export').click();assert.equal(e.el('download').download,'My surface.json');assert.equal(e.el('saveDialog').open,false);
 let prevented=false;e.listeners.get('document:keydown')({key:'S',metaKey:true,shiftKey:true,preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(e.el('saveDialog').open,true);
 await e.el('fullscreen').click();assert.equal(e.el('fullscreen').textContent,'Exit fullscreen');
 e.listeners.get('document:keydown')({key:'Escape'});assert.equal(e.el('fullscreen').textContent,'Fullscreen');
 const doc=e.sandbox.document;doc.documentElement={requestFullscreen:async()=>{doc.fullscreenElement=doc.documentElement}};doc.exitFullscreen=async()=>{doc.fullscreenElement=null};
 await e.el('fullscreen').click();assert.ok(doc.fullscreenElement);await e.el('fullscreen').click();assert.equal(doc.fullscreenElement,null);
});
test('opening with a native file handle makes Save update that document',async()=>{
 const e=environment(),json=JSON.stringify(e.diag().project);let written=false;
 const handle={name:'opened.json',getFile:async()=>({name:'opened.json',size:json.length,text:async()=>json}),createWritable:async()=>({write:async()=>{written=true},close:async()=>{}})};
 e.sandbox.window.showOpenFilePicker=async()=>[handle];await e.el('import').click();await e.el('export').click();assert.equal(written,true);assert.equal(e.el('fileName').textContent,'opened.json');
});
test('Macbeath loader renders its named boundary pairs and round trips the genus 7 project',async()=>{
 const e=environment();e.el('macbeath').click();e.flush();
 const d=e.diag();assert.equal(d.project.preset,'hept');assert.equal(d.project.selected.length,1008);
 assert.equal(d.groups.length,97);assert.equal(d.topology.chi,-12);assert.equal(d.topology.smooth,true);
 assert.match(e.el('topology').innerHTML,/genus 7/);assert.equal(e.el('fileName').textContent,'Untitled');
 e.el('demo').click();await openProject(e,d.project);assert.equal(e.diag().topology.chi,-12);assert.equal(e.diag().groups.length,97);
 assert.equal(e.el('toast').textContent,'Project opened.');
});
