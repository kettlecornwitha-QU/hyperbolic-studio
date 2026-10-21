import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMesh,macbeathExample,identificationSides,orientIdentification} from '../geometry.mjs';
import {analyze} from '../topology.mjs';

test('Macbeath development has the smooth genus 7 metric and valid complete-edge pairings',()=>{
  const mesh=buildMesh('hept',1000),e=macbeathExample(mesh),a=analyze(mesh,e.selected,e.pairs);
  assert.equal(e.heptagons,72);assert.equal(e.darts,504);assert.equal(e.selected.size,1008);
  assert.equal(a.status,'closed');assert.equal(a.components,1);assert.equal(a.orientable,true);assert.equal(a.smooth,true);
  assert.equal(a.chi,-12);assert.equal(a.V,492);assert.equal(a.E,1512);assert.equal(a.F,1008);
  assert.ok(Math.abs(a.area-24*Math.PI)<1e-8);assert.ok(Math.abs(a.gaussBonnet)<1e-8);
  assert.ok(a.angleSums.every(x=>Math.abs(x-2*Math.PI)<1e-8));
  const groups=new Map();for(const p of e.pairs){if(!groups.has(p.group))groups.set(p.group,[]);groups.get(p.group).push(p)}
  assert.equal(groups.size,97);
  for(const records of groups.values()){
    assert.equal(records.length,2);
    const sides=identificationSides(mesh,records.flatMap(p=>[p.e1,p.e2]));
    const starts=sides.map(s=>s.ends.find(v=>records.some(p=>(s.edges.includes(p.e1)&&p.v1===v)||(s.edges.includes(p.e2)&&p.v2===v))));
    const expected=orientIdentification(mesh,sides,...starts);
    for(const q of expected)assert.ok(records.some(p=>(p.e1===q.e1&&p.v1===q.v1&&p.e2===q.e2&&p.v2===q.v2)||(p.e2===q.e1&&p.v2===q.v1&&p.e1===q.e2&&p.v1===q.v2)));
  }
});

test('Macbeath generators generate PSL(2,8) with exact triangle orders',()=>{
  // Independent polynomial-product reduction and exhaustive matrix closure.
  function product(a,b){let p=0;for(let bit=0;bit<3;bit++)if(b&(1<<bit))p^=a<<bit;for(let bit=4;bit>=3;bit--)if(p&(1<<bit))p^=11<<(bit-3);return p}
  const mul=(a,b)=>[product(a[0],b[0])^product(a[1],b[2]),product(a[0],b[1])^product(a[1],b[3]),product(a[2],b[0])^product(a[3],b[2]),product(a[2],b[1])^product(a[3],b[3])];
  const I=[1,0,0,1],R=[2,0,1,5],S=[0,1,1,0];
  function order(g){let h=I;for(let i=1;i<=7;i++){h=mul(h,g);if(h.join()===I.join())return i}}
  assert.equal(order(R),7);assert.equal(order(S),2);assert.equal(order(mul(R,S)),3);
  const all=[I],seen=new Set([I.join()]);for(let i=0;i<all.length;i++)for(const g of [R,S]){const h=mul(all[i],g);assert.equal(product(h[0],h[3])^product(h[1],h[2]),1);if(!seen.has(h.join())){seen.add(h.join());all.push(h)}}
  assert.equal(all.length,504);
});
