// 나나티콘 정적 사이트 생성기 (의존성 없음)
//   node scripts/build.mjs
// data/site.mjs + data/emoticons/*.txt →
//   index.html, <section>.html, <section>/<slug>.html, 404.html,
//   sitemap.xml, rss.xml, robots.txt, manifest.json, vercel.json, assets/search.json
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, home, sections, pages, homeQuick, redirects } from '../data/site.mjs';
import { convertAll } from '../assets/fonts.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);
const VERSION = Date.now().toString(36);

// ── 유틸 ─────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => site.origin + (p === '/' ? '/' : p);
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const secOf = Object.fromEntries(sections.map((s) => [s.key, s]));
const keys = Object.keys(pages);
const childrenOf = (sk) => keys.filter((k) => pages[k].section === sk);
for (const k of keys) {
  const p = pages[k];
  if (!secOf[p.section]) throw new Error(`알 수 없는 section: ${k}`);
  p.key = k;
  p.path = `/${p.section}/${p.slug}`;
  p.file = `${p.section}/${p.slug}.html`;
}
for (const s of sections) { s.path = `/${s.key}`; s.file = `${s.key}.html`; s.type = 'hub'; }
home.file = 'index.html';
const shortOf = (p) => p.short || p.nav;
const ogOf = (id) => (existsSync(join(ROOT, `img/og/${id}.jpg`)) ? `/img/og/${id}.jpg` : site.ogImage);

// ── 데이터 파싱 ──────────────────────────────────────
// "## 제목 {#id}" 로 묶음 시작, 한 줄에 하나씩.
//   @range 2460-2473 → 유니코드 범위 펼치기   \u{3164}, \n → 이스케이프   텍스트 »» 설명 → 설명을 보여주고 텍스트를 복사
const decode = (s) => s.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\n/g, '\n');
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
    const t = decode(text.trim());
    if (!g.items.some((x) => x.t === t)) g.items.push(label ? { t, l: label.trim() } : { t });
  }
  return groups;
}
const cache = {};
const dataOf = (k) => (pages[k].data ? (cache[k] ??= parseData(pages[k].data)) : []);
const countOf = (k) => dataOf(k).reduce((n, g) => n + g.items.length, 0);
const samplesOf = (k, n) => dataOf(k).flatMap((g) => g.items).filter((it) => !it.l && !it.t.includes('\n') && [...it.t].length <= 14).slice(0, n);
const sectionCount = (sk) => childrenOf(sk).reduce((n, k) => n + countOf(k), 0);
const TOTAL = keys.reduce((n, k) => n + countOf(k), 0);

// ── 공통 조각 ────────────────────────────────────────
const SEARCH_ICO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>';

function itemBtn(it) {
  if (it.l) return `<button class="e e-label${it.t.trim() ? '' : ' e-blank'}" data-c="${esc(it.t)}"><span class="e-l">${esc(it.l)}</span></button>`;
  if (it.t.includes('\n')) return `<button class="e e-multi" data-c="${esc(it.t)}">${esc(it.t).replace(/\n/g, '<br>')}</button>`;
  return `<button class="e">${esc(it.t)}</button>`;
}
const grid = (items) => `<div class="grid">${items.map(itemBtn).join('')}</div>`;

function adSlot(pos) {
  const c = site.coupang;
  if (!c.enabled || !c[pos]) return '';
  return `<aside class="ad ad-${pos}" aria-label="광고"><div class="ad-body">${c[pos]}</div><p class="ad-note">${esc(c.disclosure)}</p></aside>`;
}

// 현재 위치: 'home' | 섹션키 | 페이지키
function header(curSection) {
  const tabs = sections.map((s) => `<a href="${s.path}"${s.key === curSection ? ' class="on" aria-current="true"' : ''}>${esc(s.nav)}</a>`).join('');
  return `<header class="hd">
  <div class="hd-top">
    <a class="logo" href="/" aria-label="${site.name} 홈">${esc(site.logo)}</a>
    <button class="search-open" type="button" aria-label="이모티콘·특수문자 검색">${SEARCH_ICO} 하트, 고양이, 공백 검색</button>
    <button class="menu-open menu-toggle" type="button" aria-expanded="false" aria-controls="drawer"><span aria-hidden="true">☰</span> 전체 메뉴</button>
  </div>
  <nav class="ptabs" aria-label="주 메뉴">${tabs}</nav>
</header>`;
}

