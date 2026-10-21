import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT||4178),'127.0.0.1',()=>console.log('Hyperbolic Studio: http://127.0.0.1:'+server.address().port));
