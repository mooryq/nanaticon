// 나나티콘 정적 사이트 생성기 (의존성 없음)
//   node scripts/build.mjs
// data/site.mjs + data/emoticons/*.txt → index.html, sub/*.html, sitemap.xml, rss.xml, assets/search.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, navGroups, quickNav, pages } from '../data/site.mjs';
import { convertAll } from '../assets/fonts.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);
const VERSION = Date.now().toString(36);

// ── 유틸 ─────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => site.origin + p;
const fileOf = (key) => pages[key].file || pages[key].path.replace(/^\//, '');
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// ── 데이터 파싱 ──────────────────────────────────────
// 형식: "## 제목 {#id}" 로 묶음 시작, 한 줄에 하나씩.
//   @range 2460-2473  → 유니코드 범위를 한 글자씩 펼침
//   \u{3164}, \n      → 이스케이프 (공백문자·여러 줄 템플릿)
//   텍스트 »» 설명     → 화면에는 설명을, 복사는 텍스트를
function decode(s) {
  return s.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\n/g, '\n');
}
function parseData(name) {
  const groups = [];
  let g = null;
  for (const raw of readFileSync(join(ROOT, 'data/emoticons', name + '.txt'), 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    const h = line.match(/^##\s+(.*?)(?:\s*\{#([\w-]+)\})?\s*$/);
    if (h) { g = { title: h[1], id: h[2] || `g${groups.length + 1}`, items: [] }; groups.push(g); continue; }
    if (!g) { g = { title: '', id: 'g1', items: [] }; groups.push(g); }
    const r = line.match(/^@range\s+([0-9A-Fa-f]+)-([0-9A-Fa-f]+)\s*$/);
    if (r) { for (let c = parseInt(r[1], 16); c <= parseInt(r[2], 16); c++) g.items.push({ t: String.fromCodePoint(c) }); continue; }
    const [text, label] = line.split(' »» ');
    const t = decode(text.trim() === '' ? text : text.trim());
    g.items.push(label ? { t, l: label.trim() } : { t });
  }
  return groups;
}
const dataCache = {};
const dataOf = (key) => (dataCache[key] ??= parseData(pages[key].data));
const countOf = (key) => (pages[key].type === 'list' ? dataOf(key).reduce((n, g) => n + g.items.length, 0) : 0);

// ── 조각 ─────────────────────────────────────────────
function itemBtn(it) {
  const blank = !it.t.trim();
  const multi = it.t.includes('\n');
  if (it.l) {
    return `<button class="e e-label${blank ? ' e-blank' : ''}" data-c="${esc(it.t)}"><span class="e-l">${esc(it.l)}</span></button>`;
  }
  if (multi) return `<button class="e e-multi" data-c="${esc(it.t)}">${esc(it.t).replace(/\n/g, '<br>')}</button>`;
  return `<button class="e">${esc(it.t)}</button>`;
}
const grid = (items) => `<div class="grid">${items.map(itemBtn).join('')}</div>`;

function adSlot(pos) {
  const c = site.coupang;
  if (!c.enabled || !c[pos]) return '';
  return `<aside class="ad ad-${pos}" aria-label="광고"><div class="ad-body">${c[pos]}</div><p class="ad-note">${esc(c.disclosure)}</p></aside>`;
}

function header(key) {
  const chips = quickNav.map((k) => `<a href="${pages[k].path}"${k === key ? ' class="on" aria-current="page"' : ''}><span class="ci" aria-hidden="true">${esc(pages[k].icon)}</span>${esc(pages[k].short || pages[k].nav)}</a>`).join('')
    + `<button type="button" class="chip-all menu-toggle" aria-controls="drawer">전체 메뉴 ›</button>`;
  const drawer = navGroups.map((g) => `<div class="dg"><p class="dg-t">${esc(g.title)}</p>${g.items.map((k) => `<a href="${pages[k].path}"${k === key ? ' aria-current="page"' : ''}><span class="dg-i" aria-hidden="true">${esc(pages[k].icon)}</span><span class="dg-n">${esc(pages[k].nav)}</span>${countOf(k) ? `<span class="dg-c">${countOf(k)}</span>` : ''}</a>`).join('')}</div>`).join('');
  return `<header class="hd">
  <div class="hd-top">
    <a class="logo" href="/" aria-label="${site.name} 홈">${esc(site.logo)}</a>
    <button class="search-open" type="button" aria-label="이모티콘 검색"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg> 하트, 고양이, 리본 검색</button>
    <button class="menu-open menu-toggle" type="button" aria-expanded="false" aria-controls="drawer"><span aria-hidden="true">☰</span> 메뉴</button>
  </div>
  <nav class="chips" aria-label="바로가기">${chips}</nav>
</header>
<nav id="drawer" class="drawer" aria-label="전체 메뉴" hidden><div class="drawer-in"><div class="drawer-hd"><b>전체 메뉴</b><button class="menu-close" type="button" aria-label="닫기">✕</button></div><button type="button" class="search-open drawer-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg> 이모티콘 검색</button>${drawer}</div></nav>`;
}

function footer() {
  const cols = navGroups.map((g) => `<div><p class="ft-t">${esc(g.title)}</p>${g.items.map((k) => `<a href="${pages[k].path}">${esc(pages[k].nav)}</a>`).join('')}</div>`).join('');
  return `<footer class="ft">
  <div class="ft-cols">${cols}</div>
  <p class="ft-copy">${site.name} (${site.nameEn}) · 귀여운 특수문자 이모티콘을 클릭 한 번에 복사하세요.${site.coupang.enabled ? `<br>${esc(site.coupang.disclosure)}` : ''}</p>
</footer>`;
}

function related(key) {
  const g = navGroups.find((g) => g.items.includes(key));
  const keys = [...(g ? g.items : []), 'font', 'nickname', 'heart', 'home'].filter((k, i, arr) => k !== key && arr.indexOf(k) === i).slice(0, 8);
  return `<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">함께 보면 좋은 페이지</h2><div class="cards">${keys.map(card).join('')}</div></section>`;
}
function card(k) {
  const p = pages[k];
  const n = countOf(k);
  return `<a class="card" href="${p.path}"><span class="card-i" aria-hidden="true">${esc(p.icon)}</span><span class="card-t">${esc(p.nav)}</span>${n ? `<span class="card-n">${n}개</span>` : ''}</a>`;
}

function about(key) {
  const p = pages[key];
  const faq = p.faq.length ? `<h2>자주 묻는 질문</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}` : '';
  return `<section class="about" aria-labelledby="about-h">
  <h2 id="about-h">${esc(p.nav)} 소개</h2>
  <p>${esc(p.intro)}</p>
  <h2>사용 방법</h2>
  <ol><li>마음에 드는 ${p.type === 'font' ? '글씨체' : '특수문자'}를 누르면 바로 복사돼요.</li><li>카카오톡, 인스타그램, 트위터(X), 블로그 등 원하는 곳에 붙여넣기 하세요.</li><li>복사한 건 화면 아래 <b>♡ 보관함</b>에 자동 저장돼요. 하트를 눌러 즐겨찾기 하거나, <b>이어붙이기</b>로 여러 개를 조합할 수 있어요.</li></ol>
  ${faq}
</section>`;
}

function breadcrumb(key) {
  if (key === 'home') return '';
  return `<nav class="bc" aria-label="현재 위치"><a href="/">홈</a> <span aria-hidden="true">›</span> <span>${esc(pages[key].nav)}</span></nav>`;
}

const shortTitle = (t) => t.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*(이모티콘|특수문자|특수기호|이모지)$/, '').replace(/\s*·\s*/g, '·') || t;
function tocBar(links) {
  return `<div class="subnav"><nav class="toc" aria-label="이 페이지 목차">${links.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}</nav></div>`;
}
function groupNav(groups) {
  if (groups.length < 3) return '';
  return tocBar(groups.map((g) => [g.id, shortTitle(g.title)]));
}

function sections(groups) {
  return groups.map((g, i) => `<section class="grp" id="${g.id}" aria-labelledby="${g.id}-h">
  <h2 id="${g.id}-h">${esc(g.title)} <span class="cnt">${g.items.length}</span></h2>
  ${grid(g.items)}
</section>${i === 1 ? adSlot('middle') : ''}`).join('\n');
}

// ── 페이지 본문 ─────────────────────────────────────
function listBody(key) {
  const p = pages[key];
  const groups = dataOf(key);
  return `${breadcrumb(key)}
<div class="intro"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p></div>
${adSlot('top')}
${groupNav(groups)}
${sections(groups)}
${adSlot('bottom')}
${about(key)}
${related(key)}`;
}

function homeBody() {
  const p = pages.home;
  const groups = dataOf('home');
  const tools = ['font', 'nickname', 'bio'].map((k) => `<a class="tool" href="${pages[k].path}"><span class="tool-i" aria-hidden="true">${esc(pages[k].icon)}</span><span><b>${esc(pages[k].nav)}</b><small>${esc(pages[k].lead)}</small></span></a>`).join('');
  const cats = navGroups.flatMap((g) => g.items).filter((k) => !['home', 'font', 'nickname', 'bio'].includes(k));
  return `<div class="intro hero"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p>
<button class="search-open big" type="button"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg> 어떤 특수문자를 찾으세요? (예: 하트, 곰돌이, 리본)</button></div>
<section class="tools" aria-label="꾸미기 도구">${tools}</section>
${adSlot('top')}
<section class="cats" aria-labelledby="cats-h"><h2 id="cats-h">카테고리</h2><div class="cards">${cats.map(card).join('')}</div></section>
<h2 class="sec-title">감정별 표정 이모티콘</h2>
${groupNav(groups)}
${sections(groups)}
${adSlot('bottom')}
${about('home')}`;
}

function hubBody(key) {
  const p = pages[key];
  const cats = navGroups.flatMap((g) => g.items).filter((k) => pages[k].type === 'list' && k !== 'home');
  const blocks = cats.map((k, i) => {
    const sample = dataOf(k).flatMap((g) => g.items).filter((it) => !it.l && !it.t.includes('\n') && [...it.t].length <= 12).slice(0, 24);
    return `<section class="grp" id="${k}" aria-labelledby="${k}-h"><h2 id="${k}-h"><a href="${pages[k].path}">${esc(pages[k].nav)} <span aria-hidden="true">${esc(pages[k].icon)}</span></a> <span class="cnt">${countOf(k)}</span></h2>${grid(sample)}<a class="more" href="${pages[k].path}">${esc(pages[k].nav)} 전체 보기 →</a></section>${i === 1 ? adSlot('middle') : ''}`;
  }).join('\n');
  return `${breadcrumb(key)}
<div class="intro"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p></div>
${adSlot('top')}
${tocBar(cats.map((k) => [k, pages[k].short || pages[k].nav]))}
${blocks}
${adSlot('bottom')}
${about(key)}
${related(key)}`;
}

function fontBody(key) {
  const p = pages[key];
  const sample = 'nanaticon 0520';
  const rows = convertAll(sample).map((r) => `<div class="fr" data-id="${r.id}"><span class="fr-n">${esc(r.name)}${r.hangul ? ' <i>한글 OK</i>' : ''}</span><button class="e fr-o">${esc(r.out)}</button></div>`).join('');
  return `${breadcrumb(key)}
<div class="intro"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p></div>
<div class="font-tool">
  <label for="font-in" class="sr">변환할 글자</label>
  <textarea id="font-in" rows="2" maxlength="300" placeholder="여기에 입력하세요 (영어·숫자·한글)">${sample}</textarea>
  <div class="font-filter" role="group" aria-label="스타일 보기"><button type="button" class="on" data-f="all">전체</button><button type="button" data-f="hangul">한글 되는 것만</button></div>
</div>
${adSlot('top')}
<section class="grp" aria-labelledby="fonts-h"><h2 id="fonts-h">인스타 글씨체 ${convertAll('').length}가지 <span class="cnt">누르면 복사</span></h2><div class="font-list" id="font-list">${rows}</div></section>
${adSlot('middle')}
<section class="grp" aria-labelledby="ex-h"><h2 id="ex-h">인스타 이름 꾸미기 예시</h2>${grid([
    '𝓢𝓪𝓻𝓪𝓱 ♡', '𝐇𝐀𝐍𝐍𝐀𝐇 ✧', '𝕄𝕚𝕟𝕛𝕚 ⋆', '୨ৎ 𝒿𝒾𝓃 ୨ৎ', 'ʚ 𝘺𝘶𝘯𝘢 ɞ', '꧁ 𝔇𝔞𝔫𝔦 ꧂', '𝙙𝙖𝙞𝙡𝙮 𝙡𝙤𝙜', '⋆˚✿˖° ʜᴀᴇɴɪ °˖✿˚⋆', 'ⓜⓘⓝⓐ', '🅳🅰🅽🅸', 'ᵐᵉᵒʷ', '𝚜𝚘𝚘 𝟶𝟻𝟸𝟶',
  ].map((t) => ({ t })))}</section>
${adSlot('bottom')}
${about(key)}
${related(key)}`;
}

// ── 레이아웃 ─────────────────────────────────────────
function layout(key, body) {
  const p = pages[key];
  const url = abs(p.path);
  const isHome = key === 'home';
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': isHome ? 'WebSite' : 'CollectionPage',
      name: isHome ? `${site.name} (${site.nameEn})` : p.h1,
      alternateName: isHome ? [site.nameEn, '나나티콘 특수문자'] : undefined,
      url,
      description: p.description,
      inLanguage: 'ko-KR',
      ...(isHome ? { potentialAction: { '@type': 'SearchAction', target: `${site.origin}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } } : { isPartOf: { '@type': 'WebSite', name: site.name, url: site.origin + '/' } }),
    },
  ];
  if (!isHome) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: site.origin + '/' }, { '@type': 'ListItem', position: 2, name: p.nav, item: url }] });
  if (p.type === 'font') ld.push({ '@context': 'https://schema.org', '@type': 'WebApplication', name: '인스타 폰트 변환기', url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'All', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } });
  if (p.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

  const verify = isHome ? `
<meta name="google-site-verification" content="${site.verification.google}">
<meta name="naver-site-verification" content="${site.verification.naver}">
<meta name="p:domain_verify" content="${site.verification.pinterest}">` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="keywords" content="${esc(p.keywords.join(', '))}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#f6d3e4">${verify}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${abs(site.ogImage)}">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${abs(site.ogImage)}">
<link rel="icon" href="/img/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/img/favicon.png">
<link rel="apple-touch-icon" href="/img/appicon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="${site.name}" href="/rss.xml">
<link rel="stylesheet" href="/assets/style.css?v=${VERSION}">
${ld.map(jsonLd).join('\n')}
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaId}');</script>
</head>
<body data-page="${key}">
<a class="skip" href="#main">본문 바로가기</a>
${header(key)}
<main id="main">
${body}
</main>
${footer()}
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="/assets/app.js?v=${VERSION}" defer></script>
${p.type === 'font' ? `<script type="module" src="/assets/font-page.js?v=${VERSION}"></script>` : ''}
</body>
</html>
`;
}

// ── 출력 ─────────────────────────────────────────────
function write(rel, content) {
  const f = join(ROOT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, content);
}

const order = navGroups.flatMap((g) => g.items);
for (const key of Object.keys(pages)) if (!order.includes(key)) throw new Error(`navGroups 에 없는 페이지: ${key}`);

for (const key of order) {
  const p = pages[key];
  const body = key === 'home' ? homeBody() : p.type === 'hub' ? hubBody(key) : p.type === 'font' ? fontBody(key) : listBody(key);
  write(fileOf(key), layout(key, body));
}

// 검색 색인: pages = [경로, 이름, 아이콘], items = [복사텍스트, 페이지번호, 묶음제목, 라벨?]
const sPages = [], sItems = [];
order.forEach((key) => {
  if (pages[key].type !== 'list') return;
  const pi = sPages.push([pages[key].path, pages[key].nav, pages[key].icon, pages[key].keywords.join(' ')]) - 1;
  const seen = new Set();
  for (const g of dataOf(key)) for (const it of g.items) {
    if (seen.has(it.t)) continue;
    seen.add(it.t);
    sItems.push(it.l ? [it.t, pi, g.title, it.l] : [it.t, pi, g.title]);
  }
});
['font'].forEach((key) => sPages.push([pages[key].path, pages[key].nav, pages[key].icon, pages[key].keywords.join(' ')]));
write('assets/search.json', JSON.stringify({ pages: sPages, items: sItems }));

// sitemap / rss / robots
const priority = (k) => (k === 'home' ? '1.0' : ['font', 'special', 'heart', 'nickname'].includes(k) ? '0.9' : '0.8');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${order.map((k) => `  <url><loc>${abs(pages[k].path)}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>${priority(k)}</priority></url>`).join('\n')}
</urlset>
`);
const rfc = new Date().toUTCString();
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${site.name} - 특수문자 이모티콘 모음</title>
<link>${site.origin}/</link>
<description>${esc(pages.home.description)}</description>
<language>ko</language>
<lastBuildDate>${rfc}</lastBuildDate>
${order.map((k) => `<item><title>${esc(pages[k].title)}</title><link>${abs(pages[k].path)}</link><guid>${abs(pages[k].path)}</guid><description>${esc(pages[k].description)}</description><pubDate>${rfc}</pubDate></item>`).join('\n')}
</channel>
</rss>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /no_use/
Disallow: /data/
Disallow: /scripts/

Sitemap: ${site.origin}/sitemap.xml
`);
write('manifest.json', JSON.stringify({ name: `${site.name} 특수문자 이모티콘`, short_name: site.name, start_url: '/', display: 'standalone', background_color: '#fff8fb', theme_color: '#f6d3e4', lang: 'ko', icons: [{ src: '/img/appicon.png', sizes: '384x384', type: 'image/png' }] }, null, 2));

console.log(`built ${order.length} pages · ${sItems.length} search items · ${TODAY}`);