function drawer(curKey) {
  const groups = sections.map((s) => `<div class="dg"><a class="dg-t" href="${s.path}"${curKey === s.key ? ' aria-current="page"' : ''}>${esc(s.nav)} <span>전체 보기 ›</span></a>${childrenOf(s.key).map((k) => `<a href="${pages[k].path}"${k === curKey ? ' aria-current="page"' : ''}><span class="dg-i" aria-hidden="true">${esc(pages[k].icon)}</span><span class="dg-n">${esc(pages[k].nav)}</span>${countOf(k) ? `<span class="dg-c">${countOf(k)}</span>` : ''}</a>`).join('')}</div>`).join('');
  return `<nav id="drawer" class="drawer" aria-label="전체 메뉴" hidden><div class="drawer-in"><div class="drawer-hd"><b>전체 메뉴</b><button class="menu-close" type="button" aria-label="닫기">✕</button></div><button type="button" class="search-open drawer-search">${SEARCH_ICO} 이모티콘·특수문자 검색</button><a class="dg-home" href="/"${curKey === 'home' ? ' aria-current="page"' : ''}>⌂ 홈</a>${groups}</div></nav>`;
}

function footer() {
  const cols = sections.map((s) => `<div><a class="ft-t" href="${s.path}">${esc(s.nav)}</a>${childrenOf(s.key).map((k) => `<a href="${pages[k].path}">${esc(pages[k].nav)}</a>`).join('')}</div>`).join('');
  return `<footer class="ft">
  <div class="ft-cols">${cols}</div>
  <p class="ft-copy"><a href="/">${site.name} (${site.nameEn})</a> · 특수문자·이모티콘 ${TOTAL.toLocaleString()}개를 클릭 한 번에 복사하세요. · 업데이트 ${TODAY}${site.coupang.enabled ? `<br>${esc(site.coupang.disclosure)}` : ''}</p>
</footer>`;
}

function breadcrumb(trail) {
  // trail: [[이름, 경로], ...] 마지막은 현재
  return `<nav class="bc" aria-label="현재 위치"><a href="/">홈</a>${trail.map(([n, p], i) => ` <span aria-hidden="true">›</span> ${i === trail.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`}`).join('')}</nav>`;
}

// 같은 분류 메뉴 (가로 스크롤 칩)
function subnav(sk, curKey) {
  const items = childrenOf(sk).map((k) => `<a href="${pages[k].path}"${k === curKey ? ' class="on" aria-current="page"' : ''}><span class="ci" aria-hidden="true">${esc(pages[k].icon)}</span>${esc(shortOf(pages[k]))}</a>`).join('');
  return `<nav class="chips" aria-label="${esc(secOf[sk].nav)} 메뉴"><a href="${secOf[sk].path}"${curKey === sk ? ' class="on" aria-current="page"' : ''}>${esc(secOf[sk].nav)} 전체</a>${items}</nav>`;
}

const shortTitle = (t) => t.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*(이모티콘|특수문자|특수기호|이모지)$/, '').replace(/\s*·\s*/g, '·') || t;
const tocBar = (links) => `<div class="subnav"><nav class="toc" aria-label="이 페이지 목차">${links.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}</nav></div>`;

function sections_(groups) {
  return groups.map((g, i) => `<section class="grp" id="${g.id}" aria-labelledby="${g.id}-h">
  <h2 id="${g.id}-h">${esc(g.title)} <span class="cnt">${g.items.length}</span></h2>
  ${grid(g.items)}
