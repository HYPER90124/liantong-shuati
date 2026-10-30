(function () {
  'use strict';

  const INDEX = window.EXAM_INDEX;
  const app = document.getElementById('app');
  const KEY = 'liantong-exam-v2';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  if (!INDEX) {
    app.innerHTML = '<div class="empty"><b>数据加载失败</b><span>请刷新页面重试</span></div>';
    return;
  }

  const ICON = {
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    pen: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
    file: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2.8h7l5 5V21H6Z"/><path d="M13 2.8V8h5M9 12h6M9 15.5h6M9 19h4"/></svg>'
  };

  const TYPE_TAG = {
    single: '<span class="tag">单选题</span>',
    multi: '<span class="tag multi">多选题</span>',
    cloze: '<span class="tag multi">完形填空</span>'
  };

  /* ---------- state ---------- */
  function defaultState() {
    return { theme: null, reveal: false, papers: {}, lastPaper: null };
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const s = Object.assign(defaultState(), JSON.parse(raw));
      if (!s.papers || typeof s.papers !== 'object') s.papers = {};
      return s;
    } catch (e) { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  const state = loadState();

  function paperState(id) {
    if (!state.papers[id]) {
      state.papers[id] = { answers: {}, bookmarks: [], currentId: null, mode: 'sequence', randomOrder: null };
    }
    return state.papers[id];
  }
  function storedStats(id) {
    const d = state.papers[id];
    let answered = 0, correct = 0;
    if (d && d.answers) {
      for (const k in d.answers) {
        const r = d.answers[k];
        if (!r) continue;
        answered++;
        if (r.ok) correct++;
      }
    }
    return { answered, correct };
  }
  function overallStats() {
    let answered = 0, correct = 0;
    for (const p of INDEX.papers) {
      const s = storedStats(p.id);
      answered += s.answered;
      correct += s.correct;
    }
    return { answered, correct };
  }

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(n) { return Number(n || 0).toLocaleString('zh-CN'); }
  function fmtSize(b) {
    if (!b) return '';
    if (b >= 1048576) return (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  }
  function metaOf(id) { return INDEX.papers.find(p => p.id === id) || null; }
  function pct(a, b) { return b ? Math.min(100, a / b * 100) : 0; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sortLetters(s) { return String(s || '').split('').filter(Boolean).sort().join(''); }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  /* ---------- theme ---------- */
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function effectiveTheme() {
    if (state.theme === 'dark' || state.theme === 'light') return state.theme;
    return media.matches ? 'dark' : 'light';
  }
  function applyTheme() {
    const theme = effectiveTheme();
    document.documentElement.dataset.theme = theme;
    const svg = theme === 'dark' ? ICON.sun : ICON.moon;
    $$('[data-theme-toggle]').forEach(btn => { btn.innerHTML = svg; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1120' : '#1e3a8a');
  }
  function toggleTheme() {
    state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
  }
  media.addEventListener('change', () => { if (!state.theme) applyTheme(); });

  /* ---------- routing ---------- */
  function parseRoute() {
    const h = decodeURIComponent((location.hash || '').replace(/^#/, '')) || '/';
    if (h === '/' || h === '') return { name: 'home' };
    if (h === '/papers') return { name: 'papers' };
    if (h === '/pdfs') return { name: 'pdfs' };
    const m = /^\/paper\/([A-Za-z0-9_-]+)/.exec(h);
    if (m) return { name: 'quiz', id: m[1] };
    return { name: 'home' };
  }
  function navigate(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  }
  function goBack() {
    const r = parseRoute();
    if (r.name === 'quiz') navigate('#/papers');
    else if (r.name === 'papers' || r.name === 'pdfs') navigate('#/');
    else if (history.length > 1) history.back();
    else navigate('#/');
  }

  let routeToken = 0;
  function renderRoute() {
    const r = parseRoute();
    quizState = null;
    window.scrollTo(0, 0);
    if (r.name === 'home') renderHome();
    else if (r.name === 'papers') renderPapers();
    else if (r.name === 'pdfs') renderPdfs();
    else if (r.name === 'quiz') renderQuizRoute(r.id, ++routeToken);
  }

  /* ---------- common header ---------- */
  function pageHead(title, sub) {
    return `<header class="page-head">
      <button class="head-btn" data-back aria-label="返回">${ICON.back}</button>
      <div class="head-main">
        <h1 class="head-title">${esc(title)}</h1>
        ${sub ? `<div class="head-sub">${esc(sub)}</div>` : ''}
      </div>
      <div class="head-actions"><button class="icon-btn" data-theme-toggle aria-label="切换主题"></button></div>
    </header>`;
  }

  /* ---------- home ---------- */
  function renderHome() {
    const ov = overallStats();
    const last = state.lastPaper ? metaOf(state.lastPaper) : null;
    const lastStats = last ? storedStats(last.id) : null;
    const progress = pct(ov.answered, INDEX.totalQuestions);
    document.title = '联通备考 · 刷题与资料';

    app.innerHTML = `
    <section class="home-hero">
      <div class="hero-inner">
        <div class="hero-top">
          <div class="hero-brand">
            <span class="logo-mark"></span>
            <div>
              <div class="hero-name">联通备考</div>
              <div class="hero-tag">刷题 · 资料 · 离线可用</div>
            </div>
          </div>
          <div class="hero-actions">
            <button class="hero-icon" data-theme-toggle aria-label="切换主题"></button>
          </div>
        </div>
        <h1 class="hero-title">2027 中国联通<br>笔试备考</h1>
        <p class="hero-sub">${INDEX.papers.length} 套题库 · ${fmt(INDEX.totalQuestions)} 道题 · ${INDEX.docs.length} 份资料</p>
        <div class="hero-stats">
          <div class="hero-stat"><b>${fmt(INDEX.totalQuestions)}</b><span>总题数</span></div>
          <div class="hero-stat"><b>${fmt(ov.answered)}</b><span>已作答</span></div>
          <div class="hero-stat"><b>${ov.answered ? Math.round(ov.correct / ov.answered * 100) + '%' : '--'}</b><span>正确率</span></div>
        </div>
      </div>
    </section>

    <div class="home-body">
      <div class="section-label">开始学习</div>

      <a class="action-card" href="#/papers">
        <div class="action-icon practice">${ICON.pen}</div>
        <div class="action-main">
          <div class="action-title">刷题练习</div>
          <div class="action-sub">${INDEX.papers.length} 套 · ${fmt(INDEX.totalQuestions)} 题 · 含答案与解析</div>
        </div>
        <div class="action-arrow">${ICON.chevron}</div>
        <div class="action-progress"><i style="width:${progress.toFixed(1)}%"></i></div>
      </a>

      <a class="action-card pdf" href="#/pdfs">
        <div class="action-icon pdf">${ICON.file}</div>
        <div class="action-main">
          <div class="action-title">PDF 资料库</div>
          <div class="action-sub">${INDEX.docs.length} 份 PDF · 讲义、真题、专业知识</div>
        </div>
        <div class="action-arrow">${ICON.chevron}</div>
      </a>

      ${last ? `<a class="continue-card" href="#/paper/${last.id}">
        <div class="action-icon practice" style="width:42px;height:42px;border-radius:12px">${ICON.pen}</div>
        <div class="cc-main">
          <b>${esc(last.title)}</b>
          <span>上次做到第 ${fmt(lastStats.answered)} / ${fmt(last.count)} 题 · 点击继续</span>
        </div>
        <div class="action-arrow">${ICON.chevron}</div>
      </a>` : ''}

      <div class="home-note">做题记录只保存在本机浏览器。<br>内容整理自原课程，仅供个人学习使用。</div>
    </div>`;
    applyTheme();
  }

  /* ---------- papers ---------- */
  let paperFilter = '全部';
  let paperQuery = '';

  function renderPapers() {
    const ov = overallStats();
    document.title = '刷题练习 · 联通备考';
    app.innerHTML = `
      ${pageHead('刷题练习', `${INDEX.papers.length} 套 · ${fmt(INDEX.totalQuestions)} 题`)}
      <div class="page-body">
        <div class="overview-card">
          <div class="ov-row">
            <span class="ov-title">总体进度</span>
            <span class="ov-num"><b>${fmt(ov.answered)}</b> / ${fmt(INDEX.totalQuestions)}</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct(ov.answered, INDEX.totalQuestions).toFixed(1)}%"></div></div>
        </div>

        <div class="tabs" id="paperTabs">
          ${['全部'].concat(INDEX.groups).map(g => `<button class="tab ${g === paperFilter ? 'active' : ''}" data-group="${esc(g)}">${esc(g)}</button>`).join('')}
        </div>

        <div class="search-box">
          ${ICON.search}
          <input id="paperSearch" type="search" placeholder="搜索试卷名称" autocomplete="off" value="${esc(paperQuery)}">
        </div>

        <div id="paperList"></div>
      </div>`;
    applyTheme();
    renderPaperList();

    $('#paperTabs').addEventListener('click', e => {
      const b = e.target.closest('.tab');
      if (!b) return;
      paperFilter = b.dataset.group;
      $$('#paperTabs .tab').forEach(t => t.classList.toggle('active', t === b));
      renderPaperList();
    });
    const input = $('#paperSearch');
    input.addEventListener('input', () => { paperQuery = input.value; renderPaperList(); });
  }

  const GROUP_CLASS = { '历年真题': '', '模拟卷': 'mock', '专项练习': 'exercise' };

  function renderPaperList() {
    const list = $('#paperList');
    if (!list) return;
    const q = paperQuery.trim().toLowerCase();
    const papers = INDEX.papers.filter(p =>
      (paperFilter === '全部' || p.group === paperFilter) &&
      (!q || p.title.toLowerCase().includes(q))
    );
    if (!papers.length) {
      list.innerHTML = `<div class="empty"><b>没有找到试卷</b><span>换个关键词试试</span></div>`;
      return;
    }
    list.innerHTML = papers.map(p => {
      const st = storedStats(p.id);
      const pctv = pct(st.answered, p.count);
      const unit = p.blanks && p.blanks > p.count ? `${p.count} 篇 · ${p.blanks} 空` : `${p.count} 题`;
      const go = st.answered === 0 ? '开始' : st.answered >= p.count ? '复习' : '继续';
      return `<a class="paper-card" href="#/paper/${p.id}">
        <div class="pc-top">
          <span class="pc-group ${GROUP_CLASS[p.group] || ''}">${esc(p.group)}</span>
          <span class="pc-count">${unit}</span>
        </div>
        <h3 class="pc-title">${esc(p.title)}</h3>
        <div class="pc-progress"><i style="width:${pctv.toFixed(1)}%"></i></div>
        <div class="pc-meta">
          <span>${st.answered ? `已答 ${fmt(st.answered)}/${fmt(p.count)}` : '尚未开始'}</span>
          ${st.answered ? `<span>正确率 ${Math.round(st.correct / st.answered * 100)}%</span>` : ''}
          <span class="pc-go ${st.answered >= p.count ? 'pc-done' : ''}">${go} ›</span>
        </div>
      </a>`;
    }).join('');
  }

  /* ---------- pdfs ---------- */
  let pdfQuery = '';
  function renderPdfs() {
    document.title = 'PDF 资料库 · 联通备考';
    const totalSize = INDEX.docs.reduce((s, d) => s + (d.size || 0), 0);
    app.innerHTML = `
      ${pageHead('PDF 资料库', `${INDEX.docs.length} 份 · ${fmtSize(totalSize)}`)}
      <div class="page-body">
        <div class="pdf-hero">
          <h2>课程配套 PDF</h2>
          <p>点击即可在原站打开 / 下载。首次打开需联网，建议在 Wi-Fi 下查看。</p>
        </div>
        <div class="search-box">
          ${ICON.search}
          <input id="pdfSearch" type="search" placeholder="搜索资料名称" autocomplete="off" value="${esc(pdfQuery)}">
        </div>
        <div id="pdfList"></div>
      </div>`;
    applyTheme();
    renderPdfList();
    const input = $('#pdfSearch');
    input.addEventListener('input', () => { pdfQuery = input.value; renderPdfList(); });
  }

  function renderPdfList() {
    const list = $('#pdfList');
    if (!list) return;
    const q = pdfQuery.trim().toLowerCase();
    const docs = INDEX.docs.filter(d => !q || d.title.toLowerCase().includes(q) || d.group.toLowerCase().includes(q));
    if (!docs.length) {
      list.innerHTML = `<div class="empty"><b>没有找到资料</b><span>换个关键词试试</span></div>`;
      return;
    }
    const order = [];
    const map = new Map();
    for (const d of docs) {
      if (!map.has(d.group)) { map.set(d.group, []); order.push(d.group); }
      map.get(d.group).push(d);
    }
    list.innerHTML = order.map(g => `
      <section class="pdf-group">
        <div class="pdf-group-head"><h3>${esc(g)}</h3><span>${map.get(g).length} 份</span></div>
        ${map.get(g).map(d => `<a class="doc" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">
          <span class="doc-icon">PDF</span>
          <span class="doc-main">
            <span class="doc-title">${esc(d.title)}</span>
            <span class="doc-meta">${fmtSize(d.size)}${d.size ? ' · ' : ''}${esc(d.group)}</span>
          </span>
          <span class="doc-open">${ICON.chevron}</span>
        </a>`).join('')}
      </section>`).join('');
  }

  /* ---------- quiz ---------- */
  let quizState = null;
  const paperPromises = {};

  function loadPaper(id) {
    if (window.EXAM_PAPERS && window.EXAM_PAPERS[id]) return Promise.resolve(window.EXAM_PAPERS[id]);
    if (paperPromises[id]) return paperPromises[id];
    paperPromises[id] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './data/papers/' + id + '.js';
      s.onload = () => {
        const p = window.EXAM_PAPERS && window.EXAM_PAPERS[id];
        if (p) resolve(p);
        else { delete paperPromises[id]; reject(new Error('题库为空')); }
      };
      s.onerror = () => { delete paperPromises[id]; reject(new Error('网络错误')); };
      document.head.appendChild(s);
    });
    return paperPromises[id];
  }

  function renderQuizRoute(id, token) {
    const meta = metaOf(id);
    if (!meta) {
      app.innerHTML = `${pageHead('刷题练习', '')}<div class="empty"><b>没有找到这套试卷</b><button onclick="location.hash='#/papers'">返回列表</button></div>`;
      applyTheme();
      return;
    }
    document.title = meta.title + ' · 联通备考';
    app.innerHTML = `
      <header class="quiz-head">
        <div class="qh-row">
          <button class="head-btn" data-back aria-label="返回">${ICON.back}</button>
          <div class="qh-mid"><div class="qh-title">${esc(meta.title)}</div><div class="qh-sub">正在加载…</div></div>
          <button class="icon-btn" data-theme-toggle aria-label="切换主题"></button>
        </div>
        <div class="quiz-progress"><i style="width:0%"></i></div>
      </header>
      <div class="loading"><div class="spinner"></div>正在加载题库…</div>`;
    applyTheme();

    loadPaper(id).then(paper => {
      if (token !== routeToken) return;
      startQuiz(paper);
    }).catch(err => {
      if (token !== routeToken) return;
      app.innerHTML = `${pageHead(meta.title, '加载失败')}
        <div class="empty"><b>题库加载失败</b><span>${esc(err.message || '请检查网络后重试')}</span>
        <button id="retryLoad">重新加载</button></div>`;
      applyTheme();
      const btn = $('#retryLoad');
      if (btn) btn.addEventListener('click', () => { delete paperPromises[id]; renderQuizRoute(id, ++routeToken); });
    });
  }

  function startQuiz(paper) {
    const ps = paperState(paper.id);
    const byId = new Map(paper.items.map(it => [it.id, it]));
    if (!ps.currentId || !byId.has(ps.currentId)) ps.currentId = paper.items[0].id;
    quizState = {
      paper, byId, ps,
      order: [], pos: 0,
      draftMulti: new Set(),
      draftCloze: {},
      openExplain: false,
      materialOpen: true
    };
    state.lastPaper = paper.id;
    saveState();
    rebuildOrder();
    renderQuizShell();
    renderQuestion();
  }

  function rebuildOrder() {
    if (!quizState) return false;
    const { paper, ps } = quizState;
    let ids = paper.items.map(it => it.id);
    if (ps.mode === 'random') {
      if (!Array.isArray(ps.randomOrder) || ps.randomOrder.length !== ids.length) {
        ps.randomOrder = shuffle(ids);
        saveState();
      }
      ids = ps.randomOrder.slice();
    } else if (ps.mode === 'wrong') {
      ids = ids.filter(id => ps.answers[id] && ps.answers[id].ok === false);
    } else if (ps.mode === 'marked') {
      ids = ids.filter(id => ps.bookmarks.indexOf(id) >= 0);
    }
    quizState.order = ids;
    let i = ids.indexOf(ps.currentId);
    if (i < 0) {
      i = 0;
      if (ids.length) ps.currentId = ids[0];
    }
    quizState.pos = i;
    return ids.length > 0;
  }

  function renderQuizShell() {
    const { paper } = quizState;
    app.innerHTML = `
      <header class="quiz-head">
        <div class="qh-row">
          <button class="head-btn" data-back aria-label="返回">${ICON.back}</button>
          <div class="qh-mid">
            <div class="qh-title">${esc(paper.title)}</div>
            <div class="qh-sub" id="qhSub"></div>
          </div>
          <button class="icon-btn" id="revealBtn" aria-pressed="${state.reveal ? 'true' : 'false'}" aria-label="背题模式">${ICON.eye}</button>
          <button class="icon-btn" data-theme-toggle aria-label="切换主题"></button>
        </div>
        <div class="quiz-progress"><i id="qProgress"></i></div>
      </header>

      <main class="qmain" id="qmain"><article class="card" id="qcard"></article></main>

      <nav class="bottombar">
        <button class="nav-btn" id="prevBtn">${ICON.back}<span>上一题</span></button>
        <button class="nav-btn primary" id="sheetBtn"><span>答题卡</span><span class="nav-count" id="navCount">1/1</span></button>
        <button class="nav-btn" id="nextBtn"><span>下一题</span>${ICON.chevron}</button>
      </nav>

      <div class="sheet-mask" id="sheetMask" hidden>
        <section class="sheet" role="dialog" aria-modal="true" aria-label="答题卡">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><div class="sheet-title">答题卡</div><div class="sheet-sub" id="sheetSub"></div></div>
            <button class="close-btn" id="closeSheet" aria-label="关闭">✕</button>
          </div>
          <div class="sheet-stats" id="sheetStats"></div>
          <div class="mode-row">
            <button class="mode-btn" data-mode="sequence">顺序</button>
            <button class="mode-btn" data-mode="random">随机</button>
            <button class="mode-btn" data-mode="wrong">错题</button>
            <button class="mode-btn" data-mode="marked">收藏</button>
          </div>
          <div class="legend">
            <span><i class="lg correct"></i>答对</span>
            <span><i class="lg wrong"></i>答错</span>
            <span><i class="lg none"></i>未答</span>
            <span><i class="lg current"></i>当前</span>
          </div>
          <div class="grid-scroll"><div class="grid" id="grid"></div></div>
          <div class="sheet-actions">
            <button class="ghost-btn" id="resetBtn">清空本套</button>
            <button class="ghost-btn" id="jumpWrongBtn">下一道错题</button>
          </div>
        </section>
      </div>`;

    applyTheme();
    bindQuizEvents();
    updateQuizHeader();
  }

  function bindQuizEvents() {
    $('#prevBtn').addEventListener('click', () => go(-1));
    $('#nextBtn').addEventListener('click', () => go(1));
    $('#sheetBtn').addEventListener('click', openSheet);
    $('#closeSheet').addEventListener('click', closeSheet);
    $('#sheetMask').addEventListener('click', e => { if (e.target.id === 'sheetMask') closeSheet(); });
    $('#revealBtn').addEventListener('click', () => {
      state.reveal = !state.reveal;
      if (state.reveal) quizState.openExplain = true;
      saveState();
      toast(state.reveal ? '背题模式已开启' : '背题模式已关闭');
      renderQuestion();
    });
    $$('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    $('#grid').addEventListener('click', e => {
      const cell = e.target.closest('.gcell');
      if (!cell) return;
      closeSheet();
      jumpTo(cell.dataset.id);
    });
    $('#jumpWrongBtn').addEventListener('click', jumpWrong);
    $('#resetBtn').addEventListener('click', resetPaper);
  }

  function onKey(e) {
    if (!quizState) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (!$('#sheetMask').hidden) { if (e.key === 'Escape') closeSheet(); return; }
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  }

  function currentItem() {
    if (!quizState || !quizState.order.length) return null;
    return quizState.byId.get(quizState.order[quizState.pos]) || null;
  }

  function updateQuizHeader() {
    if (!quizState) return;
    const { paper, order, pos } = quizState;
    const st = storedStats(paper.id);
    const sub = $('#qhSub');
    if (sub) sub.textContent = `${order.length ? pos + 1 : 0}/${order.length} · 已答 ${st.answered}/${paper.items.length}${st.answered ? ' · 正确率 ' + Math.round(st.correct / st.answered * 100) + '%' : ''}`;
    const bar = $('#qProgress');
    if (bar) bar.style.width = pct(st.answered, paper.items.length).toFixed(1) + '%';
    const nc = $('#navCount');
    if (nc) nc.textContent = `${order.length ? pos + 1 : 0}/${order.length}`;
    const rb = $('#revealBtn');
    if (rb) rb.setAttribute('aria-pressed', state.reveal ? 'true' : 'false');
  }

  function renderQuestion() {
    const card = $('#qcard');
    if (!card) return;
    const item = currentItem();
    if (!item) {
      card.innerHTML = `<div class="empty"><b>没有符合条件的题目</b><span>换个模式看看吧</span><button data-seq>回到顺序练习</button></div>`;
      const b = card.querySelector('[data-seq]');
      if (b) b.addEventListener('click', () => setMode('sequence'));
      updateQuizHeader();
      return;
    }

    const { ps } = quizState;
    const rec = ps.answers[item.id] || null;
    const reveal = state.reveal;
    const show = !!rec || reveal;

    let body = '';
    if (item.type === 'cloze') body = renderCloze(item, rec, show, reveal);
    else body = renderChoice(item, rec, show, reveal);

    const starOn = ps.bookmarks.indexOf(item.id) >= 0;
    const typeTag = TYPE_TAG[item.type] || TYPE_TAG.single;
    const materialLabel = item.type === 'cloze' ? '阅读材料' : '材料';

    card.innerHTML = `
      <div class="qmeta">
        <div class="qmeta-left">
          <span class="qno">第 ${item.no} 题 <em>/ 共 ${quizState.paper.items.length} 题</em></span>
          ${typeTag}
          ${item.material ? `<span class="tag group">${materialLabel}</span>` : ''}
          ${reveal ? '<span class="tag group">背题中</span>' : ''}
        </div>
        <button class="star ${starOn ? 'on' : ''}" id="starBtn" aria-label="收藏">${starOn ? '★' : '☆'}</button>
      </div>
      ${item.material ? `<section class="material ${quizState.materialOpen ? 'open' : ''}">
        <button class="material-head" id="materialHead">
          <span>${materialLabel}${quizState.materialOpen ? ' · 可上下滚动' : ' · 点击展开'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="material-body">${item.material}</div>
      </section>` : ''}
      ${item.stem ? `<div class="stem">${item.stem}</div>` : ''}
      ${body}
      ${item.type !== 'cloze' ? renderExplanationToggle(item, rec, reveal) : ''}`;

    bindQuestionEvents(item, rec, show);
    updateQuizHeader();
  }

  function renderChoice(item, rec, show, reveal) {
    const given = rec ? rec.v : '';
    const selected = quizState.draftMulti;
    const isMulti = item.type === 'multi';
    const opts = item.options || [];
    const answerSet = item.answer;

    const optionHTML = opts.map(o => {
      let cls = 'option';
      if (show) {
        const isAns = answerSet.indexOf(o.label) >= 0;
        if (isAns) cls += ' correct';
        else if (isMulti ? String(given).indexOf(o.label) >= 0 : o.label === given) cls += ' wrong';
        else cls += ' dim';
      } else if (isMulti && selected.has(o.label)) {
        cls += ' selected';
      }
      return `<button class="${cls}" data-label="${esc(o.label)}" ${show ? 'disabled' : ''}>
        <span class="letter">${esc(o.label)}</span>
        <span class="option-content">${o.content || ''}</span>
      </button>`;
    }).join('');

    let submitHTML = '';
    if (isMulti && !show) {
      const can = selected.size > 0;
      submitHTML = `<div class="submit-row"><button class="submit-btn" id="submitMulti" ${can ? '' : 'disabled'}>提交答案${can ? '（' + [...selected].sort().join('') + '）' : ''}</button></div>
        <div class="submit-hint">多选题：选出所有正确选项后提交</div>`;
    }

    let resultHTML = '';
    if (rec) {
      const ok = rec.ok;
      const givenText = isMulti ? String(rec.v).split('').join('、') : rec.v;
      resultHTML = `<div class="result ${ok ? 'ok' : 'bad'}">
        <span class="badge">${ok ? '✓' : '!'}</span>
        ${ok ? '回答正确' : `回答错误，你选了 ${esc(givenText)}`}，正确答案 ${esc(item.answer.split('').join('、'))}
        <button class="redo-btn" id="redoBtn">重做</button>
      </div>`;
    } else if (reveal) {
      resultHTML = `<div class="result ok"><span class="badge">✓</span>背题模式 · 正确答案 ${esc(item.answer.split('').join('、'))}</div>`;
    }

    return `
      <div class="options" id="options">${optionHTML}</div>
      ${submitHTML}
      ${resultHTML}`;
  }

  function renderExplanationToggle(item, rec, reveal) {
    const open = quizState.openExplain || reveal || (rec && !rec.ok);
    if (rec || reveal) {
      return `<button class="explain-toggle ${open ? 'open' : ''}" id="explainToggle">
        <span>${open ? '收起解析' : '查看解析'}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div id="explainSlot">${open ? renderExplanation(item) : ''}</div>`;
    }
    return '';
  }

  function renderExplanation(item) {
    return `<div class="explanation">
      <div class="answer-line">正确答案：${esc(item.answer.split('').join('、'))}</div>
      ${item.explanation || '<p class="explain-empty">暂无解析</p>'}
    </div>`;
  }

  function renderCloze(item, rec, show, reveal) {
    const bank = item.bank && item.bank.length
      ? item.bank
      : 'ABCDEFGHIJKLMNO'.split('').map(l => ({ label: l, word: '' }));
    const blanks = item.blanks || [];
    let right = 0;
    if (rec) blanks.forEach(b => { if ((rec.v && rec.v[b.no]) === b.answer) right++; });

    const rows = blanks.map(b => {
      const val = rec ? (rec.v[b.no] || '') : (reveal ? b.answer : (quizState.draftCloze[b.no] || ''));
      const ok = show ? val === b.answer : null;
      const cls = show ? (ok ? 'correct' : 'wrong') : '';
      const opts = bank.map(o => `<option value="${esc(o.label)}" ${val === o.label ? 'selected' : ''}>${esc(o.label)}${o.word ? ' · ' + esc(o.word) : ''}</option>`).join('');
      return `<div class="blank-block">
        <div class="blank-row ${cls}">
          <span class="blank-no">第 ${b.no} 空</span>
          <select class="blank-select" data-blank="${b.no}" ${show ? 'disabled' : ''}>
            <option value="">请选择</option>${opts}
          </select>
          ${show ? `<span class="blank-mark">${ok ? '✓' : '✗ ' + esc(b.answer)}</span>` : ''}
        </div>
        ${show && b.explanation ? `<details class="blank-exp" ${ok ? '' : 'open'}><summary>解析</summary>${b.explanation}</details>` : ''}
      </div>`;
    }).join('');

    const bankHTML = bank.some(b => b.word) ? `<div class="bank">
      <div class="bank-title">备选词汇</div>
      <div class="bank-grid">${bank.map(b => `<div class="bank-item"><b>${esc(b.label)}.</b>${esc(b.word)}</div>`).join('')}</div>
    </div>` : '';

    let submitHTML = '';
    if (!show) {
      const allChosen = blanks.every(b => quizState.draftCloze[b.no]);
      submitHTML = `<div class="submit-row"><button class="submit-btn" id="submitCloze" ${allChosen ? '' : 'disabled'}>提交答案</button></div>
        <div class="submit-hint">${allChosen ? '已选完，点击提交' : '请为每个空选择答案'}</div>`;
    }

    let resultHTML = '';
    if (rec) {
      const allOk = right === blanks.length;
      resultHTML = `<div class="result ${allOk ? 'ok' : 'bad'}">
        <span class="badge">${allOk ? '✓' : '!'}</span>
        答对 ${right} / ${blanks.length} 空
        <button class="redo-btn" id="redoBtn">重做</button>
      </div>`;
    } else if (reveal) {
      resultHTML = `<div class="result ok"><span class="badge">✓</span>背题模式 · 答案已显示</div>`;
    }

    return `${bankHTML}<div class="blank-list">${rows}</div>${submitHTML}${resultHTML}`;
  }

  function bindQuestionEvents(item, rec, show) {
    const opts = $('#options');
    if (opts) {
      opts.addEventListener('click', e => {
        const btn = e.target.closest('.option');
        if (!btn) return;
        if (show) return;
        const label = btn.dataset.label;
        if (item.type === 'multi') {
          const set = quizState.draftMulti;
          if (set.has(label)) set.delete(label); else set.add(label);
          btn.classList.toggle('selected', set.has(label));
          const sb = $('#submitMulti');
          if (sb) {
            sb.disabled = set.size === 0;
            sb.textContent = set.size ? `提交答案（${[...set].sort().join('')}）` : '提交答案';
          }
        } else {
          pickSingle(item, label);
        }
      });
    }

    const sm = $('#submitMulti');
    if (sm) sm.addEventListener('click', () => submitMulti(item));

    const sc = $('#submitCloze');
    if (sc) sc.addEventListener('click', () => submitCloze(item));
    $$('.blank-select').forEach(sel => {
      sel.addEventListener('change', () => {
        quizState.draftCloze[sel.dataset.blank] = sel.value;
        const all = (item.blanks || []).every(b => quizState.draftCloze[b.no]);
        const btn = $('#submitCloze');
        if (btn) btn.disabled = !all;
      });
    });

    const mh = $('#materialHead');
    if (mh) mh.addEventListener('click', () => {
      quizState.materialOpen = !quizState.materialOpen;
      renderQuestion();
    });

    const st = $('#starBtn');
    if (st) st.addEventListener('click', () => {
      const ps = quizState.ps;
      const i = ps.bookmarks.indexOf(item.id);
      if (i >= 0) ps.bookmarks.splice(i, 1); else ps.bookmarks.push(item.id);
      saveState();
      st.classList.toggle('on', ps.bookmarks.indexOf(item.id) >= 0);
      st.textContent = ps.bookmarks.indexOf(item.id) >= 0 ? '★' : '☆';
      toast(ps.bookmarks.indexOf(item.id) >= 0 ? '已收藏' : '已取消收藏');
      if (ps.mode === 'marked') { rebuildOrder(); renderQuestion(); }
    });

    const et = $('#explainToggle');
    if (et) et.addEventListener('click', () => {
      quizState.openExplain = !quizState.openExplain;
      const slot = $('#explainSlot');
      const open = quizState.openExplain;
      et.classList.toggle('open', open);
      et.querySelector('span').textContent = open ? '收起解析' : '查看解析';
      if (slot) slot.innerHTML = open ? renderExplanation(item) : '';
    });

    const rb = $('#redoBtn');
    if (rb) rb.addEventListener('click', () => {
      delete quizState.ps.answers[item.id];
      quizState.openExplain = false;
      quizState.draftMulti = new Set();
      quizState.draftCloze = {};
      saveState();
      if (quizState.ps.mode === 'wrong' || quizState.ps.mode === 'marked') rebuildOrder();
      renderQuestion();
      toast('已重置本题');
    });
  }

  function pickSingle(item, label) {
    const ps = quizState.ps;
    if (ps.answers[item.id] || state.reveal) return;
    ps.answers[item.id] = { v: label, ok: label === item.answer };
    quizState.openExplain = true;
    saveState();
    renderQuestion();
    scrollToResult();
  }

  function submitMulti(item) {
    const ps = quizState.ps;
    const selected = [...quizState.draftMulti].sort().join('');
    if (!selected) return toast('请先选择答案');
    ps.answers[item.id] = { v: selected, ok: sortLetters(selected) === sortLetters(item.answer) };
    quizState.openExplain = true;
    saveState();
    renderQuestion();
    scrollToResult();
  }

  function submitCloze(item) {
    const ps = quizState.ps;
    const blanks = item.blanks || [];
    const vals = {};
    let all = true;
    let okAll = true;
    for (const b of blanks) {
      const v = quizState.draftCloze[b.no] || '';
      if (!v) all = false;
      vals[b.no] = v;
      if (v !== b.answer) okAll = false;
    }
    if (!all) return toast('请为每个空选择答案');
    ps.answers[item.id] = { v: vals, ok: okAll };
    saveState();
    renderQuestion();
    scrollToResult();
  }

  function scrollToResult() {
    const r = document.querySelector('.result');
    if (!r) return;
    const rect = r.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 90) {
      window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: 'smooth' });
    }
  }

  /* ---------- quiz navigation ---------- */
  function go(delta) {
    if (!quizState) return;
    const { order, pos, ps } = quizState;
    if (!order.length) return;
    const next = pos + delta;
    if (next < 0) return toast('已经是第一题了');
    if (next >= order.length) return toast('已经是最后一题了');
    quizState.pos = next;
    ps.currentId = order[next];
    quizState.draftMulti = new Set();
    quizState.draftCloze = {};
    quizState.openExplain = false;
    saveState();
    window.scrollTo(0, 0);
    renderQuestion();
  }

  function jumpTo(id) {
    const { order, ps } = quizState;
    let i = order.indexOf(id);
    if (i < 0) {
      if (ps.mode !== 'sequence') { ps.mode = 'sequence'; rebuildOrder(); }
      i = order.indexOf(id);
      if (i < 0) return;
    }
    quizState.pos = i;
    ps.currentId = id;
    quizState.draftMulti = new Set();
    quizState.draftCloze = {};
    quizState.openExplain = false;
    saveState();
    window.scrollTo(0, 0);
    renderQuestion();
  }

  function setMode(mode) {
    if (!quizState) return;
    const { ps } = quizState;
    const prev = ps.mode;
    ps.mode = mode;
    const ok = rebuildOrder();
    if (!ok) {
      ps.mode = prev;
      rebuildOrder();
      toast(mode === 'wrong' ? '还没有错题，先去做几道吧' : mode === 'marked' ? '还没有收藏题目' : '暂无题目');
      renderSheet();
      return;
    }
    saveState();
    toast({ sequence: '顺序练习', random: '随机练习', wrong: '错题练习', marked: '收藏练习' }[mode]);
    quizState.draftMulti = new Set();
    quizState.draftCloze = {};
    quizState.openExplain = false;
    renderQuestion();
    renderSheet();
  }

  /* ---------- answer sheet ---------- */
  function openSheet() {
    if (!quizState) return;
    renderSheet();
    $('#sheetMask').hidden = false;
  }
  function closeSheet() {
    const m = $('#sheetMask');
    if (m) m.hidden = true;
  }

  function renderSheet() {
    if (!quizState) return;
    const { paper, ps, order, pos } = quizState;
    const st = storedStats(paper.id);
    const wrong = st.answered - st.correct;
    $('#sheetSub').textContent = `共 ${paper.items.length} 题 · 当前第 ${order.length ? pos + 1 : 0} / ${order.length}`;
    $('#sheetStats').innerHTML = `
      <div class="stat"><b>${st.answered}</b><span>已作答</span></div>
      <div class="stat ok"><b>${st.correct}</b><span>答对</span></div>
      <div class="stat bad"><b>${wrong}</b><span>答错</span></div>
      <div class="stat"><b>${ps.bookmarks.length}</b><span>收藏</span></div>`;

    $('#grid').innerHTML = order.map(id => {
      const it = quizState.byId.get(id);
      const rec = ps.answers[id];
      let cls = 'gcell';
      if (rec) cls += rec.ok ? ' correct' : ' wrong';
      if (id === ps.currentId) cls += ' current';
      if (it.material) cls += ' grouped';
      return `<button class="${cls}" data-id="${id}">${it.no}</button>`;
    }).join('');

    $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === ps.mode));
    const cur = $('#grid .gcell.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  function jumpWrong() {
    if (!quizState) return;
    const { ps, order } = quizState;
    const idx = order.findIndex(id => ps.answers[id] && ps.answers[id].ok === false);
    if (idx < 0) return toast('本套试卷还没有错题');
    closeSheet();
    jumpTo(order[idx]);
  }

  function resetPaper() {
    if (!quizState) return;
    if (!confirm('确定清空本套试卷的答题记录和收藏吗？')) return;
    const { paper, ps } = quizState;
    ps.answers = {};
    ps.bookmarks = [];
    ps.currentId = paper.items[0].id;
    ps.randomOrder = null;
    ps.mode = 'sequence';
    saveState();
    rebuildOrder();
    renderQuestion();
    renderSheet();
    toast('已清空本套记录');
  }

  /* ---------- swipe ---------- */
  let sx = 0, sy = 0, tracking = false;
  document.addEventListener('touchstart', e => {
    if (!quizState || e.touches.length !== 1) return;
    if (e.target.closest('.material-body, select, .sheet-mask, .bottombar')) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!tracking) return;
    if (Math.abs(e.touches[0].clientX - sx) > 90) tracking = false;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0) go(1); else go(-1);
    }
  }, { passive: true });

  /* ---------- global events ---------- */
  document.addEventListener('click', e => {
    const th = e.target.closest('[data-theme-toggle]');
    if (th) { toggleTheme(); return; }
    const bk = e.target.closest('[data-back]');
    if (bk) { e.preventDefault(); goBack(); }
  });

  window.addEventListener('hashchange', () => {
    routeToken++;
    renderRoute();
  });

  /* ---------- init ---------- */
  document.addEventListener('keydown', onKey);
  applyTheme();
  renderRoute();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
