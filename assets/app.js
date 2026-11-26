/* 나나티콘 — 복사 · 보관함(최근/즐겨찾기) · 이어붙이기 · 검색 · 메뉴 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('nana:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('nana:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var recent = store.get('recent', []);
  var favs = store.get('favs', []);
  var compose = { on: false, text: store.get('compose', '') };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(name, params) { try { window.gtag && window.gtag('event', name, params); } catch (e) {} }

  // ── 복사 (카톡 인앱 브라우저 등 clipboard API 미지원 대비) ──
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  // ── 토스트 ──
  var toast = $('#toast'), toastTimer;
  function showToast(html, ms) {
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, ms || 2200);
  }
  function preview(t) {
    var s = t.trim() ? t : '(공백 문자)';
    return esc(s.length > 40 ? s.slice(0, 40) + '…' : s).replace(/\n/g, ' ⏎ ');
  }

  function addRecent(t) {
    recent = [t].concat(recent.filter(function (x) { return x !== t; })).slice(0, 60);
    store.set('recent', recent);
    renderDock();
  }
  function isFav(t) { return favs.indexOf(t) >= 0; }
  function toggleFav(t) {
    favs = isFav(t) ? favs.filter(function (x) { return x !== t; }) : [t].concat(favs);
    store.set('favs', favs);
    renderDock();
    if (sheet && !sheet.hidden) renderSheet();
    return isFav(t);
  }

  function doCopy(t, source) {
    if (compose.on) {
      compose.text += t;
      store.set('compose', compose.text);
      renderCompose();
      return;
    }
    copy(t).then(function (ok) {
      if (!ok) { showToast('복사가 안 되는 환경이에요.<br>길게 눌러 직접 복사해 주세요', 3000); return; }
      addRecent(t);
      showToast('<span class="t-e">' + preview(t) + '</span><span class="t-m">복사됐어요 ✓</span>' +
        '<button type="button" class="t-fav" aria-pressed="' + isFav(t) + '">' + (isFav(t) ? '♥ 즐겨찾기됨' : '♡ 즐겨찾기') + '</button>');
      toast.dataset.t = t;
      track('copy_emoticon', { text: t.slice(0, 50), page: document.body.dataset.page, source: source || 'page' });
    });
  }

  document.addEventListener('click', function (ev) {
    var fav = ev.target.closest('.t-fav, .fav');
    if (fav) {
      var ft = fav.classList.contains('t-fav') ? toast.dataset.t : fav.dataset.t;
      var now = toggleFav(ft);
      if (fav.classList.contains('t-fav')) { fav.textContent = now ? '♥ 즐겨찾기됨' : '♡ 즐겨찾기'; fav.setAttribute('aria-pressed', now); }
      return;
    }
    var el = ev.target.closest('.e');
    if (!el) return;
    var t = el.hasAttribute('data-c') ? el.getAttribute('data-c') : el.textContent;
    if (!el.hasAttribute('data-c')) t = t.trim();
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    doCopy(t, el.closest('.sheet') ? 'sheet' : el.closest('.srch') ? 'search' : 'page');
  });

  // ── 하단 독: 보관함 / 이어붙이기 ──
  var dock = document.createElement('div');
  dock.className = 'dock';
  dock.innerHTML =
    '<div class="cmp" hidden><div class="cmp-text" aria-live="polite"></div>' +
    '<div class="cmp-btns"><button type="button" class="cmp-back" aria-label="마지막 글자 지우기">⌫</button><button type="button" class="cmp-clear">비우기</button><button type="button" class="cmp-copy">복사하기</button></div>' +
    '<p class="cmp-help">이모티콘을 누르면 여기에 이어붙여져요</p></div>' +
    '<div class="dock-bar"><button type="button" class="dock-box">♡ 보관함 <span class="badge"></span></button>' +
    '<button type="button" class="dock-cmp" aria-pressed="false">✚ 이어붙이기</button></div>';
  document.body.appendChild(dock);
  var cmp = $('.cmp', dock), cmpText = $('.cmp-text', dock), cmpBtn = $('.dock-cmp', dock);

  function renderDock() { $('.badge', dock).textContent = favs.length ? favs.length : ''; }
  function renderCompose() {
    cmp.hidden = !compose.on;
    cmpBtn.setAttribute('aria-pressed', compose.on);
    cmpBtn.textContent = compose.on ? '✓ 이어붙이기 끄기' : '✚ 이어붙이기';
    document.body.classList.toggle('composing', compose.on);
    cmpText.textContent = compose.text || '';
    cmpText.classList.toggle('empty', !compose.text);
  }
  cmpBtn.addEventListener('click', function () { compose.on = !compose.on; renderCompose(); if (compose.on) track('compose_on', {}); });
  $('.cmp-clear', dock).addEventListener('click', function () { compose.text = ''; store.set('compose', ''); renderCompose(); });
  $('.cmp-back', dock).addEventListener('click', function () { var a = Array.from(compose.text); a.pop(); compose.text = a.join(''); store.set('compose', compose.text); renderCompose(); });
  $('.cmp-copy', dock).addEventListener('click', function () {
    if (!compose.text) return;
    var t = compose.text;
    copy(t).then(function (ok) { if (ok) { addRecent(t); showToast('<span class="t-e">' + preview(t) + '</span><span class="t-m">조합 복사 완료 ✓</span>'); track('compose_copy', {}); } });
  });

  // 보관함 시트
  var sheet, tab = 'recent';
  function renderSheet() {
    var list = tab === 'recent' ? recent : favs;
    $('.sheet-tabs [data-tab=recent]', sheet).setAttribute('aria-selected', tab === 'recent');
    $('.sheet-tabs [data-tab=favs]', sheet).setAttribute('aria-selected', tab === 'favs');
    $('.sheet-body', sheet).innerHTML = list.length
      ? '<div class="grid">' + list.map(function (t) {
          return '<span class="si"><button class="e" data-c="' + esc(t) + '">' + preview(t) + '</button><button type="button" class="fav" data-t="' + esc(t) + '" aria-label="즐겨찾기" aria-pressed="' + isFav(t) + '">' + (isFav(t) ? '♥' : '♡') + '</button></span>';
        }).join('') + '</div>'
      : '<p class="sheet-empty">' + (tab === 'recent' ? '아직 복사한 이모티콘이 없어요.<br>마음에 드는 걸 눌러보세요 (˶ᵔ ᵕ ᵔ˶)' : '즐겨찾기가 비어있어요.<br>♡ 를 눌러 자주 쓰는 걸 모아두세요') + '</p>';
  }
  function openSheet() {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', '보관함');
      sheet.innerHTML = '<div class="sheet-in"><div class="sheet-hd"><div class="sheet-tabs" role="tablist"><button role="tab" data-tab="recent">최근 복사</button><button role="tab" data-tab="favs">즐겨찾기 ♡</button></div><button type="button" class="sheet-x" aria-label="닫기">✕</button></div><div class="sheet-body"></div></div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet || e.target.closest('.sheet-x')) closeSheet();
        var tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; renderSheet(); }
      });
    }
    tab = favs.length && !recent.length ? 'favs' : tab;
    renderSheet();
    sheet.hidden = false;
    document.body.classList.add('noscroll');
  }
  function closeSheet() { sheet.hidden = true; document.body.classList.remove('noscroll'); }
  $('.dock-box', dock).addEventListener('click', openSheet);

  // ── 메뉴 서랍 ──
  var drawer = $('#drawer'), menuBtn = $('.menu-open');
  function setDrawer(open) {
    drawer.hidden = !open; menuBtn.setAttribute('aria-expanded', open);
    document.body.classList.toggle('noscroll', open);
  }
  menuBtn.addEventListener('click', function () { setDrawer(drawer.hidden); });
  drawer.addEventListener('click', function (e) { if (e.target === drawer || e.target.closest('.menu-close')) setDrawer(false); });

  // ── 검색 ──
  var srch, data, loading;
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ''); }
  function loadIndex() {
    if (data || loading) return loading;
    loading = fetch('/assets/search.json').then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      d.items.forEach(function (it) { var p = d.pages[it[1]]; it.h = norm(it[0] + ' ' + it[2] + ' ' + (it[3] || '') + ' ' + p[1] + ' ' + p[3]); it.self = norm(it[0]); });
      d.pages.forEach(function (p) { p.h = norm(p[1] + ' ' + p[3]); });
    });
    return loading;
  }
  function runSearch(q) {
    var out = $('.srch-out', srch);
    var nq = norm(q);
    if (!nq) {
      out.innerHTML = '<p class="srch-hint">인기 검색어</p><div class="srch-tags">' + ['하트', '고양이', '곰돌이', '리본', '별', '공백', '구분선', '웃는', '슬픈', '동그라미 숫자', '화살표', '꽃'].map(function (w) { return '<button type="button" data-q="' + w + '">' + w + '</button>'; }).join('') + '</div>';
      return;
    }
    if (!data) { out.innerHTML = '<p class="srch-hint">불러오는 중…</p>'; loadIndex().then(function () { runSearch($('.srch-in', srch).value); }); return; }
    var pagesHit = data.pages.filter(function (p) { return p.h.indexOf(nq) >= 0; });
    var exact = [], rest = [];
    data.items.forEach(function (it) { if (it.self.indexOf(nq) >= 0) exact.push(it); else if (it.h.indexOf(nq) >= 0) rest.push(it); });
    var hits = exact.concat(rest);
    var html = '';
    if (pagesHit.length) html += '<div class="srch-pages">' + pagesHit.map(function (p) { return '<a href="' + p[0] + '">' + esc(p[2]) + ' ' + esc(p[1]) + ' →</a>'; }).join('') + '</div>';
    html += hits.length
      ? '<p class="srch-hint">' + hits.length + '개 찾았어요 · 누르면 복사</p><div class="grid">' + hits.slice(0, 240).map(function (it) {
          return '<button class="e' + (it[3] ? ' e-label' : '') + '" data-c="' + esc(it[0]) + '" title="' + esc(data.pages[it[1]][1] + ' · ' + it[2]) + '">' + (it[3] ? '<span class="e-l">' + esc(it[3]) + '</span>' : preview(it[0])) + '</button>';
        }).join('') + '</div>'
      : '<p class="srch-hint">검색 결과가 없어요 ( ˘•ω•˘ ) 다른 단어로 찾아보세요</p>';
    out.innerHTML = html;
    track('search', { search_term: q });
  }
  var searchTimer;
  function openSearch(q) {
    if (!srch) {
      srch = document.createElement('div');
      srch.className = 'srch'; srch.setAttribute('role', 'dialog'); srch.setAttribute('aria-label', '이모티콘 검색');
      srch.innerHTML = '<div class="srch-in-wrap"><input class="srch-in" type="search" placeholder="하트, 고양이, 리본, 공백…" aria-label="검색어" enterkeyhint="search"><button type="button" class="srch-x">닫기</button></div><div class="srch-out"></div>';
      document.body.appendChild(srch);
      var inp = $('.srch-in', srch);
      inp.addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(function () { runSearch(inp.value); }, 150); });
      srch.addEventListener('click', function (e) {
        if (e.target.closest('.srch-x')) closeSearch();
        var tg = e.target.closest('[data-q]'); if (tg) { inp.value = tg.dataset.q; runSearch(inp.value); }
      });
    }
    loadIndex();
    srch.hidden = false;
    document.body.classList.add('noscroll');
    var input = $('.srch-in', srch);
    if (q != null) input.value = q;
    runSearch(input.value);
    input.focus();
  }
  function closeSearch() { srch.hidden = true; document.body.classList.remove('noscroll'); }
  document.querySelectorAll('.search-open').forEach(function (b) { b.addEventListener('click', function () { openSearch(); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (srch && !srch.hidden) closeSearch(); if (sheet && !sheet.hidden) closeSheet(); if (!drawer.hidden) setDrawer(false); }
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  var qp = new URLSearchParams(location.search).get('q');
  if (qp) openSearch(qp);

  // 현재 페이지 칩을 보이게
  var on = $('.chips .on');
  if (on) on.parentNode.scrollLeft = on.offsetLeft - on.parentNode.offsetLeft - 16;

  renderDock();
  renderCompose();
})();