</section>${i === 1 ? adSlot('middle') : ''}`).join('\n');
}

function card(k, withSample = false) {
  const p = pages[k];
  const n = countOf(k);
  return `<a class="card" href="${p.path}"><span class="card-i" aria-hidden="true">${esc(p.icon)}</span><span class="card-t">${esc(p.nav)}</span>${n ? `<span class="card-n">${n}개</span>` : '<span class="card-n">도구</span>'}${withSample ? '' : ''}</a>`;
}

function about(p, name) {
  const faq = p.faq?.length ? `<h2>자주 묻는 질문</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}` : '';
  return `<section class="about" aria-labelledby="about-h">
  <h2 id="about-h">${esc(name)} 소개</h2>
  <p>${esc(p.intro)}</p>
  <h2>사용 방법</h2>
  <ol><li>마음에 드는 ${p.type === 'font' ? '글씨체' : '특수문자'}를 누르면 바로 복사돼요.</li><li>카카오톡, 인스타그램, 트위터(X), 블로그 등 원하는 곳에 붙여넣기 하세요.</li><li>복사한 건 화면 아래 <b>보관함</b>에 자동 저장돼요. 하트를 눌러 즐겨찾기 하거나 <b>이어붙이기</b>로 여러 개를 조합할 수 있어요.</li></ol>
  ${faq}
  <p class="upd">최종 업데이트: <time datetime="${TODAY}">${TODAY}</time></p>
</section>`;
}

function prevNext(k) {
  const sib = childrenOf(pages[k].section);
  const i = sib.indexOf(k);
  const prev = sib[i - 1], next = sib[i + 1];
  if (!prev && !next) return '';
  return `<nav class="pn" aria-label="이전·다음 페이지">${prev ? `<a class="pn-prev" href="${pages[prev].path}"><small>‹ 이전</small>${esc(pages[prev].nav)}</a>` : '<span></span>'}${next ? `<a class="pn-next" href="${pages[next].path}"><small>다음 ›</small>${esc(pages[next].nav)}</a>` : ''}</nav>`;
}

function related(k) {
  const sk = pages[k].section;
  const same = childrenOf(sk).filter((x) => x !== k);
  const others = ['font', 'heart', 'nickname', 'cute', 'bear', 'birthday', 'number', 'kakao'].filter((x) => pages[x].section !== sk).slice(0, 4);
  return `<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">${esc(secOf[sk].nav)} 더 보기</h2><div class="cards">${same.map((x) => card(x)).join('')}</div>
<h2>다른 분류 인기 페이지</h2><div class="cards">${others.map((x) => card(x)).join('')}</div></section>`;
}

// ── 페이지 본문 ─────────────────────────────────────
function pageBody(k) {
  const p = pages[k];
  const sec = secOf[p.section];
  if (p.type === 'font') return fontBody(k);
  const groups = dataOf(k);
  return `${breadcrumb([[sec.nav, sec.path], [p.nav, p.path]])}
<div class="intro"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)} <span class="total">${countOf(k)}개</span></p></div>
${subnav(p.section, k)}
${adSlot('top')}
${groups.length >= 2 ? tocBar(groups.map((g) => [g.id, shortTitle(g.title)])) : ''}
${sections_(groups)}
${adSlot('bottom')}
${prevNext(k)}
${about(p, p.nav)}
${related(k)}`;
}

function fontBody(k) {
  const p = pages[k];
  const sec = secOf[p.section];
  const sample = 'nanaticon 0520';
  const rows = convertAll(sample).map((r) => `<div class="fr" data-id="${r.id}"><span class="fr-n">${esc(r.name)}${r.hangul ? ' <i>한글 OK</i>' : ''}</span><button class="e fr-o">${esc(r.out)}</button></div>`).join('');
  return `${breadcrumb([[sec.nav, sec.path], [p.nav, p.path]])}
<div class="intro"><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p></div>
${subnav(p.section, k)}
<div class="font-tool">
  <label for="font-in" class="sr">변환할 글자</label>
  <textarea id="font-in" rows="2" maxlength="300" placeholder="여기에 입력하세요 (영어·숫자·한글)">${sample}</textarea>
  <div class="font-filter" role="group" aria-label="스타일 보기"><button type="button" class="on" data-f="all">전체</button><button type="button" data-f="hangul">한글 되는 것만</button></div>
