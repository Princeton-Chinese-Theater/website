import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleApi } from '../worker/api.js';
import { createLocalStorage } from '../scripts/local-storage.mjs';

test('persistent production lifecycle, authorization, drafts and optimistic updates',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-api-'));let env=createLocalStorage(folder);
  const request=(path,{user,method='GET',body,headers={}}={})=>handleApi(new Request('https://site.test'+path,{method,headers:{...user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user==='owner'?'luoxi813@outlook.com':'other@example.com'}:{},...body?{'Content-Type':'application/json'}:{},...headers},...body?{body:JSON.stringify(body)}:{}}),env);
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
    await handleApi(new Request('https://site.test/api/setup',{method:'POST',headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'luoxi813@outlook.com'}}),env);
    const upload=(bytes,authenticated=true)=>handleApi(new Request('https://site.test/api/media',{method:'POST',headers:authenticated?{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'luoxi813@outlook.com'}:{},body:bytes}),env);
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

test('retired maintenance import cannot write even with a former runtime secret',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-retired-import-'));const env=createLocalStorage(folder);
  env.ARCHIVE_IMPORT_TOKEN='a'.repeat(64);
  try {
    const response=await handleApi(new Request('https://site.test/api/archive-import',{
      method:'POST',headers:{'Content-Type':'application/json','x-archive-import-token':env.ARCHIVE_IMPORT_TOKEN},
      body:JSON.stringify({production:{id:'2025-retired',title:'不可导入'},publicationStatus:'published'}),
    }),env);
    assert.equal(response.status,404);
    assert.equal((await env.DB.prepare('SELECT * FROM productions').all()).results.length,0);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});

test('only the allowed authenticated email can enroll or use an existing administrator session',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-admin-email-'));const env=createLocalStorage(folder);
  const request=(path,user,email,method='GET',body)=>handleApi(new Request('https://site.test'+path,{
    method,headers:{...user?{'oai-authenticated-user-id':user}:{},...email?{'oai-authenticated-user-email':email}:{},'Content-Type':'application/json'},
    ...body?{body:JSON.stringify(body)}:{},
  }),env);
  try {
    await env.DB.prepare('INSERT INTO site_admin (id,user_id,created_at) VALUES (1,?,?)').bind('previous-owner',new Date().toISOString()).run();
    const draft={production:{id:'private-test',title:'私有草稿'},publicationStatus:'draft'};
    for(const email of ['wangluoxi813@gmail.com','other@example.com',undefined]){
      assert.equal((await (await request('/api/session','previous-owner',email)).json()).canEdit,false);
      assert.equal((await request('/api/setup','previous-owner',email,'POST')).status,403);
      assert.equal((await request('/api/productions?scope=all','previous-owner',email)).status,403);
      assert.equal((await request('/api/productions','previous-owner',email,'POST',draft)).status,403);
      assert.equal((await request('/api/productions/private-test','previous-owner',email,'PUT',draft)).status,403);
      assert.equal((await request('/api/media','previous-owner',email,'POST')).status,403);
    }
    assert.equal((await request('/api/setup',undefined,'luoxi813@outlook.com','POST')).status,401);
    const before=await (await request('/api/session','new-owner','luoxi813@outlook.com')).json();
    assert.equal(before.configured,false);assert.equal(before.canEdit,false);
    assert.equal((await request('/api/setup','new-owner','LUOXI813@OUTLOOK.COM','POST')).status,200);
    assert.equal((await request('/api/productions','new-owner','luoxi813@outlook.com','POST',draft)).status,201);
    assert.equal((await request('/api/productions/private-test','previous-owner','wangluoxi813@gmail.com')).status,404);
    assert.equal((await request('/api/productions/private-test','new-owner','luoxi813@outlook.com')).status,200);
    assert.equal((await (await request('/api/session','new-owner','other@example.com')).json()).canEdit,false);
    assert.equal((await env.DB.prepare('SELECT user_id FROM site_admin WHERE id = 1').first()).user_id,'new-owner');
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});
