import http from 'node:http';
import {readFile} from 'node:fs/promises';
const allowed = {'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs','/core.mjs':'core.mjs','/style.css':'style.css','/README.md':'README.md'};
const types={html:'text/html',mjs:'text/javascript',css:'text/css',md:'text/plain'};
http.createServer(async(req,res)=>{const file=allowed[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]+'; charset=utf-8'});res.end(body);}catch{res.writeHead(500);res.end('Unable to load file');}}).listen(4173,'127.0.0.1',()=>console.log('ForecastForge: http://127.0.0.1:4173'));