</div>
${adSlot('top')}
<section class="grp" aria-labelledby="fonts-h"><h2 id="fonts-h">인스타 글씨체 ${convertAll('').length}가지 <span class="cnt">누르면 복사</span></h2><div class="font-list" id="font-list">${rows}</div></section>
${adSlot('middle')}
<section class="grp" aria-labelledby="ex-h"><h2 id="ex-h">인스타 이름 꾸미기 예시</h2>${grid(['𝓢𝓪𝓻𝓪𝓱 ♡', '𝐇𝐀𝐍𝐍𝐀𝐇 ✧', '𝕄𝕚𝕟𝕛𝕚 ⋆', '୨ৎ 𝒿𝒾𝓃 ୨ৎ', 'ʚ 𝘺𝘶𝘯𝘢 ɞ', '꧁ 𝔇𝔞𝔫𝔦 ꧂', '𝙙𝙖𝙞𝙡𝙮 𝙡𝙤𝙜', '⋆˚✿˖° ʜᴀᴇɴɪ °˖✿˚⋆', 'ⓜⓘⓝⓐ', '🅳🅰🅽🅸', 'ᵐᵉᵒʷ', '𝚜𝚘𝚘 𝟶𝟻𝟸𝟶'].map((t) => ({ t })))}</section>
${adSlot('bottom')}
${prevNext(k)}
${about(p, p.nav)}
${related(k)}`;
}

function hubBody(s) {
  const kids = childrenOf(s.key);
  const blocks = kids.map((k, i) => {
    const p = pages[k];
    const body = p.type === 'font'
      ? grid(convertAll('nanaticon').slice(0, 8).map((r) => ({ t: r.out })))
      : grid(samplesOf(k, 24));
    return `<section class="grp" id="${k}" aria-labelledby="${k}-h"><h2 id="${k}-h"><a href="${p.path}">${esc(p.nav)}</a> <span class="cnt">${countOf(k) || '도구'}</span></h2><p class="grp-d">${esc(p.lead)}</p>${body}<a class="more" href="${p.path}">${esc(p.nav)} 전체 보기 →</a></section>${i === 1 ? adSlot('middle') : ''}`;
  }).join('\n');
  return `${breadcrumb([[s.nav, s.path]])}
<div class="intro"><h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)} <span class="total">${sectionCount(s.key)}개</span></p></div>
${subnav(s.key, s.key)}
${adSlot('top')}
<section class="cats" aria-label="${esc(s.nav)} 카테고리"><div class="cards">${kids.map((k) => card(k)).join('')}</div></section>
${tocBar(kids.map((k) => [k, shortOf(pages[k])]))}
${blocks}
${adSlot('bottom')}
${about(s, s.nav)}`;
}

function homeBody() {
  const quick = homeQuick.map((k) => `<a href="${pages[k].path}"><span class="ci" aria-hidden="true">${esc(pages[k].icon)}</span>${esc(shortOf(pages[k]))}</a>`).join('');
  const tools = ['font', 'nickname', 'bio', 'kakao'].map((k) => `<a class="tool" href="${pages[k].path}"><span class="tool-i" aria-hidden="true">${esc(pages[k].icon)}</span><span><b>${esc(pages[k].nav)}</b><small>${esc(pages[k].lead)}</small></span></a>`).join('');
  const secs = sections.map((s) => `<section class="home-sec" aria-labelledby="hs-${s.key}"><h2 id="hs-${s.key}"><a href="${s.path}">${esc(s.nav)}</a> <span class="cnt">${sectionCount(s.key) || ''}</span><a class="h-more" href="${s.path}">전체 보기 ›</a></h2><div class="cards">${childrenOf(s.key).map((k) => card(k)).join('')}</div></section>`).join('\n');
  const popular = ['cute', 'smile', 'shy', 'bear', 'cat', 'rabbit'].flatMap((k) => samplesOf(k, 8));
  const symbols = ['heart', 'star', 'ribbon', 'pretty', 'flower'].flatMap((k) => samplesOf(k, 10));
  return `<div class="intro hero"><h1>${esc(home.h1)}</h1><p class="lead">${esc(home.lead)}</p>
