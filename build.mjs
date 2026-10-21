import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=n=>readFile(path.join(root,n),'utf8');
let geometry=await read('geometry.mjs'),topology=await read('topology.mjs'),app=await read('app.mjs'),html=await read('index.html'),css=await read('style.css');
const names=[...geometry.matchAll(/export (?:const|function) (\w+)/g)].map(m=>m[1]);
// Comma-declared vector helpers are exported too.
names.push('sub','mul','scale','conj','norm');
const bundle=`(()=>{const G=(()=>{${geometry.replaceAll('export ','')}\nreturn {${[...new Set(names)].join(',')}}})();\nconst {angle,faceArea,expandRegionSelection}=G;\n${topology.replace(/^import .*?;\n/,'').replaceAll('export ','')}\n${app.replace(/^import .*?;\n/gm,'')}\n})();`;
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`).replace('<script type="module" src="app.mjs"></script>',`<script>${bundle.replaceAll('</script','<\\/script')}</script>`);
await writeFile(path.join(root,'Hyperbolic-Studio.html'),html);console.log('Built Hyperbolic-Studio.html (opens directly; no server required).');
