import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Resolve the server module's real dependencies while running TypeScript in Node.
const source = readFileSync(new URL('../lib/archive-server.ts', import.meta.url), 'utf8')
  .replace("'./productions'", JSON.stringify(new URL('../lib/productions.ts', import.meta.url).href))
  .replace("'./sites-proxy'", JSON.stringify(new URL('../lib/sites-proxy.ts', import.meta.url).href));
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { publishedArchive } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const record = { production: { id: '2026-test', title: '测试剧目', year: '2026', poster: '/assets/poster.png', cast: [{ role: '角色', name: '演员' }] }, publicationStatus: 'published', version: 2, updatedAt: '2026-11-01' };

test('archive first render receives live published card data with short revalidation', async () => {
  const records = await publishedArchive('server-secret', async (url, options) => {
    assert.match(url, /\/api\/productions$/);
    assert.equal(options.headers['OAI-Sites-Authorization'], 'Bearer server-secret');
    assert.equal(options.next.revalidate, 30);
    assert.equal(options.cache, 'force-cache');
    assert.equal(options.redirect, 'manual');
    return Response.json({ records: [record] });
  });
  assert.equal(records[0].production.title, record.production.title);
  assert.equal(records[0].production.poster, record.production.poster);
  assert.equal(records[0].production.cast, undefined);
  assert.doesNotMatch(JSON.stringify(records), /server-secret/);
  assert.deepEqual(await publishedArchive('secret', async () => Response.json({ records: [] })), []);
});

test('drafts, invalid data and failed upstreams never seed the public archive', async () => {
  for (const response of [
    Response.json({ records: [{ ...record, publicationStatus: 'draft' }] }),
    Response.json({ records: [record, { ...record, production: { id: '../private', title: 'Invalid' } }] }),
    Response.json({ error: 'Denied' }, { status: 403 }),
    new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response(null, { status: 302, headers: { Location: 'https://login.test' } }),
    new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
  ]) assert.equal(await publishedArchive('secret', async () => response), null);
  assert.equal(await publishedArchive(undefined, () => { throw new Error('Must not fetch'); }), null);
  assert.equal(await publishedArchive('secret', async () => { throw new Error('Offline'); }), null);
});