<button class="search-open big" type="button">${SEARCH_ICO} 어떤 특수문자를 찾으세요? (예: 하트, 곰돌이, 공백)</button></div>
<nav class="chips chips-home" aria-label="인기 페이지">${quick}</nav>
<section class="tools" aria-label="꾸미기 도구">${tools}</section>
${adSlot('top')}
<section class="grp" id="popular" aria-labelledby="pop-h"><h2 id="pop-h">인기 표정 이모티콘 <span class="cnt">누르면 복사</span></h2>${grid(popular)}<a class="more" href="/emoticon">표정 이모티콘 전체 보기 →</a></section>
<section class="grp" id="symbols" aria-labelledby="sym-h"><h2 id="sym-h">인기 특수문자 <span class="cnt">누르면 복사</span></h2>${grid(symbols)}<a class="more" href="/symbol">특수문자 전체 보기 →</a></section>
${adSlot('middle')}
${secs}
${adSlot('bottom')}
${about(home, site.name)}`;
}

function notFoundBody() {
  return `<div class="intro"><h1>페이지를 찾을 수 없어요 (ᵕ̣̣̣̣̣̣﹏ᵕ̣̣̣̣̣̣)</h1><p class="lead">주소가 바뀌었거나 없는 페이지예요. 검색하거나 아래 메뉴에서 찾아보세요.</p>
<button class="search-open big" type="button">${SEARCH_ICO} 특수문자 검색하기</button></div>
${sections.map((s) => `<section class="home-sec"><h2><a href="${s.path}">${esc(s.nav)}</a></h2><div class="cards">${childrenOf(s.key).map((k) => card(k)).join('')}</div></section>`).join('')}`;
}

// ── 레이아웃 ─────────────────────────────────────────
const ORG = { '@type': 'Organization', name: site.name, alternateName: site.nameEn, url: site.origin + '/', logo: abs('/img/appicon.png') };
function layout(meta, body, opts) {
  const { id, kind, curSection, curKey, trail = [] } = opts;
  const url = abs(meta.path);
  const ld = [];
  if (kind === 'home') {
    ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, alternateName: [site.nameEn, '나나티콘 특수문자'], url, description: meta.description, inLanguage: 'ko-KR', publisher: ORG, potentialAction: { '@type': 'SearchAction', target: `${site.origin}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } });
    ld.push({ '@context': 'https://schema.org', ...ORG });
  } else if (kind !== '404') {
    const page = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: meta.h1, headline: meta.title, url, description: meta.description, inLanguage: 'ko-KR', dateModified: TODAY, isPartOf: { '@type': 'WebSite', name: site.name, url: site.origin + '/' }, publisher: ORG, keywords: meta.keywords.join(', ') };
    if (kind === 'hub') page.mainEntity = { '@type': 'ItemList', itemListElement: childrenOf(curSection).map((k, i) => ({ '@type': 'ListItem', position: i + 1, name: pages[k].nav, url: abs(pages[k].path) })) };
    ld.push(page);
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['홈', '/'], ...trail].map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(p) })) });
  }
  if (meta.type === 'font') ld.push({ '@context': 'https://schema.org', '@type': 'WebApplication', name: '인스타 폰트 변환기', url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'All', inLanguage: 'ko-KR', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } });
  if (meta.faq?.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

  const og = abs(ogOf(id));
  const verify = kind === 'home' ? `
<meta name="google-site-verification" content="${site.verification.google}">
<meta name="naver-site-verification" content="${site.verification.naver}">
<meta name="p:domain_verify" content="${site.verification.pinterest}">` : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="keywords" content="${esc((meta.keywords || []).join(', '))}">
<meta name="robots" content="${kind === '404' ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
${kind === '404' ? '' : `<link rel="canonical" href="${url}">\n`}<meta name="theme-color" content="#f6d3e4">
<meta name="format-detection" content="telephone=no">${verify}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(meta.h1)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/img/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/img/favicon.png">
<link rel="apple-touch-icon" href="/img/appicon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="${site.name}" href="/rss.xml">
<link rel="preconnect" href="https://www.googletagmanager.com">
<link rel="stylesheet" href="/assets/style.css?v=${VERSION}">
${ld.map(jsonLd).join('\n')}
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaId}');</script>
</head>
<body data-page="${id}" data-v="${VERSION}">
<a class="skip" href="#main">본문 바로가기</a>
${header(curSection)}
${drawer(curKey)}
<main id="main">
${body}
</main>
${footer()}
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="/assets/app.js?v=${VERSION}" defer></script>
${meta.type === 'font' ? `<script type="module" src="/assets/font-page.js?v=${VERSION}"></script>` : ''}
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
// 이전 빌드 결과 정리
for (const dir of ['sub', ...sections.map((s) => s.key)]) rmSync(join(ROOT, dir), { recursive: true, force: true });
for (const s of sections) rmSync(join(ROOT, s.file), { force: true });

