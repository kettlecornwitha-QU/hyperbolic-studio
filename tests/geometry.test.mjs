import test from 'node:test';import assert from 'node:assert/strict';
import * as G from '../geometry.mjs';import {analyze} from '../topology.mjs';
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('disk isometries preserve distance and reflection fixes its mirror',()=>{const a=[.2,.1],b=[-.1,.4],c=[.3,-.2];close(G.distance(a,b),G.distance(G.toOrigin(a,c),G.toOrigin(b,c)));const r=G.reflect(c,a,b);close(G.distance(r,a),G.distance(c,a));close(G.norm(G.sub(G.reflect(r,a,b),c)),0);close(G.norm(G.sub(G.reflect(a,a,b),a)),0)});
test('geodesic midpoint has equal half lengths',()=>{let a=[.8,.1],b=[-.2,.6],m=G.midpoint(a,b);close(G.distance(a,m),G.distance(m,b));close(G.distance(a,m)*2,G.distance(a,b))});
test('all regular tilings have correct angles, equal sides, and shared edges',()=>{for(const [id,s]of Object.entries(G.presets).filter(([,s])=>!s.mixed)){const mesh=G.buildMesh(id,150),f=mesh.faces[0],v=f.vertices.filter((_,i)=>i%2===0).map(id=>mesh.dots.get(id).z);for(let i=0;i<v.length;i++){close(G.angle(v[(i-1+v.length)%v.length],v[i],v[(i+1)%v.length]),2*Math.PI/s.q);close(G.distance(v[i],v[(i+1)%v.length]),G.distance(v[0],v[1]))}assert.ok(mesh.dualFaces.length>0);assert.ok([...mesh.edges.values()].filter(e=>e.type==='primary').length<mesh.faces.length*s.p*2);assert.equal([...mesh.edges.values()].filter(e=>e.type==='radial').length,mesh.faces.length*s.p)}});
test('mixed Wythoff construction is uniform 4.6.14, dual edges cross perpendicularly',()=>{const mesh=G.buildMesh('truncated',160);assert.deepEqual([...new Set(mesh.faces.map(f=>f.vertices.length/2))].sort((a,b)=>a-b),[4,6,14]);let lengths=[...mesh.edges.values()].filter(e=>e.type==='primary').map(e=>e.length);assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-5);let cross=[...mesh.dots.values()].find(d=>d.type==='crossing'&&G.norm(d.z)<.4);const p=[...mesh.edges.values()].find(e=>e.type==='primary'&&(e.a===cross.id||e.b===cross.id)),d=[...mesh.edges.values()].find(e=>e.type==='dual'&&(e.a===cross.id||e.b===cross.id));close(G.angle(mesh.dots.get(p.a===cross.id?p.b:p.a).z,cross.z,mesh.dots.get(d.a===cross.id?d.b:d.a).z),Math.PI/2)});
function demo(){const mesh=G.buildMesh('bolza',100),f=mesh.faces[0],selected=new Set([f.id]),pairs=[];for(let i=0;i<8;i++){let j=i+8+(i%2?-1:1);pairs.push({e1:f.edges[i],v1:f.vertices[i],e2:f.edges[j],v2:f.vertices[(j+1)%16]})}return {mesh,f,selected,pairs}}
test('opposite octagon gluing gives a smooth genus 2 surface and area 4pi',()=>{let {mesh,selected,pairs}=demo(),r=analyze(mesh,selected,pairs);assert.equal(r.status,'closed');assert.equal(r.orientable,true);assert.equal(r.chi,-2);assert.equal(r.smooth,true);assert.equal(r.components,1);close(r.area,4*Math.PI);close(r.gaussBonnet,0);assert.ok(r.angleSums.every(a=>Math.abs(a-2*Math.PI)<1e-6))});
test('incomplete gluing reports boundary rather than inventing a genus',()=>{let {mesh,selected,pairs}=demo(),r=analyze(mesh,selected,pairs.slice(1));assert.equal(r.status,'open');assert.equal(r.open,2);assert.equal(r.chi,undefined)});
test('reversed pairing creates a nonorientable surface',()=>{let {mesh,f,selected,pairs}=demo();for(let i=0;i<2;i++){const p=pairs[i],e=mesh.edges.get(p.e2);p.v2=p.v2===e.a?e.b:e.a}let r=analyze(mesh,selected,pairs);assert.equal(r.status,'closed');assert.equal(r.orientable,false)});
test('duplicate gluings and non-boundary gluings are rejected',()=>{let {mesh,f,selected,pairs}=demo();assert.equal(analyze(mesh,selected,[...pairs,pairs[0]]).status,'invalid');selected.add(mesh.faces[1].id);assert.equal(analyze(mesh,selected,pairs).status,'invalid')});
test('region made from two adjacent faces has exactly its exterior boundary',()=>{let mesh=G.buildMesh('hept',100),r=analyze(mesh,new Set([mesh.faces[0].id,mesh.faces[1].id]),[]);assert.equal(r.status,'open');assert.equal(r.boundary,24)});

test('shared labels use direct incidence, not proximity or chains',()=>{
 const mesh=G.buildMesh('hept',30),f=mesh.faces[0],e=mesh.edges.get(f.edges[0]),next=mesh.edges.get(f.edges[1]),far=mesh.edges.get(f.edges[4]);
 assert.equal(G.objectsTouch(mesh,e.id,e.a),true);
 assert.equal(G.objectsTouch(mesh,e.b,e.id),true);
 assert.equal(G.objectsTouch(mesh,e.id,next.id),true);
 assert.equal(G.objectsTouch(mesh,e.a,e.b),false);
 assert.equal(G.objectsTouch(mesh,e.id,far.id),false);
 assert.equal(G.objectsTouch(mesh,e.id,far.a),false);
});

