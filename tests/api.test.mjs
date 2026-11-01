import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleApi } from '../worker/api.js';
import { call, storage, rootSession } from './auth-fixture.mjs';

test('persistent production lifecycle, password authorization, drafts and optimistic updates',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-api-'));let env=storage(folder);
  try {
    assert.equal((await call(env,'/api/productions',{method:'POST',body:{}})).status,401);
    assert.equal((await call(env,'/api/setup',{method:'POST'})).status,410);
    const cookie=await rootSession(env);
    assert.equal((await call(env,'/api/productions?scope=all')).status,401);
    const production={id:'2027-test',title:'测试剧目',synopsis:'只属于这场戏的故事',cast:[{role:'主角',name:'演员'}]};
    let response=await call(env,'/api/productions',{cookie,method:'POST',body:{production,publicationStatus:'draft'}});
    assert.equal(response.status,201);assert.equal((await response.json()).record.version,1);
    assert.equal((await call(env,'/api/productions',{method:'POST',headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'luoxi813@outlook.com'},body:{production,publicationStatus:'published'}})).status,401);
    assert.equal((await call(env,'/api/productions',{cookie,method:'POST',body:{production,publicationStatus:'draft'}})).status,409);
    assert.equal((await (await call(env,'/api/productions')).json()).records.length,0);
    assert.equal((await call(env,'/api/productions/2027-test')).status,404);
    assert.equal((await call(env,'/api/productions/2027-test',{cookie})).status,200);
    assert.equal((await call(env,'/api/productions',{method:'POST',cookie,headers:{Origin:'https://attacker.test'},body:{production,publicationStatus:'published'}})).status,403);
    response=await call(env,'/api/productions/2027-test',{method:'PUT',cookie,body:{production,publicationStatus:'published',version:1}});
    assert.equal(response.status,200);assert.equal((await response.json()).record.version,2);
    assert.equal((await (await call(env,'/api/productions')).json()).records[0].production.title,'测试剧目');
    assert.equal((await call(env,'/api/productions/2027-test',{method:'PUT',cookie,body:{production:{...production,title:'过期修改'},publicationStatus:'published',version:1}})).status,409);
    env.close();env=storage(folder);
    assert.equal((await (await call(env,'/api/productions/2027-test')).json()).record.version,2);
    response=await call(env,'/api/productions/2027-test',{method:'PUT',cookie,body:{production,publicationStatus:'draft',version:2}});
    assert.equal(response.status,200);assert.equal((await call(env,'/api/productions/2027-test')).status,404);
    assert.equal((await call(env,'/api/productions',{method:'POST',cookie,body:{production:{id:'bad',title:'',cast:[null]},publicationStatus:'published'}})).status,400);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});

test('media is authenticated, validated and survives storage reopening',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-media-'));let env=storage(folder);
  try {
    const cookie=await rootSession(env);
    const upload=(bytes,authenticated=true)=>handleApi(new Request('https://site.test/api/media',{method:'POST',headers:authenticated?{Cookie:cookie}:{},body:bytes}),env);
    assert.equal((await upload('not a file')).status,415);
    assert.equal((await upload('%PDF-1.7\nexample',false)).status,401);
    const response=await upload('%PDF-1.7\nexample');assert.equal(response.status,201);
    const {url}=await response.json();assert.match(url,/^\/media\/.+\.pdf$/);
    env.close();env=storage(folder);
    const downloaded=await handleApi(new Request('https://site.test'+url),env);
    assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('content-type'),'application/pdf');assert.equal(await downloaded.text(),'%PDF-1.7\nexample');
    assert.equal((await handleApi(new Request('https://site.test/media/no-such.pdf'),env)).status,404);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});

test('retired maintenance import cannot write even with a former runtime secret',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pct-retired-import-'));const env=storage(folder);
  env.ARCHIVE_IMPORT_TOKEN='a'.repeat(64);
  try {
    const response=await call(env,'/api/archive-import',{method:'POST',headers:{'x-archive-import-token':env.ARCHIVE_IMPORT_TOKEN},body:{production:{id:'2025-retired',title:'不可导入'},publicationStatus:'published'}});
    assert.equal(response.status,404);
    assert.equal((await env.DB.prepare('SELECT * FROM productions').all()).results.length,0);
  }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});
