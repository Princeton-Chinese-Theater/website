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
  assert.deepEqual(Object.fromEntries(options.headers),{'oai-sites-authorization':'Bearer server-secret',accept:'application/json'});
  assert.equal(options.redirect,'manual');assert.equal(options.cache,'no-store');
});

test('proxy rejects writes, admin queries, unknown paths and missing configuration before contacting backend',async()=>{
  const noFetch=()=>{throw new Error('Unexpected upstream call');};
  for(const [path,method,token,status] of [
    ['/api/productions','POST','secret',401],
    ['/api/productions?scope=all','GET','secret',401],
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
  const hidden=await publicBackend(new Request('https://front.test/api/productions/draft'),'secret',async()=>Response.json({error:'不存在'},{status:404}));
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

test('authenticated proxy forwards only its own session and keeps same-origin writes and Set-Cookie intact',async()=>{
 const cookie='__Host-pct_admin='+'a'.repeat(64);
 const response=await publicBackend(new Request('https://front.test/api/auth/login/',{
  method:'POST',headers:{Origin:'https://front.test','Content-Type':'application/json',Cookie:cookie+'; unrelated=private','oai-authenticated-user-email':'owner@example.com'},
  body:JSON.stringify({email:'admin@example.com',password:'A long password'}),
 }),'server-secret',async(url,options)=>{
  assert.equal(url,SITES_BACKEND+'/api/auth/login');
  assert.equal(options.headers.get('Origin'),SITES_BACKEND);
  assert.equal(options.headers.get('Cookie'),cookie);
  assert.equal(options.headers.get('oai-authenticated-user-email'),null);
  assert.equal(JSON.parse(new TextDecoder().decode(options.body)).email,'admin@example.com');
  return Response.json({email:'admin@example.com'},{headers:{'Set-Cookie':cookie+'; Path=/; HttpOnly; Secure; SameSite=Strict'}});
 });
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly/);
 const denied=await publicBackend(new Request('https://front.test/api/auth/login',{
  method:'POST',headers:{Origin:'https://attacker.test'},body:'{}',
 }),'secret',()=>{throw new Error('Unexpected call');});
 assert.equal(denied.status,403);
 const bootstrap=await publicBackend(new Request('https://front.test/api/auth/bootstrap',{method:'POST',body:'{}'}),'secret',()=>{throw new Error('Unexpected call');});
 assert.equal(bootstrap.status,404);
});

test('only session-bearing requests may ask backend for drafts; backend errors retain their HTTP status',async()=>{
 const request=new Request('https://front.test/api/productions/?scope=all&ignored=1',{headers:{Cookie:'__Host-pct_admin='+'a'.repeat(64)}});
 const response=await publicBackend(request,'secret',async(url)=>{
  assert.equal(url,SITES_BACKEND+'/api/productions?scope=all');
  return Response.json({records:[{...production,publicationStatus:'draft'}]});
 });
 assert.equal(response.status,200);assert.equal((await response.json()).records[0].publicationStatus,'draft');
 const invalidSession=await publicBackend(request,'secret',async()=>Response.json({error:'请先登录'},{status:401}));
 assert.equal(invalidSession.status,401);
 const badLogin=await publicBackend(new Request('https://front.test/api/auth/login',{method:'POST',body:'{}'}),'secret',async()=>Response.json({error:'邮箱或密码不正确'},{status:401}));
 assert.equal(badLogin.status,401);assert.deepEqual(await badLogin.json(),{error:'邮箱或密码不正确'});
});

test('Vercel proxy and Worker complete login, invite activation and revocation against the same database',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {storage,rootSession,PASSWORD,ROOT_EMAIL}=await import('./auth-fixture.mjs');const {handleApi}=await import('../worker/api.js');
 const folder=mkdtempSync(join(tmpdir(),'pct-proxy-auth-')),env=storage(folder);
 const forward=(path,{method='GET',body,cookie=''}={})=>publicBackend(new Request('https://front.test'+path,{
  method,headers:{Origin:'https://front.test','Content-Type':'application/json',...cookie?{Cookie:cookie}:{}},...body?{body:JSON.stringify(body)}:{},
 }),'service-token',async(url,options)=>handleApi(new Request(url,options),env));
 try{
  await rootSession(env);
  const login=await forward('/api/auth/login/',{method:'POST',body:{email:ROOT_EMAIL,password:PASSWORD}});assert.equal(login.status,200);
  const root=(login.headers.get('set-cookie')||'').split(';')[0];
  const session=await (await forward('/api/session/',{cookie:root})).json();assert.equal(session.canEdit,true);assert.equal(session.maxUploadBytes,4*1024*1024);
  const invitation=await (await forward('/api/admins/invite/',{method:'POST',cookie:root,body:{email:'new-admin@example.com'}})).json();
  const activation=await forward('/api/auth/activate/',{method:'POST',body:{token:invitation.invitationToken,password:PASSWORD}});assert.equal(activation.status,200);
  const other=(activation.headers.get('set-cookie')||'').split(';')[0];
  assert.equal((await forward('/api/admins/',{cookie:other})).status,200);
  const revoke=await forward('/api/admins/revoke/',{method:'POST',cookie:root,body:{email:'new-admin@example.com'}});assert.equal(revoke.status,200);
  assert.equal((await forward('/api/productions/?scope=all',{cookie:other})).status,401);
 }finally{env.close();rmSync(folder,{recursive:true,force:true});}
});
