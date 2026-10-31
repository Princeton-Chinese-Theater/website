import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleApi } from '../worker/api.js';
import { createLocalStorage } from '../scripts/local-storage.mjs';

test('persistent production lifecycle, authorization, drafts and optimistic updates',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-api-'));let env=createLocalStorage(folder);
  const request=(path,{user,method='GET',body,headers={}}={})=>handleApi(new Request('https://site.test'+path,{method,headers:{...user?{'oai-authenticated-user-id':user}:{},...body?{'Content-Type':'application/json'}:{},...headers},...body?{body:JSON.stringify(body)}:{}}),env);
  try {
    assert.equal((await request('/api/productions',{method:'POST',body:{}})).status,401);
    assert.equal((await request('/api/setup',{method:'POST'})).status,401);
    assert.equal((await request('/api/setup',{user:'owner',method:'POST'})).status,200);
    assert.equal((await request('/api/setup',{user:'someone-else',method:'POST'})).status,403);
    assert.equal((await request('/api/productions?scope=all')).status,401);
    const production={id:'2027-test',title:'测试剧目',synopsis:'只属于这场戏的故事',cast:[{role:'主角',name:'演员'}]};
    let response=await request('/api/productions',{user:'owner',method:'POST',body:{production,publicationStatus:'draft'}});
    assert.equal(response.status,201);assert.equal((await response.json()).record.version,1);
    assert.equal((await request('/api/productions',{method:'POST',user:'someone-else',body:{production,publicationStatus:'published'}})).status,403);
    assert.equal((await request('/api/productions',{method:'POST',user:'owner',body:{production,publicationStatus:'draft'}})).status,409);
    assert.equal((await (await request('/api/productions')).json()).records.length,0);
    assert.equal((await request('/api/productions/2027-test')).status,404);
    assert.equal((await request('/api/productions/2027-test',{user:'owner'})).status,200);
    assert.equal((await request('/api/productions',{method:'POST',user:'owner',headers:{Origin:'https://attacker.test'},body:{production,publicationStatus:'published'}})).status,403);
    response=await request('/api/productions/2027-test',{method:'PUT',user:'owner',body:{production,publicationStatus:'published',version:1}});
    assert.equal(response.status,200);assert.equal((await response.json()).record.version,2);
    assert.equal((await (await request('/api/productions')).json()).records[0].production.title,'测试剧目');
    assert.equal((await request('/api/productions/2027-test',{method:'PUT',user:'owner',body:{production:{...production,title:'过期修改'},publicationStatus:'published',version:1}})).status,409);
    env.close();env=createLocalStorage(folder);
    assert.equal((await (await request('/api/productions/2027-test')).json()).record.version,2);
    response=await request('/api/productions/2027-test',{method:'PUT',user:'owner',body:{production,publicationStatus:'draft',version:2}});
    assert.equal(response.status,200);assert.equal((await request('/api/productions/2027-test')).status,404);
    assert.equal((await request('/api/productions',{method:'POST',user:'owner',body:{production:{id:'bad',title:'',cast:[null]},publicationStatus:'published'}})).status,400);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});

test('media is authenticated, validated and survives storage reopening',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-media-'));let env=createLocalStorage(folder);
  try {
    await handleApi(new Request('https://site.test/api/setup',{method:'POST',headers:{'oai-authenticated-user-id':'owner'}}),env);
    const upload=(bytes,authenticated=true)=>handleApi(new Request('https://site.test/api/media',{method:'POST',headers:authenticated?{'oai-authenticated-user-id':'owner'}:{},body:bytes}),env);
    assert.equal((await upload('not a file')).status,415);
    assert.equal((await upload('%PDF-1.7\nexample',false)).status,401);
    const response=await upload('%PDF-1.7\nexample');assert.equal(response.status,201);
    const {url}=await response.json();assert.match(url,/^\/media\/.+\.pdf$/);
    env.close();env=createLocalStorage(folder);
    const downloaded=await handleApi(new Request('https://site.test'+url),env);
    assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('content-type'),'application/pdf');assert.equal(await downloaded.text(),'%PDF-1.7\nexample');
    assert.equal((await handleApi(new Request('https://site.test/media/no-such.pdf'),env)).status,404);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});

test('maintenance import requires a temporary secret, preserves edits and draft visibility',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-import-'));const env=createLocalStorage(folder);
  const token='a'.repeat(64);
  const production={id:'2025-import',title:'导入档案'};
  const request=(body,key=token,headers={})=>handleApi(new Request('https://site.test/api/archive-import',{method:'POST',headers:{'Content-Type':'application/json','x-archive-import-token':key,...headers},body:JSON.stringify(body)}),env);
  const body={production,publicationStatus:'draft'};
  try {
    assert.equal((await request(body)).status,404);
    env.ARCHIVE_IMPORT_TOKEN=token;
    assert.equal((await request(body,'wrong')).status,403);
    assert.equal((await request(body,token,{Origin:'https://other.test'})).status,403);
    assert.equal((await request({...body,production:{id:'invalid',title:''}})).status,400);
    const first=await (await request(body)).json();
    assert.equal(first.inserted,true);assert.equal(first.record.publicationStatus,'draft');
    assert.equal((await handleApi(new Request('https://site.test/api/productions/'+production.id),env)).status,404);
    await env.DB.prepare('UPDATE productions SET title = ?, data = ?, version = 2 WHERE id = ?').bind('线上修改',JSON.stringify({...production,title:'线上修改'}),production.id).run();
    const repeat=await (await request({...body,publicationStatus:'published'})).json();
    assert.equal(repeat.inserted,false);assert.equal(repeat.record.production.title,'线上修改');
    assert.equal(repeat.record.version,2);assert.equal(repeat.record.publicationStatus,'draft');
    assert.equal((await (await handleApi(new Request('https://site.test/api/session'),env)).json()).configured,false);
    delete env.ARCHIVE_IMPORT_TOKEN;
    assert.equal((await request(body)).status,404);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});
