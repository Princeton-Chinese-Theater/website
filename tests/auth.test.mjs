import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call, storage, rootSession, cookieOf, PASSWORD, ROOT_EMAIL } from './auth-fixture.mjs';
const fixture=()=>{const folder=mkdtempSync(join(tmpdir(),'pct-auth-'));const env=storage(folder);return{env,close:()=>{env.close();rmSync(folder,{recursive:true,force:true});}};};
const post=(env,path,body,cookie='',headers={})=>call(env,path,{method:'POST',body,cookie,headers});

test('initial setup requires a temporary secret, binds Outlook and cannot be repeated or impersonated',async()=>{
 const f=fixture(),{env}=f;
 try{
  assert.equal((await post(env,'/api/auth/bootstrap',{},'',{'x-bootstrap-token':'wrong'})).status,403);
  const bootstrap=await post(env,'/api/auth/bootstrap',{},'',{'x-bootstrap-token':env.ADMIN_BOOTSTRAP_TOKEN});
  assert.equal(bootstrap.status,201);const invitation=await bootstrap.json();assert.equal(invitation.email,ROOT_EMAIL);
  assert.equal((await post(env,'/api/auth/bootstrap',{},'',{'x-bootstrap-token':env.ADMIN_BOOTSTRAP_TOKEN})).status,409);
  const info=await post(env,'/api/auth/invitation',{token:invitation.invitationToken});assert.equal((await info.json()).email,ROOT_EMAIL);
  assert.equal((await post(env,'/api/auth/activate',{token:invitation.invitationToken,password:'short'})).status,400);
  const activation=await post(env,'/api/auth/activate',{token:invitation.invitationToken,password:PASSWORD});
  assert.equal(activation.status,200);
  const setCookie=activation.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Strict/);assert.match(setCookie,/Max-Age=28800/);assert.doesNotMatch(setCookie,/Domain=/);
  assert.equal((await post(env,'/api/auth/activate',{token:invitation.invitationToken,password:PASSWORD})).status,400);
  const account=await env.DB.prepare('SELECT * FROM admin_accounts WHERE email = ?').bind(ROOT_EMAIL).first();
  assert.notEqual(account.password_hash,PASSWORD);assert.match(account.password_hash,/^[a-f0-9]{64}:[a-f0-9]{64}$/);assert.equal(account.invitation_hash,null);
  const session=await env.DB.prepare('SELECT * FROM admin_sessions LIMIT 1').first();assert.notEqual(session.token_hash,cookieOf(activation).split('=')[1]);
  const spoof=await call(env,'/api/session',{headers:{'oai-authenticated-user-id':'previous-owner','oai-authenticated-user-email':ROOT_EMAIL}});
  assert.equal((await spoof.json()).canEdit,false);
 }finally{f.close();}
});

test('login, expiry, logout and cross-site protection enforce server-side sessions',async()=>{
 const f=fixture(),{env}=f;
 try{
  const original=await rootSession(env);
  const bad=await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:'incorrect password'});assert.equal(bad.status,401);
  const missing=await post(env,'/api/auth/login',{email:'missing@example.com',password:'incorrect password'});assert.equal(missing.status,401);assert.deepEqual(await missing.json(),await bad.json());
  assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:PASSWORD},'',{Origin:'https://attacker.test'})).status,403);
  const login=await post(env,'/api/auth/login',{email:ROOT_EMAIL.toUpperCase(),password:PASSWORD});assert.equal(login.status,200);const cookie=cookieOf(login);assert.notEqual(cookie,original);
  assert.equal((await (await call(env,'/api/session',{cookie})).json()).email,ROOT_EMAIL);
  assert.equal((await post(env,'/api/auth/logout',{},cookie,{'sec-fetch-site':'cross-site'})).status,403);
  const logout=await post(env,'/api/auth/logout',{},cookie);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await call(env,'/api/admins',{cookie})).status,401);
  await env.DB.prepare('UPDATE admin_sessions SET expires_at = 0').run();
  assert.equal((await (await call(env,'/api/session',{cookie:original})).json()).authenticated,false);
 }finally{f.close();}
});

