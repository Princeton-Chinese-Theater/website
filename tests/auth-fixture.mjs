import { handleApi } from '../worker/api.js';
import { createLocalStorage } from '../scripts/local-storage.mjs';
export const ROOT_EMAIL='luoxi813@outlook.com';
export const PASSWORD='A long administrator password 2026!';
export const cookieOf=response=>(response.headers.get('set-cookie')||'').split(';')[0];
export function storage(folder){return Object.assign(createLocalStorage(folder),{AUTH_PASSWORD_PEPPER:'pepper-'.repeat(12),ADMIN_BOOTSTRAP_TOKEN:'bootstrap-'.repeat(8)});}
export function call(env,path,{method='GET',body,cookie='',headers={}}={}){
  return handleApi(new Request('https://site.test'+path,{method,headers:{'Content-Type':'application/json',...cookie?{Cookie:cookie}:{},...headers},...body!==undefined?{body:JSON.stringify(body)}:{}}),env);
}
export async function rootSession(env){
  const boot=await call(env,'/api/auth/bootstrap',{method:'POST',headers:{'x-bootstrap-token':env.ADMIN_BOOTSTRAP_TOKEN}});
  if(boot.status!==201)throw new Error('Cannot bootstrap test administrator');
  const invite=await boot.json();
  const response=await call(env,'/api/auth/activate',{method:'POST',body:{token:invite.invitationToken,password:PASSWORD}});
  if(response.status!==200)throw new Error('Cannot activate test administrator');
  return cookieOf(response);
}
