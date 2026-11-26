// 네이버·Bing 등에 sitemap.xml 의 모든 주소 수집 요청 (IndexNow)
//   배포가 끝난 뒤:  node scripts/indexnow.mjs            (전체)
//                    node scripts/indexnow.mjs /symbol/heart /tools/font   (일부만)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../data/site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const urlList = args.length
  ? args.map((p) => site.origin + p)
  : [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const body = JSON.stringify({ host: new URL(site.origin).host, key: site.indexNowKey, keyLocation: `${site.origin}/${site.indexNowKey}.txt`, urlList });

for (const endpoint of ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow']) {
  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    console.log(`${endpoint} → ${r.status} ${r.statusText} (${urlList.length}개)`, (await r.text()).slice(0, 200));
  } catch (e) {
    console.log(`${endpoint} → 실패: ${e.message}`);
  }
}
