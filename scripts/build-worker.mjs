import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import ts from 'typescript';

// Bundle the Next.js client output into the ESM Worker; deploy one Worker artifact.
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const assets={};
function walk(directory,prefix='') {
  for(const name of readdirSync(directory)) {
    const file=join(directory,name),path=prefix+'/'+name;
    if(statSync(file).isDirectory())walk(file,path);
    else assets[path]={body:readFileSync(file).toString('base64'),type:types[extname(name)]||'application/octet-stream'};
  }
}
walk('out');
const model=ts.transpileModule(readFileSync('lib/productions.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/^export /gm,'');
const api=readFileSync('worker/api.js','utf8').replace(/^import .*?;\n/,'').replace('export async function handleApi','async function handleApi');
const handler=`
const assets=${JSON.stringify(assets)};
export default { async fetch(request,env) {
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/'))return handleApi(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 let path=url.pathname;
 if(path==='/'||path.endsWith('/'))path+='index.html';
 else if(!assets[path]&&assets[path+'/index.html'])return Response.redirect(url.origin+path+'/'+url.search,308);
 const asset=assets[path]||assets['/404.html'];
 if(!asset)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{status:assets[path]?200:404,headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'no-cache'}});
}};
`;
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
writeFileSync('dist/server/index.js',model+'\n'+api+'\n'+handler);
writeFileSync('dist/.openai/hosting.json',readFileSync('.openai/hosting.json'));
console.log(`Built dynamic Worker with ${Object.keys(assets).length} Next.js assets and DB/BUCKET bindings.`);