write('index.html', layout(home, homeBody(), { id: 'home', kind: 'home', curKey: 'home' }));
for (const s of sections) write(s.file, layout(s, hubBody(s), { id: s.key, kind: 'hub', curSection: s.key, curKey: s.key, trail: [[s.nav, s.path]] }));
for (const k of keys) {
  const p = pages[k], s = secOf[p.section];
  write(p.file, layout(p, pageBody(k), { id: k, kind: 'page', curSection: s.key, curKey: k, trail: [[s.nav, s.path], [p.nav, p.path]] }));
}
write('404.html', layout({ path: '/404', title: `페이지를 찾을 수 없어요 | ${site.name}`, description: home.description, h1: '페이지를 찾을 수 없어요', keywords: [] }, notFoundBody(), { id: '404', kind: '404' }));

// 검색 색인: pages = [경로, 이름, 아이콘, 키워드], items = [복사텍스트, 페이지번호, 묶음제목, 라벨?]
const sPages = [], sItems = [];
for (const k of keys) {
  const p = pages[k];
  const pi = sPages.push([p.path, p.nav, p.icon, `${p.keywords.join(' ')} ${secOf[p.section].nav}`]) - 1;
  const seen = new Set();
  for (const g of dataOf(k)) for (const it of g.items) {
    if (seen.has(it.t)) continue;
    seen.add(it.t);
    sItems.push(it.l ? [it.t, pi, g.title, it.l] : [it.t, pi, g.title]);
  }
}
write('assets/search.json', JSON.stringify({ pages: sPages, items: sItems }));

// sitemap / rss / robots / manifest
const urls = [['/', '1.0'], ...sections.map((s) => [s.path, '0.9']), ...keys.map((k) => [pages[k].path, ['font', 'heart', 'nickname', 'cute'].includes(k) ? '0.9' : '0.8'])];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, pr]) => `  <url><loc>${abs(p)}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
const rfc = new Date().toUTCString();
const feedItems = [...sections, ...keys.map((k) => pages[k])];
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${site.name} - 특수문자 이모티콘 모음</title>
<link>${site.origin}/</link>
<description>${esc(home.description)}</description>
<language>ko</language>
<lastBuildDate>${rfc}</lastBuildDate>
${feedItems.map((p) => `<item><title>${esc(p.title)}</title><link>${abs(p.path)}</link><guid>${abs(p.path)}</guid><description>${esc(p.description)}</description><pubDate>${rfc}</pubDate></item>`).join('\n')}
</channel>
</rss>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /assets/search.json

Sitemap: ${site.origin}/sitemap.xml
`);
write('manifest.json', JSON.stringify({ name: `${site.name} 특수문자 이모티콘`, short_name: site.name, start_url: '/', display: 'standalone', background_color: '#fff8fb', theme_color: '#f6d3e4', lang: 'ko', icons: [{ src: '/img/appicon.png', sizes: '384x384', type: 'image/png' }] }, null, 2));

// Vercel: 깔끔한 주소(.html 제거), 예전 주소 영구 리다이렉트, 캐시
write('vercel.json', JSON.stringify({
  cleanUrls: true,
  trailingSlash: false,
  // cleanUrls 가 .html 을 먼저 떼므로 확장자 없는 주소도 함께 등록
  redirects: Object.entries(redirects).flatMap(([source, destination]) => [
    ...(source.endsWith('.html') ? [{ source: source.replace(/(\/index)?\.html$/, '') || '/', destination }] : []),
    { source, destination },
  ]).filter((r) => r.source !== r.destination).map((r) => ({ ...r, permanent: true })),
  headers: [
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/assets/search.json', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    { source: '/img/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    { source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] },
  ],
}, null, 2) + '\n');

console.log(`built ${1 + sections.length + keys.length} pages · ${TOTAL} items · ${sItems.length} search items · ${TODAY}`);
