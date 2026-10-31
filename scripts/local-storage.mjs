import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createLocalStorage(directory) {
  mkdirSync(directory,{recursive:true});
  const sqlite = new DatabaseSync(join(directory,'productions.sqlite'));
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
  for (const entry of journal.entries) {
    if (!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(entry.tag)) {
      sqlite.exec('BEGIN');
      try {
        sqlite.exec(readFileSync(`drizzle/${entry.tag}.sql`,'utf8'));
        sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(entry.tag);
        sqlite.exec('COMMIT');
      } catch(error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  }
  const DB = { prepare(sql) {
    const statement=sqlite.prepare(sql);
    const wrap = bindings => ({
      bind: (...args) => wrap(args),
      first: async () => statement.get(...bindings) || null,
      all: async () => ({results:statement.all(...bindings)}),
      run: async () => ({meta:{changes:Number(statement.run(...bindings).changes)}}),
    });
    return wrap([]);
  }};
  const files=join(directory,'media');mkdirSync(files,{recursive:true});
  const BUCKET = {
    async put(key,data,options) {writeFileSync(join(files,key),Buffer.from(data));writeFileSync(join(files,key+'.json'),JSON.stringify(options.httpMetadata));},
    async get(key) {
      if(!existsSync(join(files,key)))return null;
      const body=readFileSync(join(files,key));const metadata=JSON.parse(readFileSync(join(files,key+'.json'),'utf8'));
      return {body,httpEtag:'"'+key+'"',writeHttpMetadata(headers){headers.set('Content-Type',metadata.contentType);}};
    },
  };
  return {DB,BUCKET,close:()=>sqlite.close()};
}
