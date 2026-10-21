// Curvature -1; complex disk coordinates are [x,y].
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]], scale=(a,s)=>[a[0]*s,a[1]*s], conj=a=>[a[0],-a[1]], norm=a=>Math.hypot(...a);
export const div=(a,b)=>scale(mul(a,conj(b)),1/(b[0]*b[0]+b[1]*b[1]));
export const toOrigin=(z,a)=>div(sub(z,a),sub([1,0],mul(conj(a),z)));
export const fromOrigin=(z,a)=>div(add(z,a),add([1,0],mul(conj(a),z)));
export const rotate=(z,t)=>mul(z,[Math.cos(t),Math.sin(t)]);
export const distance=(a,b)=>2*Math.atanh(Math.min(1-1e-14,norm(toOrigin(b,a))));
export function interpolate(a,b,t){let w=toOrigin(b,a),r=norm(w);return r<1e-14?a:fromOrigin(scale(w,Math.tanh(t*Math.atanh(Math.min(r,1-1e-14)))/r),a)}
export const midpoint=(a,b)=>interpolate(a,b,.5);
export const key=z=>z.map(x=>Math.round(x*1e8)).join(',');
export function reflect(z,a,b){const w=toOrigin(z,a),d=toOrigin(b,a);return fromOrigin(mul(div(d,conj(d)),conj(w)),a)}
export function angle(a,b,c){let u=toOrigin(a,b),v=toOrigin(c,b);return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(norm(u)*norm(v)))))}
export function incenter(a,b,c){const pts=[a,b,c],weights=[Math.sinh(distance(b,c)),Math.sinh(distance(a,c)),Math.sinh(distance(a,b))];let h=[0,0,0];pts.forEach((z,i)=>{const r2=norm(z)**2,d=1-r2;h[0]+=weights[i]*(1+r2)/d;h[1]+=weights[i]*2*z[0]/d;h[2]+=weights[i]*2*z[1]/d});let n=Math.sqrt(h[0]**2-h[1]**2-h[2]**2);return [h[1]/(h[0]+n),h[2]/(h[0]+n)]}
export const presets={hept:{name:'Heptagonal · {7,3}',p:7,q:3},oct:{name:'Octagonal · {8,3}',p:8,q:3},bolza:{name:'Octagonal · {8,8}',p:8,q:8},pent:{name:'Pentagonal · {5,4}',p:5,q:4},square:{name:'Square · {4,5}',p:4,q:5},tri:{name:'Triangular · {3,7}',p:3,q:7},truncated:{name:'Truncated triheptagonal · 4.6.14',p:7,q:3,mixed:true}};
export function baseTiles(p,q,limit=1000){const r=Math.sqrt(Math.cos(Math.PI/p+Math.PI/q)/Math.cos(Math.PI/p-Math.PI/q));const first=Array.from({length:p},(_,i)=>rotate([r,0],(i+.5)*2*Math.PI/p));let tiles=[{c:[0,0],v:first}],seen=new Set(['0,0']);for(let i=0;i<tiles.length&&tiles.length<limit;i++){const f=tiles[i];for(let j=0;j<p&&tiles.length<limit;j++){const a=f.v[j],b=f.v[(j+1)%p],c=reflect(f.c,a,b),k=key(c);if(norm(c)>.9975||seen.has(k))continue;seen.add(k);let v=f.v.map(z=>reflect(z,a,b)).reverse();tiles.push({c,v})}}return tiles}
function ccw(v,c){return v.slice().sort((a,b)=>{const aa=toOrigin(a,c),bb=toOrigin(b,c);return Math.atan2(aa[1],aa[0])-Math.atan2(bb[1],bb[0])})}
export function buildMesh(preset='hept',limit=1000){const spec=presets[preset],base=baseTiles(spec.p,spec.q,limit);let polys=base;if(spec.mixed){let groups=new Map();function put(c,z,n){let k=key(c),g=groups.get(k);if(!g)groups.set(k,g={c,z:new Map(),n});g.z.set(key(z),z)}for(const f of base){for(let i=0;i<f.v.length;i++){const a=f.v[i],b=f.v[(i+1)%f.v.length],m=midpoint(a,b);for(const v of [a,b]){let z=incenter(f.c,v,m);put(f.c,z,2*spec.p);put(v,z,2*spec.q);put(m,z,4)}}}polys=[...groups.values()].filter(g=>g.z.size===g.n).map(g=>({c:g.c,v:ccw([...g.z.values()],g.c)}))}
let dots=new Map(),edges=new Map(),faces=[],sides=new Map();const dot=(z,type)=>{let id=type[0]+':'+key(z);if(!dots.has(id))dots.set(id,{id,z,type});return id};const edge=(a,b,type)=>{let id=type[0]+':'+[a,b].sort().join('|');if(!edges.has(id))edges.set(id,{id,a,b,type,length:distance(dots.get(a).z,dots.get(b).z)});return id};
for(const f of polys){let c=dot(f.c,'center'),vs=f.v.map(v=>dot(v,'vertex')),boundary=[],es=[],triangles=[];for(let i=0;i<vs.length;i++){let a=vs[i],b=vs[(i+1)%vs.length],m=dot(midpoint(dots.get(a).z,dots.get(b).z),'crossing');boundary.push(a,m);es.push(edge(a,m,'primary'),edge(m,b,'primary'));edge(c,m,'dual');edge(c,a,'radial');triangles.push([c,a,m,0],[c,m,b,1]);const sk=[a,b].sort().join('|');if(!sides.has(sk))sides.set(sk,[]);sides.get(sk).push({c,m,a,b})}faces.push({id:'P:'+c,c,vertices:boundary,edges:es,triangles,family:'primary'})}
// The dual's polygon at each original vertex alternates centers and crossings.
let around=new Map();for(const f of faces){for(let i=0;i<f.vertices.length;i+=2){let v=f.vertices[i];if(!around.has(v))around.set(v,new Set());around.get(v).add(f.c);around.get(v).add(f.vertices[(i+1)%f.vertices.length]);around.get(v).add(f.vertices[(i-1+f.vertices.length)%f.vertices.length])}}
let dualFaces=[];for(const [v,ids]of around){let vv=ccw([...ids].map(id=>dots.get(id).z),dots.get(v).z).map(z=>[...ids].find(id=>dots.get(id).z===z));if(vv.length<6||vv.length%2)continue;let es=vv.map((a,i)=>'d:'+ [a,vv[(i+1)%vv.length]].sort().join('|'));if(es.some(id=>!edges.has(id)))continue;dualFaces.push({id:'D:'+v,c:v,vertices:vv,edges:es,family:'dual'})}
const triangles=[],triangleById=new Map(),trianglesByDot=new Map(),trianglesByEdge=new Map();
const edgeByEndpoints=new Map([...edges.values()].map(e=>[[e.a,e.b].sort().join('|'),e.id]));
function incident(index,key,id){if(!index.has(key))index.set(key,[]);index.get(key).push(id)}
for(const f of faces)for(const flag of f.triangles){
  const vertices=flag.slice(0,3),id='T:'+vertices.slice().sort().join('|');
  const es=vertices.map((v,i)=>edgeByEndpoints.get([v,vertices[(i+1)%3]].sort().join('|')));
  if(es.some(e=>!e))throw Error('Triangle boundary is missing an edge.');
  const klein=vertices.map(v=>toKlein(dots.get(v).z));
  const t={id,vertices,edges:es,family:'triangle',shade:flag[3],primary:f.id,klein,
    bounds:[Math.min(...klein.map(z=>z[0])),Math.min(...klein.map(z=>z[1])),Math.max(...klein.map(z=>z[0])),Math.max(...klein.map(z=>z[1]))]};
  triangles.push(t);triangleById.set(id,t);
  for(const v of vertices)incident(trianglesByDot,v,id);
  for(const e of es)incident(trianglesByEdge,e,id);
}
return {dots,edges,faces,dualFaces,triangles,triangleById,trianglesByDot,trianglesByEdge,spec,preset,baseCount:base.length}}
export function geodesicSamples(a,b,n=12){return Array.from({length:n+1},(_,i)=>interpolate(a,b,i/n))}
export function faceArea(face,mesh){const v=face.vertices.map(id=>mesh.dots.get(id).z);return (v.length-2)*Math.PI-v.reduce((s,z,i)=>s+angle(v[(i-1+v.length)%v.length],z,v[(i+1)%v.length]),0)}

