import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'node:crypto';
const PORT=Number(process.env.PORT||8787);
const rooms=new Map();
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('VELARYS multiplayer server online\n')});
const wss=new WebSocketServer({server,maxPayload:4096});
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
function broadcast(r,obj){for(const c of r.clients)send(c,obj)}
function state(r){broadcast(r,{type:'state',room:r.id,progress:r.progress,players:[...r.clients].map(c=>({name:c.nickname}))})}
function leave(ws){const r=ws.room;if(!r)return;r.clients.delete(ws);ws.room=null;broadcast(r,{type:'notice',message:`${ws.nickname} saiu da sala`});if(!r.clients.size)rooms.delete(r.id);else state(r)}
wss.on('connection',ws=>{ws.on('message',buf=>{let m;try{m=JSON.parse(buf.toString())}catch{return}if(!m||typeof m.type!=='string')return;
if(m.type==='create'||m.type==='join'){leave(ws);let id=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);if(m.type==='create'){if(id.length<4)id=randomBytes(3).toString('hex').toUpperCase();if(rooms.has(id)){send(ws,{type:'error',message:'Código já usado'});return}rooms.set(id,{id,progress:0,clients:new Set()})}const r=rooms.get(id);if(!r){send(ws,{type:'error',message:'Sala não encontrada'});return}if(r.clients.size>=5){send(ws,{type:'error',message:'Sala cheia (5 jogadores)'});return}ws.nickname=String(m.name||'Aventureiro').replace(/[<>]/g,'').slice(0,22);ws.room=r;r.clients.add(ws);broadcast(r,{type:'notice',message:`${ws.nickname} entrou`});state(r);return}
const r=ws.room;if(!r)return;
if(m.type==='chat'){const t=String(m.text||'').trim().slice(0,160);if(t)broadcast(r,{type:'chat',name:ws.nickname,text:t})}
if(m.type==='collect'){r.progress=Math.min(10,r.progress+1);state(r);if(r.progress===10)broadcast(r,{type:'notice',message:'Missão coletiva concluída! ✨'})}
});ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws))});
server.listen(PORT,'0.0.0.0',()=>console.log(`VELARYS em :${PORT}`));