import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoWorks } from '../catalog.js';
import { siteConfig } from '../site-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listFiles(directory, relative = '') {
  const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(directory, name));
    else files.push(name);
  }
  return files;
}

test('la preparación de Cloudflare copia únicamente los archivos previstos', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'monzu-cloudflare-test-'));
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'tools', 'prepare-cloudflare.mjs'), temporary], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const builds = await readdir(temporary);
    assert.equal(builds.length, 1);
    const build = path.join(temporary, builds[0]);
    const config = JSON.parse(await readFile(path.join(build, 'wrangler.jsonc'), 'utf8'));
    assert.equal(config.assets.directory, './public');
    const files = await listFiles(path.join(build, 'public'));
    const demoCount = siteConfig.catalogSource === 'demo'
      ? demoWorks.reduce((count, work) => count + work.images.length, 0) : 0;
    assert.equal(files.length, 17 + demoCount);
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('obra.html'));
    assert.ok(files.includes('obra.js'));
    assert.ok(files.includes('gallery-navigation.js'));
    assert.ok(files.includes(path.join('administracion', 'admin.html')));
    assert.ok(files.includes(path.join('Supabase Connection', 'supabaseClient.js')));
    assert.equal(files.filter((file) => file.startsWith(`assets${path.sep}demo${path.sep}`)).length, demoCount);
    assert.ok(files.every((file) => !file.startsWith('Instalaciones')));
    assert.ok(!files.includes('DOCUMENTACION.md'));
    assert.ok(!files.includes(path.join('Supabase Connection', 'schema.sql')));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