// Incidence is geometric, not transitive through a chain or a quotient gluing.
export function objectsTouch(mesh,a,b){
  if(a===b)return true;
  const ea=mesh.edges.get(a),eb=mesh.edges.get(b);
  if(ea&&eb)return ea.a===eb.a||ea.a===eb.b||ea.b===eb.a||ea.b===eb.b;
  if(ea)return mesh.dots.has(b)&&(ea.a===b||ea.b===b);
  if(eb)return mesh.dots.has(a)&&(eb.a===a||eb.b===a);
  return false;
}

// Straight means one hyperbolic geodesic, not a straight Euclidean chord on screen.
export function straightContinuation(mesh,first,second,at){
  const a=mesh.edges.get(first),b=mesh.edges.get(second),z=mesh.dots.get(at)?.z;
  if(!a||!b||!z||first===second)return false;
  if(![a.a,a.b].includes(at)||![b.a,b.b].includes(at))return false;
  const u=toOrigin(mesh.dots.get(a.a===at?a.b:a.a).z,z),v=toOrigin(mesh.dots.get(b.a===at?b.b:b.a).z,z),n=norm(u)*norm(v);
  return n>1e-16&&u[0]*v[0]+u[1]*v[1]<0&&Math.abs(u[0]*v[1]-u[1]*v[0])/n<2e-5;
}
export function orderedChain(mesh,side,start){
  if(!side.ends.includes(start))throw Error('Choose an outer endpoint of each selected chain.');
  const forward=side.ends[0]===start,edges=forward?side.edges:[...side.edges].reverse(),vertices=forward?side.vertices:[...side.vertices].reverse();
  return edges.map((edge,i)=>({edge,start:vertices[i]}));
}
function matchingChains(mesh,a,b){
  return a.length===b.length&&a.every((id,i)=>{
    const x=mesh.edges.get(id),y=mesh.edges.get(b[i]);
    return x.type===y.type&&Math.abs(x.length-y.length)<1e-5;
  });
}
export function identificationSides(mesh,ids){
  if(ids.length<2||ids.length%2||new Set(ids).size!==ids.length)throw Error('Select two matching straight chains with the same number of segments.');
  if(ids.some(id=>!mesh.edges.has(id)))throw Error('The selection contains an unknown segment.');
  const at=new Map();for(const id of ids){const e=mesh.edges.get(id);for(const v of [e.a,e.b]){if(!at.has(v))at.set(v,[]);at.get(v).push(id)}}
  const next=new Map();
  for(const [v,edges]of at){const connections=new Map();for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
    if(!straightContinuation(mesh,edges[i],edges[j],v))continue;
    if(connections.has(edges[i])||connections.has(edges[j]))throw Error('Overlapping segments make the straight chains ambiguous.');
    connections.set(edges[i],edges[j]);connections.set(edges[j],edges[i]);
  }next.set(v,connections)}
  const side=(edges,vertices)=>({edges,vertices,ends:[vertices[0],vertices.at(-1)],middle:edges.length===2?vertices[1]:null});
  const seen=new Set(),chains=[];
  for(const id of ids){
    if(seen.has(id))continue;
    const e=mesh.edges.get(id);let initial=null;
    // Find this chain's end first, regardless of selection order.
    let cur=id,v=e.a;const back=new Set();
    while(true){if(back.has(cur))throw Error('A selected chain must have two outer endpoints.');back.add(cur);const previous=next.get(v).get(cur);if(!previous){initial=v;break}const p=mesh.edges.get(previous);v=p.a===v?p.b:p.a;cur=previous}
    let edges=[],vertices=[initial];v=initial;
    while(cur){if(seen.has(cur))throw Error('Selected chains overlap.');seen.add(cur);edges.push(cur);const edge=mesh.edges.get(cur);v=edge.a===v?edge.b:edge.a;vertices.push(v);cur=next.get(v).get(cur)}
    chains.push(side(edges,vertices));
  }
  // Adjacent chains on one geodesic have a common endpoint and appear as one run.
  if(chains.length===1){const chain=chains[0],n=chain.edges.length/2;chains.splice(0,1,side(chain.edges.slice(0,n),chain.vertices.slice(0,n+1)),side(chain.edges.slice(n),chain.vertices.slice(n)))}
  if(chains.length!==2)throw Error('The selection must form exactly two continuous straight chains, without gaps or bends.');
  const [a,b]=chains;
  if(!matchingChains(mesh,a.edges,b.edges)&&!matchingChains(mesh,a.edges,[...b.edges].reverse()))throw Error('The two chains must match segment by segment in edge type and hyperbolic length.');
  return chains;
}
export function orientIdentification(mesh,sides,start1,start2){
  const a=orderedChain(mesh,sides[0],start1),b=orderedChain(mesh,sides[1],start2);
  if(!matchingChains(mesh,a.map(x=>x.edge),b.map(x=>x.edge)))throw Error('The segment types or lengths do not match in this orientation. Choose the other endpoint.');
  return a.map((x,i)=>({e1:x.edge,v1:x.start,e2:b[i].edge,v2:b[i].start}));
}

