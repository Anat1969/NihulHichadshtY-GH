#!/usr/bin/env node
// Visual smoke test: serves the production build, mocks Supabase with fictional
// fixtures, and screenshots key routes in light + dark mode.
// Usage: npm run build && node scripts/screenshot.mjs [outDir]
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as fx from './fixtures/mock-data.mjs';

// Resolve playwright from node_modules, falling back to the global install.
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(`${globalRoot}/playwright`);
  }
}
const { chromium } = loadPlaywright();

const OUT = process.argv[2] || 'screenshots';
const PORT = 4179;
const ROUTES = [
  ['dashboard', '/'],
  ['command-center', '/command-center'],
  ['project', '/project/demo-2'],
];
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', d => String(d).includes(String(PORT)) && res());
  server.on('exit', c => rej(new Error(`preview exited ${c}`)));
  setTimeout(() => rej(new Error('preview timeout')), 30000);
});

const errors = [];
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    for (const [name, path] of ROUTES) {
      for (const [vw, vh, tag] of [[1440, 1000, 'desktop'], [390, 844, 'mobile']]) {
        const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, locale: 'he-IL' });
        await ctx.addInitScript(t => localStorage.setItem('nihul-theme', t), theme);
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${name}/${theme}/${tag}: ${e.message}`));
        // Block third-party hosts (fonts, analytics) so runs are offline-safe.
        await page.route(url => !/127\.0\.0\.1|supabase\.co/.test(url.host), r => r.abort());
        await page.route(/supabase\.co\//, route => {
          const url = new URL(route.request().url());
          const table = url.pathname.split('/rest/v1/')[1];
          let body = (table && fx[table]) || [];
          const id = url.searchParams.get('id');
          if (id?.startsWith('eq.')) body = body.filter(r => r.id === id.slice(3));
          const pid = url.searchParams.get('project_id');
          if (pid?.startsWith('eq.')) body = body.filter(r => r.project_id === pid.slice(3));
          const single = (route.request().headers()['accept'] || '').includes('vnd.pgrst.object');
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? body[0] ?? null : body) });
        });
        await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${OUT}/${name}-${theme}-${tag}.png`, fullPage: tag === 'desktop' });
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) {
  console.error('Page errors:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`Screenshots written to ${OUT}/`);
process.exit(0);
