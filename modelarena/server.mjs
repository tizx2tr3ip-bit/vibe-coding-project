import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.mjs':'app.mjs','/core.mjs':'core.mjs','/sample.mjs':'sample.mjs','/README.md':'README.md'};
const types={html:'text/html',css:'text/css',mjs:'text/javascript',md:'text/plain'};
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end('Not found');return;}try{res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]+'; charset=utf-8'});res.end(await readFile(new URL(file,import.meta.url)));}catch{res.end('Unable to read file');}}).listen(4174,'127.0.0.1',()=>console.log('ModelArena: http://127.0.0.1:4174'));
