import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { createLocalStorage } from './local-storage.mjs';
import { isProduction } from '../lib/productions.ts';

// An explicit local-only import; never runs automatically at startup or deployment.
const source=existsSync('data/curated-archive.json')?'data/curated-archive.json':'public/data/curated-archive.json';
const data=JSON.parse(readFileSync(source,'utf8'));
if(!data.productions.every(isProduction))throw new Error('Invalid archive data');
const statuses=data.publicationStatusById||{};
if(Object.values(statuses).some(status=>!['draft','published'].includes(status)))throw new Error('Invalid publication status');
const baselinePath='.local-data/archive-original.json';
const baseline=existsSync(baselinePath)?JSON.parse(readFileSync(baselinePath,'utf8')).productions:[];
const original=new Map(baseline.map(p=>[p.id,p]));
const storage=createLocalStorage('.local-data');
let imported=0,updated=0,preserved=0,unchanged=0;
let transaction=false;
try {
  mkdirSync('.local-data/import-backups',{recursive:true});
  const backup=`.local-data/import-backups/before-archive-${Date.now()}.sqlite`;
  await storage.DB.prepare('VACUUM INTO ?').bind(backup).run();
  await storage.DB.prepare('CREATE TABLE IF NOT EXISTS local_archive_imports (id TEXT PRIMARY KEY, data TEXT NOT NULL, publication_status TEXT NOT NULL)').run();
  await storage.DB.prepare('BEGIN IMMEDIATE').run();transaction=true;
  for(const production of data.productions){
    const now=new Date().toISOString();
    const status=statuses[production.id]||'published';
    const current=await storage.DB.prepare('SELECT * FROM productions WHERE id = ?').bind(production.id).first();
    const previous=await storage.DB.prepare('SELECT * FROM local_archive_imports WHERE id = ?').bind(production.id).first();
    if(current){
      const currentData=JSON.parse(current.data);
      if(isDeepStrictEqual(currentData,production)&&current.publication_status===status){unchanged++;}
      else {
        // Replace only an untouched earlier import; preserve edits from the admin UI.
        const previousData=previous?JSON.parse(previous.data):original.get(production.id);
        const previousStatus=previous?.publication_status||'published';
        if(!previousData||current.publication_status!==previousStatus){
          console.log(`Preserved locally edited record: ${production.id}`);preserved++;continue;
        }
        const merged={...production};
        const kept=[];
        for(const key of new Set([...Object.keys(previousData),...Object.keys(currentData)])){
          if(!isDeepStrictEqual(currentData[key],previousData[key])){
            if(Object.hasOwn(currentData,key))merged[key]=currentData[key];else delete merged[key];
            kept.push(key);
          }
        }
        if(kept.length)console.log(`Preserved edited fields for ${production.id}: ${kept.join(', ')}`);
        if(isDeepStrictEqual(currentData,merged)&&current.publication_status===status){unchanged++;}
        else {
          await storage.DB.prepare('UPDATE productions SET title = ?, data = ?, publication_status = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?')
            .bind(merged.title,JSON.stringify(merged),status,now,production.id,current.version).run();
          updated++;
        }
      }
    } else {
      await storage.DB.prepare('INSERT INTO productions (id,title,data,publication_status,version,created_at,updated_at) VALUES (?,?,?,?,1,?,?)')
        .bind(production.id,production.title,JSON.stringify(production),status,now,now).run();imported++;
    }
    await storage.DB.prepare('INSERT INTO local_archive_imports (id,data,publication_status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,publication_status=excluded.publication_status')
      .bind(production.id,JSON.stringify(production),status).run();
  }
  await storage.DB.prepare('COMMIT').run();transaction=false;
  console.log(JSON.stringify({imported,updated,preserved,unchanged,backup}));
}catch(error){
  if(transaction)await storage.DB.prepare('ROLLBACK').run();
  throw error;
}finally{storage.close();}
