import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../geometry.mjs';
import {analyze} from '../topology.mjs';

test('dot and edge incidence selects the requested triangle groups in every tiling',()=>{
  for(const preset of Object.keys(G.presets)){
    const mesh=G.buildMesh(preset,150),f=mesh.faces.find(f=>G.norm(mesh.dots.get(f.c).z)<1e-6);
    assert.equal(G.regionTriangles(mesh,f.c).length,f.vertices.length);
    const v=f.vertices[0],dual=mesh.dualFaces.find(d=>d.c===v);
    assert.ok(dual);
    assert.equal(G.regionTriangles(mesh,v).length,dual.vertices.length);
    assert.equal(G.regionTriangles(mesh,f.vertices[1]).length,4);
    for(const type of ['primary','dual','radial']){
      const e=[...mesh.edges.values()].find(e=>e.type===type&&[e.a,e.b].every(id=>G.norm(mesh.dots.get(id).z)<.9));
      assert.equal(G.regionTriangles(mesh,e.id).length,2);
    }
    for(const t of mesh.triangles.slice(0,20)){
      assert.equal(t.edges.length,3);
      assert.deepEqual(new Set(t.edges.map(id=>mesh.edges.get(id).type)),new Set(['primary','dual','radial']));
      for(let i=0;i<3;i++)assert.deepEqual(new Set([mesh.edges.get(t.edges[i]).a,mesh.edges.get(t.edges[i]).b]),new Set([t.vertices[i],t.vertices[(i+1)%3]]));
    }
  }
});

test('triangle interiors are picked geometrically, including off-center curved triangles',()=>{
  const mesh=G.buildMesh('hept',150);
  for(const t of mesh.triangles.filter(t=>t.vertices.every(id=>G.norm(mesh.dots.get(id).z)<.9)).slice(0,200)){
    const p=G.incenter(...t.vertices.map(id=>mesh.dots.get(id).z));
    assert.equal(G.triangleAt(mesh,p)?.id,t.id);
  }
});

test('overlapping selections add missing triangles and remove fully selected groups',()=>{
  const mesh=G.buildMesh('hept',150),f=mesh.faces[0],all=G.regionTriangles(mesh,f.c),corner=G.regionTriangles(mesh,f.vertices[1]),selected=new Set();
  G.toggleRegionTriangles(selected,[all[0]]);assert.equal(selected.size,1);
  let r=G.toggleRegionTriangles(selected,all);assert.equal(r.remove,false);assert.equal(r.changed,13);assert.equal(selected.size,14);
  G.toggleRegionTriangles(selected,corner);assert.equal(selected.size,16);
  r=G.toggleRegionTriangles(selected,corner);assert.equal(r.remove,true);assert.equal(selected.size,12);
  assert.ok(corner.every(id=>!selected.has(id)));
});

test('triangle-based regions have boundaries on all three edge types',()=>{
  const mesh=G.buildMesh('hept',150),t=mesh.triangles[0];
  let r=analyze(mesh,new Set([t.id]),[]);assert.equal(r.status,'open');assert.equal(r.boundary,3);assert.equal(r.faces,1);
  const across=G.regionTriangles(mesh,t.edges.find(id=>mesh.edges.get(id).type==='primary'));
  assert.equal(across.length,2);r=analyze(mesh,new Set(across),[]);assert.equal(r.boundary,4);assert.equal(r.faces,2);
  // Glue the two radial sides and the two dual sides of this two-triangle kite.
  // This is a sphere with a hyperbolic cone metric, not a smooth surface metric.
  const triangles=across.map(id=>mesh.triangleById.get(id)),pairs=[];
  for(const type of ['radial','dual']){
    const e1=mesh.edges.get(triangles[0].edges.find(id=>mesh.edges.get(id).type===type));
    const e2=mesh.edges.get(triangles[1].edges.find(id=>mesh.edges.get(id).type===type));
    const common=[e1.a,e1.b].find(v=>v===e2.a||v===e2.b);assert.ok(common);
    pairs.push({e1:e1.id,v1:common,e2:e2.id,v2:common});
  }
  r=analyze(mesh,new Set(across),pairs);assert.equal(r.status,'closed');assert.equal(r.F,2);assert.equal(r.chi,2);assert.equal(r.orientable,true);assert.equal(r.smooth,false);assert.ok(Math.abs(r.gaussBonnet)<1e-6);
});

test('legacy primary and dual polygon regions expand without changing area or boundary',()=>{
  const mesh=G.buildMesh('hept',150);
  for(const f of [mesh.faces[0],mesh.dualFaces.find(f=>G.norm(mesh.dots.get(f.c).z)<.4)]){
    const ids=G.expandRegionSelection(mesh,[f.id]);assert.equal(ids.size,f.vertices.length);
    const area=[...ids].reduce((sum,id)=>sum+G.faceArea(mesh.triangleById.get(id),mesh),0);
    assert.ok(Math.abs(area-G.faceArea(f,mesh))<1e-6);
    assert.equal(analyze(mesh,ids,[]).boundary,f.edges.length);
  }
});
