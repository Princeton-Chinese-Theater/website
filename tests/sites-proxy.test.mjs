import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicBackend, SITES_BACKEND } from '../lib/sites-proxy.ts';

const production={production:{id:'2026-test',title:'剧目'},publicationStatus:'published',version:1};
test('public proxy reads current records without forwarding visitor identity or query strings',async()=>{
  let destination, options;
  const response=await publicBackend(new Request('https://front.test/api/productions/?unused=1',{
    headers:{cookie:'private=1','oai-authenticated-user-id':'owner',authorization:'Bearer visitor'},
  }),'server-secret',async(url,init)=>{
    destination=url;options=init;return Response.json({records:[production]});
  });
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{records:[production]});
  assert.equal(destination,SITES_BACKEND+'/api/productions');
  assert.deepEqual(options.headers,{'OAI-Sites-Authorization':'Bearer server-secret',Accept:'application/json'});
  assert.equal(options.redirect,'manual');assert.equal(options.cache,'no-store');
});

test('proxy rejects writes, admin queries, unknown paths and missing configuration before contacting backend',async()=>{
  const noFetch=()=>{throw new Error('Unexpected upstream call');};
  for(const [path,method,token,status] of [
    ['/api/productions','POST','secret',405],
    ['/api/productions?scope=all','GET','secret',403],
    ['/api/setup','GET','secret',404],
    ['/api/backend-media/%2e%2e%2fapi%2fsession','GET','secret',404],
    ['/api/productions','GET',undefined,503],
  ]){
    const response=await publicBackend(new Request('https://front.test'+path,{method}),token,noFetch);
    assert.equal(response.status,status,path);assert.match(response.headers.get('content-type'),/application\/json/);
  }
});

test('proxy keeps drafts private and rejects sign-in HTML, redirects and failed upstreams',async()=>{
  for(const upstream of [
    Response.json({record:{...production,publicationStatus:'draft'}}),
    new Response('<!DOCTYPE html><html>Sign in</html>',{headers:{'Content-Type':'text/html'}}),
    new Response(null,{status:302,headers:{location:'https://login.test'}}),
    new Response(null,{status:500}),
  ]){
    const response=await publicBackend(new Request('https://front.test/api/productions/2026-test'),'secret',async()=>upstream);
    assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/Sign in|secret/);
  }
  const hidden=await publicBackend(new Request('https://front.test/api/productions/draft'),'secret',async()=>new Response(null,{status:404}));
  assert.equal(hidden.status,404);
});

test('proxy serves uploaded files using the same protected backend',async()=>{
  const response=await publicBackend(new Request('https://front.test/api/backend-media/abcdef-123.pdf'),'secret',async(url)=>{
    assert.equal(url,SITES_BACKEND+'/media/abcdef-123.pdf');
    return new Response('%PDF-example',{headers:{'Content-Type':'application/pdf'}});
  });
  assert.equal(response.headers.get('content-type'),'application/pdf');
  assert.equal(await response.text(),'%PDF-example');
});
