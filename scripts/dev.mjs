import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handleApi } from '../worker/api.js';
import { createLocalStorage } from './local-storage.mjs';

const storage=createLocalStorage('.local-data');
const server=createServer(async(req,res)=>{
  try {
    const headers=new Headers(req.headers);
    // The development API binds only to loopback; never use this identity shim in production.
    headers.set('oai-authenticated-user-id','local-development');
    headers.set('oai-authenticated-user-email','luoxi813@outlook.com');
    const origin=headers.get('origin');
    if(origin&&!['http://localhost:3000','http://127.0.0.1:3000','http://127.0.0.1:8899'].includes(origin)){res.writeHead(403);res.end('Cross-origin request rejected');return;}
    const request=new Request(`${origin||'http://127.0.0.1:3000'}${req.url}`,{method:req.method,headers,...!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{}});
    const response=await handleApi(request,storage);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end('Local API error');}
});
server.listen(8899,'127.0.0.1',()=>{
  console.log('本机数据库 API: http://127.0.0.1:8899（仅本机访问）');
  const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1'],{stdio:'inherit',env:{...process.env,PCT_LOCAL_API:'http://127.0.0.1:8899'}});
  let closing=false;
  function close(code=0){if(closing)return;closing=true;next.kill('SIGTERM');server.close(()=>{storage.close();process.exit(code);});}
  next.on('exit',code=>close(code||0));process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
});
server.on('error',error=>{console.error(error.message);storage.close();process.exit(1);});
