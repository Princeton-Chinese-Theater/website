import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../lib/api.ts';

test('API client reports an HTML error page without exposing the JSON parser exception',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('<!DOCTYPE html><html>Not found</html>',{status:404,headers:{'Content-Type':'text/html'}});
  try{await assert.rejects(api('/api/productions'),/剧目资料接口暂时不可用/);}
  finally{globalThis.fetch=original;}
});

test('API client reports a malformed JSON response clearly',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{broken',{headers:{'Content-Type':'application/json'}});
  try{await assert.rejects(api('/api/productions'),/剧目资料读取失败/);}
  finally{globalThis.fetch=original;}
});

test('API client preserves server errors and requests JSON explicitly',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(path,options)=>{
    assert.equal(options.headers.get('Accept'),'application/json');
    return Response.json({error:'剧目资料服务尚未连接，请稍后重试'},{status:503});
  };
  try{await assert.rejects(api('/api/productions'),/剧目资料服务尚未连接/);}
  finally{globalThis.fetch=original;}
});
