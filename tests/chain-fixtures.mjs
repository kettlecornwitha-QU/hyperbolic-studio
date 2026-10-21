import * as G from '../geometry.mjs';
export function mixedChains(mesh,count=5){
 const adjacency=new Map();for(const e of mesh.edges.values())for(const v of [e.a,e.b]){if(!adjacency.has(v))adjacency.set(v,[]);adjacency.get(v).push(e.id)}
 const center=mesh.faces[0].c,radials=adjacency.get(center).filter(id=>mesh.edges.get(id).type==='radial');
 return radials.slice(0,2).map(first=>{
   let id=first,v=center,edges=[],vertices=[v];
   for(let i=0;i<count+1;i++){
     if(!id)throw Error('Fixture needs a larger patch');
     const e=mesh.edges.get(id);edges.push(id);v=e.a===v?e.b:e.a;vertices.push(v);
     id=adjacency.get(v).find(next=>G.straightContinuation(mesh,e.id,next,v));
   }
   // Start after the first radius: primary full side + radius + dual full side.
   return {edges:edges.slice(1),vertices:vertices.slice(1),ends:[vertices[1],vertices.at(-1)]};
 });
}
export function syntheticChains(typesA,typesB=typesA,{bend=false,gap=false,lengthChange=false}={}){
 const dots=new Map(),edges=new Map();
 const make=(types,prefix,y)=>{
   let vertices=[];
   for(let i=0;i<=types.length;i++){
     let z=G.fromOrigin([Math.tanh((i-2)*.11),0],[0,y]);
     if(bend&&prefix==='B'&&i===2)z=G.add(z,[0,.04]);
     let id=prefix+i;dots.set(id,{id,z,type:'vertex'});vertices.push(id);
   }
   let ids=[];types.forEach((type,i)=>{let a=vertices[i],b=vertices[i+1];if(gap&&prefix==='B'&&i===2){let id='gap';dots.set(id,{id,z:dots.get(a).z,type:'vertex'});a=id}const id=prefix+'e'+i;edges.set(id,{id,a,b,type,length:G.distance(dots.get(a).z,dots.get(b).z)+(lengthChange&&prefix==='B'&&i===1?.05:0)});ids.push(id)});
   return ids;
 };
 const a=make(typesA,'A',-.3),b=make(typesB,'B',.3);return {mesh:{dots,edges},a,b};
}