// The Klein model makes geodesic sides straight, so triangle picking is exact
// up to floating-point error and independent of canvas pixel density.
export function toKlein(z){return scale(z,2/(1+norm(z)**2))}
export function triangleAt(mesh,z){
  const k=toKlein(z);
  for(const t of mesh.triangles){
    const [left,bottom,right,top]=t.bounds;if(k[0]<left||k[0]>right||k[1]<bottom||k[1]>top)continue;
    const signed=t.klein.map((a,i)=>{const b=t.klein[(i+1)%3];return (b[0]-a[0])*(k[1]-a[1])-(b[1]-a[1])*(k[0]-a[0])});
    if(signed.every(x=>x>=-1e-14)||signed.every(x=>x<=1e-14))return t;
  }
  return null;
}
export function regionTriangles(mesh,id){
  if(mesh.triangleById.has(id))return [id];
  return mesh.trianglesByDot.get(id)||mesh.trianglesByEdge.get(id)||[];
}
export function expandRegionSelection(mesh,ids){
  const polygons=new Map([...mesh.faces,...mesh.dualFaces].map(f=>[f.id,f]));
  const result=new Set();for(const id of ids){
    if(mesh.triangleById.has(id)){result.add(id);continue}
    const f=polygons.get(id);if(!f)throw Error('Region contains unknown cells.');
    for(const triangle of mesh.trianglesByDot.get(f.c)||[])result.add(triangle);
  }
  return result;
}
export function toggleRegionTriangles(selected,ids){
  const remove=ids.length>0&&ids.every(id=>selected.has(id));let changed=0;
  for(const id of ids){if(remove){selected.delete(id);changed++}else if(!selected.has(id)){selected.add(id);changed++}}
  return {remove,changed};
}