test('every active admin may invite; invitations expire and revocation invalidates sessions and links',async()=>{
 const f=fixture(),{env}=f;
 try{
  const root=await rootSession(env);
  assert.equal((await post(env,'/api/admins/invite',{email:'second@example.com'})).status,401);
  const invited=await post(env,'/api/admins/invite',{email:'SECOND@example.com'},root);assert.equal(invited.status,201);const invitation=await invited.json();
  const activated=await post(env,'/api/auth/activate',{token:invitation.invitationToken,password:PASSWORD});const second=cookieOf(activated);assert.equal(activated.status,200);
  assert.equal((await post(env,'/api/admins/invite',{email:'second@example.com'},root)).status,409);
  const third=await (await post(env,'/api/admins/invite',{email:'third@example.com'},second)).json();
  assert.equal((await post(env,'/api/admins/revoke',{email:ROOT_EMAIL},root)).status,400);
  assert.equal((await post(env,'/api/admins/revoke',{email:'second@example.com'},root)).status,200);
  assert.equal((await call(env,'/api/admins',{cookie:second})).status,401);
  assert.equal((await post(env,'/api/productions',{production:{id:'forbidden',title:'Denied'},publicationStatus:'published'},second)).status,401);
  assert.equal((await post(env,'/api/auth/login',{email:'second@example.com',password:PASSWORD})).status,401);
  const nextThird=await (await post(env,'/api/admins/invite',{email:'third@example.com'},root)).json();
  assert.equal((await post(env,'/api/auth/activate',{token:third.invitationToken,password:PASSWORD})).status,400);
  await env.DB.prepare('UPDATE admin_accounts SET invitation_expires_at = 0 WHERE email = ?').bind('third@example.com').run();
  assert.equal((await post(env,'/api/auth/activate',{token:nextThird.invitationToken,password:PASSWORD})).status,400);
  const reissued=await (await post(env,'/api/admins/invite',{email:'second@example.com'},root)).json();
  assert.equal((await post(env,'/api/auth/activate',{token:reissued.invitationToken,password:PASSWORD})).status,200);
  const list=await (await call(env,'/api/admins',{cookie:root})).json();
  assert.ok(list.admins.every(row=>!('password_hash' in row)&&!('invitation_hash' in row)));
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_accounts WHERE status = 'active'").first()).count,2);
 }finally{f.close();}
});

test('password changes invalidate other sessions and never accept the old password again',async()=>{
 const f=fixture(),{env}=f;
 try{
  const first=await rootSession(env), second=cookieOf(await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:PASSWORD}));
  const oldSession=await env.DB.prepare('SELECT * FROM admin_sessions LIMIT 1').first();
  assert.equal((await post(env,'/api/auth/password',{currentPassword:'wrong',password:'A new long password for tests'},first)).status,400);
  const changed=await post(env,'/api/auth/password',{currentPassword:PASSWORD,password:'A new long password for tests'},first);assert.equal(changed.status,200);
  assert.equal((await call(env,'/api/admins',{cookie:first})).status,401);assert.equal((await call(env,'/api/admins',{cookie:second})).status,401);
  await env.DB.prepare('INSERT INTO admin_sessions (token_hash,email,created_at,expires_at,account_version) VALUES (?,?,?,?,?)').bind(oldSession.token_hash,oldSession.email,oldSession.created_at,oldSession.expires_at,oldSession.account_version).run();
  assert.equal((await call(env,'/api/admins',{cookie:first})).status,401);
  assert.equal((await call(env,'/api/admins',{cookie:cookieOf(changed)})).status,200);
  assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:PASSWORD})).status,401);
  assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:'A new long password for tests'})).status,200);
 }finally{f.close();}
});

test('repeated password guessing is rate limited and missing runtime secret fails closed',async()=>{
 const f=fixture(),{env}=f;
 try{
  await rootSession(env);
  for(let i=0;i<10;i++)assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:'wrong password'})).status,401);
  assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:PASSWORD})).status,429);
  await env.DB.prepare('UPDATE auth_rate_limits SET started_at = 0').run();
  delete env.AUTH_PASSWORD_PEPPER;
  assert.equal((await post(env,'/api/auth/login',{email:ROOT_EMAIL,password:PASSWORD})).status,503);
 }finally{f.close();}
});