test('identification accepts two segments or two complete edges in any selection order',()=>{
 const mesh=G.buildMesh('hept',30),f=mesh.faces[0];
 const s=G.identificationSides(mesh,[f.edges[0],f.edges[6]]);
 assert.equal(s.length,2);assert.equal(s[0].edges.length,1);
 const sides=G.identificationSides(mesh,[f.edges[7],f.edges[0],f.edges[6],f.edges[1]]);
 assert.equal(sides.length,2);assert.ok(sides.every(s=>s.edges.length===2));
 const records=G.orientIdentification(mesh,sides,sides[0].ends[0],sides[1].ends[1]);
 assert.equal(records.length,2);
 assert.equal(new Set(records.flatMap(p=>[p.e1,p.e2])).size,4);
 assert.ok(records.every(p=>Math.abs(mesh.edges.get(p.e1).length-mesh.edges.get(p.e2).length)<1e-6));
});
test('selection rejects partial chains, duplicate edges, unequal lengths and mixed families',()=>{
 const mesh=G.buildMesh('hept',30),f=mesh.faces[0];
 assert.throws(()=>G.identificationSides(mesh,[f.edges[0],f.edges[1],f.edges[2],f.edges[4]]),/straight chains/);
 assert.throws(()=>G.identificationSides(mesh,[f.edges[0],f.edges[0]]),/Select two/);
 const dual=[...mesh.edges.values()].find(e=>e.type==='dual');
 assert.throws(()=>G.identificationSides(mesh,[f.edges[0],dual.id]),/segment by segment/);
 const sides=G.identificationSides(mesh,[f.edges[0],f.edges[1],f.edges[6],f.edges[7]]);
 assert.throws(()=>G.orientIdentification(mesh,sides,sides[0].middle,sides[1].ends[0]),/outer endpoint/);
});
test('complete dual edges are recognized at crossings',()=>{
 const mesh=G.buildMesh('hept',100);const f=mesh.dualFaces.find(f=>f.edges.length>=6);
 // Find two complete dual edges sharing their crossing dots in the polygon boundary.
 const k=f.vertices.findIndex(v=>mesh.dots.get(v).type==='center'),n=f.edges.length;
 const ids=[f.edges[k],f.edges[(k+1)%n],f.edges[(k+2)%n],f.edges[(k+3)%n]];
 const sides=G.identificationSides(mesh,ids);
 assert.ok(sides.every(s=>s.ends.every(v=>mesh.dots.get(v).type==='center')));
});

import {mixedChains,syntheticChains} from './chain-fixtures.mjs';
test('mixed chains longer than four segments match in hyperbolic order',()=>{
 const mesh=G.buildMesh('hept',450),chains=mixedChains(mesh),ids=chains.flatMap(c=>c.edges);
 assert.equal(ids.length,10);assert.deepEqual(chains[0].edges.map(id=>mesh.edges.get(id).type),['primary','primary','radial','dual','dual']);
 const sides=G.identificationSides(mesh,[...ids].reverse());assert.ok(sides.every(s=>s.edges.length===5));
 const records=G.orientIdentification(mesh,sides,sides[0].ends[0],sides[1].ends[0]);assert.equal(records.length,5);
 for(const p of records){assert.equal(mesh.edges.get(p.e1).type,mesh.edges.get(p.e2).type);close(mesh.edges.get(p.e1).length,mesh.edges.get(p.e2).length)}
 assert.throws(()=>G.orientIdentification(mesh,sides,sides[0].ends[0],sides[1].ends[1]),/orientation/);
});
test('straightness is invariant under disk isometries, even for curved screen arcs',()=>{
 const mesh=G.buildMesh('hept',450),chains=mixedChains(mesh),ids=chains.flatMap(c=>c.edges);
 const transformed={...mesh,dots:new Map([...mesh.dots].map(([id,d])=>[id,{...d,z:G.fromOrigin(G.rotate(d.z,.6),[.2,.3])}]))};
 const sides=G.identificationSides(transformed,ids);assert.equal(sides[0].edges.length,5);
});
test('matching total lengths alone do not allow different segment types or subdivision counts',()=>{
 const x=syntheticChains(['primary','primary','radial','dual','dual'],['primary','primary','radial','primary','primary']);
 assert.throws(()=>G.identificationSides(x.mesh,[...x.a,...x.b]),/segment by segment/);
 const y=syntheticChains(['primary','primary','radial','dual','dual'],['primary','primary','radial']);
 assert.throws(()=>G.identificationSides(y.mesh,[...y.a,...y.b]),/segment by segment/);
});
test('bends, gaps and mismatched segment lengths are rejected',()=>{
 for(const option of ['bend','gap','lengthChange']){const x=syntheticChains(['primary','primary','radial','dual','dual'],undefined,{[option]:true});assert.throws(()=>G.identificationSides(x.mesh,[...x.a,...x.b]),/straight chains|segment by segment/)}
});
test('large selections have no segment-count cap and may share a joining endpoint',()=>{
 const types=Array(100).fill('radial'),x=syntheticChains(types);const sides=G.identificationSides(x.mesh,[...x.a,...x.b]);assert.equal(sides[0].edges.length,100);
 const mesh=G.buildMesh('hept',30),f=mesh.faces[0],s=G.identificationSides(mesh,[f.edges[0],f.edges[1]]);assert.equal(s.length,2);assert.ok(s.every(side=>side.edges.length===1));
});