// Fricke–Macbeath: kernel of Δ+(2,3,7) → PSL(2,8).
// GF(8)=F2[t]/(t³+t+1); matrices R,S have orders 7,2 and RS has order 3.
// Right multiplication by R advances a face dart; S reverses an edge dart.
export function macbeathExample(mesh){
  if(mesh.preset!=='hept')throw Error('The Macbeath example requires the {7,3} tiling.');
  function field(a,b){let result=0;for(;b;b>>=1,a<<=1){if(a&8)a^=11;if(b&1)result^=a}return result}
  const multiply=(a,b)=>[field(a[0],b[0])^field(a[1],b[2]),field(a[0],b[1])^field(a[1],b[3]),field(a[2],b[0])^field(a[3],b[2]),field(a[2],b[1])^field(a[3],b[3])];
  const identity=[1,0,0,1],R=[2,0,1,5],S=[0,1,1,0],key=a=>a.join(',');
  const powers=[identity];for(let i=1;i<7;i++)powers.push(multiply(powers[i-1],R));
  const coset=g=>powers.map(r=>key(multiply(g,r))).sort()[0];
  const sideUses=new Map();
  for(const face of mesh.faces)for(let i=0;i<7;i++){
    const m=face.vertices[2*i+1];if(!sideUses.has(m))sideUses.set(m,[]);sideUses.get(m).push({face,i});
  }
  const seed=mesh.faces.find(f=>norm(mesh.dots.get(f.c).z)<1e-7);
  const chosen=[{face:seed,darts:powers}],seen=new Set([coset(identity)]),byFace=new Map([[seed.id,chosen[0]]]);
  for(let n=0;n<chosen.length;n++){
    const {face,darts}=chosen[n];
    for(let i=0;i<7;i++){
      const across=multiply(darts[i],S),id=coset(across);
      if(seen.has(id))continue;
      const neighbor=sideUses.get(face.vertices[2*i+1]).find(u=>u.face!==face);
      if(!neighbor)throw Error('Increase the patch size to construct the Macbeath surface.');
      const next={face:neighbor.face,darts:Array.from({length:7},(_,j)=>multiply(across,powers[(j-neighbor.i+7)%7]))};
      if(byFace.has(next.face.id))throw Error('Inconsistent Macbeath face development.');
      seen.add(id);chosen.push(next);byFace.set(next.face.id,next);
    }
  }
  if(chosen.length!==72)throw Error('Macbeath quotient must contain 72 heptagons.');
  const byDart=new Map();
  for(const entry of chosen)entry.darts.forEach((g,i)=>{const id=key(g);if(byDart.has(id))throw Error('Repeated Macbeath dart.');byDart.set(id,{face:entry.face,i})});
  if(byDart.size!==504)throw Error('Macbeath quotient must have 504 darts.');
  const pairs=[],done=new Set();let groups=0;
  for(const {face,darts}of chosen)for(let i=0;i<7;i++){
    const mate=byDart.get(key(multiply(darts[i],S))),a=face.vertices[2*i],b=face.vertices[(2*i+2)%14],m=face.vertices[2*i+1];
    if(!mate)throw Error('Missing Macbeath edge partner.');
    const j=mate.i,f=mate.face,other=f.vertices[2*j+1];
    if(m===other){if(a!==f.vertices[(2*j+2)%14]||b!==f.vertices[2*j])throw Error('Inconsistent interior Macbeath edge.');continue}
    if(done.has(m))continue;
    done.add(m);done.add(other);const group='mac'+(++groups),name='M'+String(groups).padStart(2,'0');
    // Reverse boundary direction, pairing both halves of each primary side.
    pairs.push({e1:face.edges[2*i],v1:a,e2:f.edges[2*j+1],v2:f.vertices[(2*j+2)%14],group,name});
    pairs.push({e1:face.edges[2*i+1],v1:m,e2:f.edges[2*j],v2:other,group,name});
  }
  return {selected:expandRegionSelection(mesh,chosen.map(e=>e.face.id)),pairs,heptagons:72,darts:504};
}
