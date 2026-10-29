(function () {
  'use strict';

  const DATA = window.EXAM_DATA;
  const ITEMS = DATA.items;
  const TOTAL = ITEMS.length;
  const KEY = 'liantong-exam-v1';
  const byId = new Map(ITEMS.map(it => [it.id, it]));

  const $ = sel => document.querySelector(sel);
  const view = $('#view');
  const grid = $('#grid');
  const sheetMask = $('#sheetMask');

  let toastTimer = null;

  function defaultState() {
    return {
      answers: {},
      bookmarks: [],
      currentId: ITEMS[0].id,
      mode: 'sequence',
      randomOrder: null,
      reveal: false,
      theme: null,
      openExplain: false,
      materialOpen: true
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const s = Object.assign(defaultState(), JSON.parse(raw));
      if (!byId.has(s.currentId)) s.currentId = ITEMS[0].id;
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  const state = load();

  /* ---------- theme ---------- */
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function effectiveTheme() {
    if (state.theme === 'dark' || state.theme === 'light') return state.theme;
    return media.matches ? 'dark' : 'light';
  }
  function applyTheme() {
    document.documentElement.dataset.theme = effectiveTheme();
    const dark = effectiveTheme() === 'dark';
    $('#themeBtn').innerHTML = dark
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1120' : '#1e3a8a');
  }
  media.addEventListener('change', () => { if (!state.theme) applyTheme(); });

  /* ---------- ordering ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isCorrect(item) {
    const a = state.answers[item.id];
    return a != null && a === item.answer;
  }
  function isWrong(item) {
    const a = state.answers[item.id];
    return a != null && a !== item.answer;
  }

  function buildOrder() {
    if (state.mode === 'random') {
      if (!Array.isArray(state.randomOrder) || state.randomOrder.length !== TOTAL) {
        state.randomOrder = shuffle(ITEMS.map(it => it.id));
        save();
      }
      return state.randomOrder.slice();
    }
    let list = ITEMS.map(it => it.id);
    if (state.mode === 'wrong') list = list.filter(id => isWrong(byId.get(id)));
    if (state.mode === 'marked') list = list.filter(id => state.bookmarks.includes(id));
    return list;
  }

  let order = [];
  let pos = 0;

  function rebuildOrder() {
    order = buildOrder();
    if (!order.length) return false;
    const i = order.indexOf(state.currentId);
    pos = i >= 0 ? i : 0;
    state.currentId = order[pos];
    return true;
  }

  function current() {
    return byId.get(state.currentId);
  }

  /* ---------- stats ---------- */
  function stats() {
    let correct = 0, wrong = 0;
    for (const it of ITEMS) {
      if (isCorrect(it)) correct++;
      else if (isWrong(it)) wrong++;
    }
    return { answered: correct + wrong, correct, wrong };
  }

  function updateHeader() {
    const s = stats();
    $('#progressFill').style.width = (s.answered / TOTAL * 100).toFixed(2) + '%';
    $('#progressText').textContent = `已答 ${s.answered} / ${TOTAL}`;
    $('#accuracyText').textContent = s.answered ? `正确率 ${Math.round(s.correct / s.answered * 100)}%` : '正确率 --';
    $('#navCount').textContent = `${pos + 1}/${order.length}`;
    $('#revealBtn').setAttribute('aria-pressed', state.reveal ? 'true' : 'false');
  }

  /* ---------- render question ---------- */
  function render() {
    const item = current();
    if (!item) {
      view.innerHTML = `<div class="empty"><b>没有符合条件的题目</b><span>换个模式看看吧</span><button id="backSeq">回到顺序练习</button></div>`;
      $('#backSeq').onclick = () => setMode('sequence');
      updateHeader();
      return;
    }

    const given = state.answers[item.id];
    const done = given != null;
    const revealed = state.reveal;
    const show = done || revealed;
    const correct = done && given === item.answer;

    const optionHTML = item.options.map(o => {
      let cls = 'option';
      if (show) {
        if (o.label === item.answer) cls += ' correct';
        else if (o.label === given) cls += ' wrong';
        else cls += ' dim';
      }
      return `<button class="${cls}" data-label="${o.label}" ${show ? 'disabled' : ''}>
        <span class="letter">${o.label}</span>
        <span class="option-content">${o.content || ''}</span>
      </button>`;
    }).join('');

    const materialHTML = item.material
      ? `<section class="material ${state.materialOpen ? 'open' : ''}">
           <button class="material-head" id="materialHead">
             <span>阅读材料${state.materialOpen ? ' · 可上下滚动' : ' · 点击展开'}</span>
             <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
           </button>
           <div class="material-body">${item.material}</div>
         </section>`
      : '';

    let resultHTML = '';
    if (revealed && !done) {
      resultHTML = `<div class="result ok"><span class="badge">✓</span>背题模式 · 正确答案 ${item.answer}</div>`;
    } else if (done) {
      resultHTML = correct
        ? `<div class="result ok"><span class="badge">✓</span>回答正确，正确答案 ${item.answer}<button class="redo-btn" id="redoBtn">重做</button></div>`
        : `<div class="result bad"><span class="badge">!</span>回答错误，你选了 ${given}，正确答案 ${item.answer}<button class="redo-btn" id="redoBtn">重做</button></div>`;
    }

    const explainOpen = state.openExplain || revealed || (done && !correct);
    const explainHTML = explainOpen
      ? `<div class="explanation"><div class="answer-line">正确答案：${item.answer}</div>${item.explanation || '<p class="explain-empty">暂无解析</p>'}</div>`
      : '';

    view.innerHTML = `
      <article class="card">
        <div class="qmeta">
          <div class="qmeta-left">
            <span class="qno">第 ${item.no} 题 <em>/ 共 ${TOTAL} 题</em></span>
            <span class="tag">单选题</span>
            ${item.group ? '<span class="tag group">材料题</span>' : ''}
            ${revealed ? '<span class="tag group">背题中</span>' : ''}
          </div>
          <button class="star ${state.bookmarks.includes(item.id) ? 'on' : ''}" id="starBtn" aria-label="收藏">${state.bookmarks.includes(item.id) ? '★' : '☆'}</button>
        </div>
        ${materialHTML}
        <div class="stem">${item.stem}</div>
        <div class="options">${optionHTML}</div>
        ${resultHTML}
        <button class="explain-toggle ${explainOpen ? 'open' : ''}" id="explainToggle">
          <span>${explainOpen ? '收起解析' : '查看解析'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        ${explainHTML}
      </article>`;

    bindQuestionEvents(item, show);
    updateHeader();
  }

  function bindQuestionEvents(item, locked) {
    document.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (locked) return;
        pick(btn.dataset.label);
      });
    });
    const mh = $('#materialHead');
    if (mh) mh.addEventListener('click', () => {
      state.materialOpen = !state.materialOpen;
      save();
      render();
    });
    const st = $('#starBtn');
    if (st) st.addEventListener('click', () => {
      const i = state.bookmarks.indexOf(item.id);
      if (i >= 0) state.bookmarks.splice(i, 1);
      else state.bookmarks.push(item.id);
      save();
      st.classList.toggle('on');
      st.textContent = state.bookmarks.includes(item.id) ? '★' : '☆';
      toast(state.bookmarks.includes(item.id) ? '已收藏' : '已取消收藏');
      if (state.mode === 'marked') { rebuildOrder(); render(); }
    });
    const et = $('#explainToggle');
    if (et) et.addEventListener('click', () => {
      state.openExplain = !state.openExplain;
      save();
      render();
    });
    const rb = $('#redoBtn');
    if (rb) rb.addEventListener('click', () => {
      delete state.answers[item.id];
      state.openExplain = false;
      save();
      if (state.mode === 'wrong' || state.mode === 'marked') rebuildOrder();
      render();
      toast('已重置本题');
    });
  }

  function pick(label) {
    const item = current();
    if (state.answers[item.id] != null || state.reveal) return;
    state.answers[item.id] = label;
    state.openExplain = true;
    save();
    render();
    const r = document.querySelector('.result');
    if (r && r.getBoundingClientRect().bottom > window.innerHeight) {
      r.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------- navigation ---------- */
  function go(delta) {
    if (!order.length) return;
    const next = pos + delta;
    if (next < 0) return toast('已经是第一题了');
    if (next >= order.length) return toast('已经是最后一题了');
    pos = next;
    state.currentId = order[pos];
    state.openExplain = false;
    save();
    view.scrollTop = 0;
    render();
  }

  function jumpTo(id) {
    let i = order.indexOf(id);
    if (i < 0) {
      if (state.mode !== 'sequence') setMode('sequence');
      i = order.indexOf(id);
      if (i < 0) return;
    }
    pos = i;
    state.currentId = id;
    state.openExplain = false;
    save();
    view.scrollTop = 0;
    render();
  }

  function setMode(mode) {
    const prev = state.mode;
    state.mode = mode;
    if (mode === 'random') state.randomOrder = shuffle(ITEMS.map(it => it.id));
    const ok = rebuildOrder();
    if (!ok) {
      state.mode = prev;
      rebuildOrder();
      toast(mode === 'wrong' ? '还没有错题，先去做几道吧' : mode === 'marked' ? '还没有收藏题目' : '暂无题目');
      return;
    }
    save();
    toast({ sequence: '顺序练习', random: '随机练习', wrong: '错题练习', marked: '收藏练习' }[mode]);
    render();
    renderSheet();
  }

  /* ---------- answer sheet ---------- */
  function renderSheet() {
    const s = stats();
    $('#sheetSub').textContent = `共 ${TOTAL} 题 · 当前第 ${pos + 1} / ${order.length}`;
    $('#sheetStats').innerHTML = `
      <div class="stat"><b>${s.answered}</b><span>已作答</span></div>
      <div class="stat ok"><b>${s.correct}</b><span>答对</span></div>
      <div class="stat bad"><b>${s.wrong}</b><span>答错</span></div>
      <div class="stat"><b>${state.bookmarks.length}</b><span>收藏</span></div>`;

    grid.innerHTML = order.map(id => {
      const it = byId.get(id);
      let cls = 'gcell';
      if (isCorrect(it)) cls += ' correct';
      else if (isWrong(it)) cls += ' wrong';
      if (id === state.currentId) cls += ' current';
      if (it.group) cls += ' grouped';
      return `<button class="${cls}" data-id="${id}">${it.no}</button>`;
    }).join('');

    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });
    const cur = grid.querySelector('.gcell.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  function openSheet() {
    renderSheet();
    sheetMask.hidden = false;
  }
  function closeSheet() {
    sheetMask.hidden = true;
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1600);
  }

  /* ---------- events ---------- */
  function bindGlobal() {
    $('#prevBtn').addEventListener('click', () => go(-1));
    $('#nextBtn').addEventListener('click', () => go(1));
    $('#sheetBtn').addEventListener('click', openSheet);
    $('#closeSheet').addEventListener('click', closeSheet);
    sheetMask.addEventListener('click', e => { if (e.target === sheetMask) closeSheet(); });

    grid.addEventListener('click', e => {
      const cell = e.target.closest('.gcell');
      if (!cell) return;
      closeSheet();
      jumpTo(cell.dataset.id);
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    $('#themeBtn').addEventListener('click', () => {
      state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      save();
      applyTheme();
    });

    $('#revealBtn').addEventListener('click', () => {
      state.reveal = !state.reveal;
      state.openExplain = state.reveal;
      save();
      toast(state.reveal ? '背题模式已开启' : '背题模式已关闭');
      render();
    });

    $('#jumpWrongBtn').addEventListener('click', () => {
      if (!stats().wrong) return toast('还没有错题');
      const start = order.indexOf(state.currentId);
      for (let k = 1; k <= order.length; k++) {
        const i = (start + k) % order.length;
        if (isWrong(byId.get(order[i]))) {
          closeSheet();
          jumpTo(order[i]);
          return;
        }
      }
      toast('没有其他错题了');
    });

    $('#resetBtn').addEventListener('click', () => {
      if (!confirm('确定清空所有答题记录和收藏吗？此操作不可恢复。')) return;
      state.answers = {};
      state.bookmarks = [];
      state.randomOrder = null;
      state.currentId = ITEMS[0].id;
      state.openExplain = false;
      save();
      if (state.mode === 'wrong' || state.mode === 'marked') state.mode = 'sequence';
      rebuildOrder();
      render();
      renderSheet();
      toast('已清空记录');
    });

    document.addEventListener('keydown', e => {
      if (sheetMask.hidden === false && e.key === 'Escape') return closeSheet();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });

    let sx = 0, sy = 0, tracking = false;
    view.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    view.addEventListener('touchmove', e => {
      if (!tracking) return;
      if (Math.abs(e.touches[0].clientX - sx) > 90) tracking = false;
    }, { passive: true });
    view.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        if (dx < 0) go(1); else go(-1);
      }
    }, { passive: true });
  }

  /* ---------- init ---------- */
  function init() {
    if (!Array.isArray(ITEMS) || !ITEMS.length) {
      view.innerHTML = '<div class="empty"><b>题库加载失败</b><span>请刷新页面重试</span></div>';
      return;
    }
    $('#paperTitle').textContent = DATA.title;
    applyTheme();
    rebuildOrder();
    state.currentId = order[pos] || ITEMS[0].id;
    render();
    bindGlobal();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  init();
})();
