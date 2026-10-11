import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { expect, it } from 'vitest';

it('loads the compiled Vercel function in Node without a bundler', () => {
  const directory = mkdtempSync(join(tmpdir(), 'portfolio-vercel-'));
  try {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    for (const file of ['api/now-playing', 'server/now-playing', 'server/spotify']) {
      const destination = join(directory, `${file}.js`);
      mkdirSync(join(directory, file.split('/')[0]), { recursive: true });
      const { outputText } = transpileModule(readFileSync(`${file}.ts`, 'utf8'), {
        compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
      });
      writeFileSync(destination, outputText);
    }
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import api from './api/now-playing.js';
      const response = await api.fetch(new Request('https://example.com/api/now-playing'));
      console.log(JSON.stringify({ status: response.status, body: await response.json() }));
    `], {
      cwd: directory,
      env: { ...process.env, SPOTIFY_CLIENT_ID: '', SPOTIFY_CLIENT_SECRET: '', SPOTIFY_REFRESH_TOKEN: '' },
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 200, body: { status: 'unconfigured' } });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
