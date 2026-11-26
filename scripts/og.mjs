// 페이지별 공유 이미지(1200x630) 생성 — Playwright 필요 (개발용, 배포에는 영향 없음)
//   node scripts/og.mjs && node scripts/build.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { home, sections, pages } from '../data/site.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
mkdirSync(join(ROOT, 'img/og'), { recursive: true });

const html = (icon, title, sub) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:22px;
background:radial-gradient(circle at 15% 20%,#ffe3f0 0,transparent 45%),radial-gradient(circle at 85% 80%,#e9e1ff 0,transparent 45%),#fff6fa;
font-family:"Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR",sans-serif;color:#3e385e;text-align:center}
.i{font-size:120px;line-height:1.1;color:#c2477f;max-width:1050px;white-space:nowrap;overflow:hidden}
.t{font-size:68px;font-weight:800;letter-spacing:-.02em;max-width:1080px;line-height:1.2}
.s{font-size:34px;color:#7a6f8f}
.b{position:absolute;bottom:38px;font-size:32px;font-weight:800;color:#3e385e;background:#f6d3e4;padding:10px 26px;border-radius:999px}
</style></head><body><div class="i">${esc(icon)}</div><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div><div class="b">nanaticon•⩊• 나나티콘</div></body></html>`;

const jobs = [['home', '(ෆ˙ᵕ˙ෆ) ♡ ✧', home.h1, '누르면 바로 복사되는 특수문자 모음']];
for (const s of sections) jobs.push([s.key, s.icon, s.h1, s.lead]);
for (const [k, p] of Object.entries(pages)) jobs.push([k, p.icon, p.h1.replace(/\s*[^\s가-힣A-Za-z0-9·]+$/, ''), '클릭 한 번에 복사 · 나나티콘']);

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const [id, icon, title, sub] of jobs) {
  await page.setContent(html(icon, title, sub));
  await page.screenshot({ path: join(ROOT, `img/og/${id}.jpg`), type: 'jpeg', quality: 82 });
}
await b.close();
console.log(`og images: ${jobs.length}`);
