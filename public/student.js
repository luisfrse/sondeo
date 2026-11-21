(function () {
  'use strict';
  var m = document.getElementById('m');
  var t = function (k, v) { return I18N.t(k, v); };
  var h = UI.h, icon = UI.icon;
  var code = (location.pathname.match(/\/s\/(\d{5})/) || [])[1];
  var cid; try { cid = localStorage.getItem('sondeo.cid'); if (!cid) { cid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sondeo.cid', cid); } } catch (_) { cid = Math.random().toString(36).slice(2); }

  var ws, state = null, mine = null, qa = [], count = 0, retry = 0, ended = null, connected = false, localAns = {}, typed = '';
  var V = null, curKey = '';

  var redrawTools = UI.tools(document.getElementById('tools'), function () { curKey = ''; render(); });
  document.getElementById('tools').__extra = function () {
    if (!code) return [];
    var txt = ended ? t('closed') : connected ? t('code_pill', { c: code }) : (retry ? t('reconnecting') : t('connecting'));
    return [h('span', { class: 'dc-chip dc-chip--dot ' + (connected && !ended ? 'dc-chip--ok' : 'dc-chip--warn'), role: 'status', text: txt })];
  };
  function pill() { redrawTools(); }

  /* ---------- entrar con el codigo de la sesion ---------- */
  function joinForm() {
    var inp = h('input', { class: 'dc-input dc-input--code', id: 'jc', type: 'text', inputmode: 'numeric', maxlength: 5, placeholder: '12345', autocomplete: 'off', 'aria-describedby': 'jerr' });
    var err = h('div', { id: 'jerr', class: 'sd-msg', 'aria-live': 'assertive' });
    var b = h('button', { type: 'submit', class: 'dc-btn dc-btn--primary dc-btn--lg dc-btn--block', text: t('enter') });
    var form = h('form', { class: 'sd-join', novalidate: true }, h('h1', { text: t('enter_code') }), h('p', { class: 'dc-muted', text: t('code_help') }),
      h('div', { class: 'dc-field' }, h('label', { class: 'dc-label dc-sr-only', for: 'jc', text: t('enter_code') }), inp), err, b);
    function go() {
      var c = inp.value.replace(/\D/g, '');
      if (c.length !== 5) { err.replaceChildren(UI.alertBox('danger', t('code_bad'))); inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      b.setAttribute('aria-busy', 'true'); b.disabled = true;
      fetch('/api/exists?c=' + c).then(function (r) { return r.json(); }).then(function (j) {
        if (j.ok) location.href = '/s/' + c;
        else { err.replaceChildren(UI.alertBox('danger', t('code_bad'))); inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
      }).catch(function () { err.replaceChildren(UI.alertBox('danger', t('err_net'))); }).then(function () { b.removeAttribute('aria-busy'); b.disabled = false; });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); go(); });
    inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(0, 5); inp.removeAttribute('aria-invalid'); if (inp.value.length === 5) go(); });
    return { root: form, focus: inp };
  }

  /* ---------- conexion ---------- */
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = function () { retry = 0; connected = true; ws.send(JSON.stringify({ t: 'hello', code: code, cid: cid })); pill(); };
    ws.onmessage = function (ev) {
      var d = JSON.parse(ev.data);
      if (d.t === 'state') { var ch = !state || state.idx !== d.idx; state = d; if (ch) { mine = null; qa = []; } render(); }
      else if (d.t === 'mine') { if (state && state.slide && state.slide.id === d.id) { mine = d.v; update(); } }
      else if (d.t === 'ack') { mine = d.v; update(); }
      else if (d.t === 'qa') { if (state && state.slide && state.slide.id === d.id) { qa = d.list; renderQA(); } }
      else if (d.t === 'count') { count = d.total; if (V && V.cnt) V.cnt.textContent = cntTxt(); }
      else if (d.t === 'limit') { if (V && V.ok) setOk('warn', t(state && state.slide && state.slide.type === 'preguntes' ? 'ask_none' : 'max_msgs')); }
      else if (d.t === 'ended') { ended = d.why; render(); pill(); }
    };
    ws.onclose = function () { connected = false; if (ended) return; retry++; pill(); setTimeout(connect, Math.min(5000, 600 * retry)); };
  }
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function cntTxt() { return count ? (count === 1 ? t('n_answer1') : t('n_answers', { n: count })) : ''; }
  function setOk(kind, text) { if (!V || !V.ok) return; V.ok.replaceChildren(text ? UI.alertBox(kind, text, 'status') : ''); }

  /* ---------- pantallas: se construyen una vez por diapositiva y despues solo se actualizan sus partes (no se pierde lo escrito ni salta la pagina) ---------- */
  function keyNow() {
    if (!code) return 'join';
    if (ended) return 'ended:' + ended;
    var s = state && state.slide;
    if (!s || !state.open) return 'wait:' + (s ? s.id : 'none');
    return 'q:' + s.id + ':' + s.type;
  }
  function build(key) {
    var s = state && state.slide; V = {};
    if (key === 'join') { var j = joinForm(); m.replaceChildren(j.root); V.focus = j.focus; return; }
    if (key.indexOf('ended:') === 0) {
      m.replaceChildren(h('div', { class: 'sd-wait' }, h('span', { class: 'dc-state__icon' }, icon('check-circle')), h('h1', { text: ended === 'notfound' ? t('e_notfound') : ended === 'full' ? t('e_full') : t('e_ended') }), h('p', { class: 'dc-muted', text: t('thanks') })));
      return;
    }
    if (key.indexOf('wait:') === 0) {
      V.title = h('h1'); V.sub = h('p', { class: 'dc-muted' }); V.qlist = h('div', { class: 'sd-qlist' });
      m.replaceChildren(h('div', { class: 'sd-wait' }, h('span', { class: 'sd-pulse' }, icon('clock', 'dc-icon--lg')), V.title, V.sub), V.qlist);
      return;
    }
    var q = h('h1', { class: 'sd-q', text: s.q || t('untitled') }); q.style.fontSize = 'var(--dc-fs-xl)'; q.style.marginBottom = 'var(--dc-s-5)';
    V.ok = h('div', { class: 'sd-ok', role: 'status' }); V.cnt = h('div', { class: 'sd-cnt', text: cntTxt() });
    var root = [q];
    if (s.type === 'poll') {
      V.opts = s.opts.map(function (o, i) { var b = h('button', { type: 'button', class: 'sd-opt', 'aria-pressed': 'false', onclick: function () { send({ t: 'answer', id: s.id, v: i }); } }, h('span', { text: o }), icon('check')); root.push(b); return b; });
    } else if (s.type === 'escala') {
      V.opts = []; var g = h('div', { class: 'sd-scale5', role: 'group', 'aria-label': s.q });
      for (var i = 1; i <= 5; i++) (function (i) { var b = h('button', { type: 'button', class: 'sd-opt', 'aria-pressed': 'false', text: String(i), onclick: function () { send({ t: 'answer', id: s.id, v: i }); } }); V.opts.push(b); g.appendChild(b); })(i);
      root.push(g, h('div', { class: 'sd-ends' }, h('span', { text: s.lo || '1' }), h('span', { text: s.hi || '5' })));
    } else if (s.type === 'nube') {
      V.ins = []; var fl = h('div', { class: 'sd-fields' });
      for (var k = 0; k < s.max; k++) { var inp = h('input', { type: 'text', class: 'dc-input', maxlength: 30, autocomplete: 'off', 'aria-label': t('word_n', { n: k + 1 }), placeholder: t('word_n', { n: k + 1 }) }); inp.value = (localAns[s.id] || [])[k] || ''; fl.appendChild(inp); V.ins.push(inp); }
      V.btn = h('button', { type: 'button', class: 'dc-btn dc-btn--primary dc-btn--lg dc-btn--block', onclick: function () {
        var v = V.ins.map(function (x) { return x.value; }).filter(function (x) { return x.trim(); }); localAns[s.id] = V.ins.map(function (x) { return x.value; }); if (v.length) send({ t: 'answer', id: s.id, v: v });
      } });
      root.push(fl, V.btn);
    } else if (s.type === 'preguntes') {
      V.form = h('div'); V.ta = h('textarea', { class: 'dc-textarea', maxlength: 200, 'aria-label': t('ask_ph'), placeholder: t('ask_ph') }); V.ta.value = typed; V.ta.oninput = function () { typed = V.ta.value; };
      var bq = h('button', { type: 'button', class: 'dc-btn dc-btn--primary dc-btn--lg dc-btn--block', text: t('ask_send'), onclick: function () { if (V.ta.value.trim()) { send({ t: 'answer', id: s.id, v: V.ta.value }); typed = ''; V.ta.value = ''; } } });
      V.form.append(V.ta, h('div', { class: 'dc-stack--sm' }), bq); V.qlist = h('div', { class: 'sd-qlist' });
      root.push(V.form, V.ok, V.qlist);
    } else {
      var ta = h('textarea', { class: 'dc-textarea', maxlength: 240, 'aria-label': t('write_ph'), placeholder: t('write_ph') }), cc = h('div', { class: 'sd-cnt' });
      ta.oninput = function () { cc.textContent = ta.value.length + '/240'; };
      root.push(ta, cc, h('button', { type: 'button', class: 'dc-btn dc-btn--primary dc-btn--lg dc-btn--block', text: t('send'), onclick: function () { if (ta.value.trim()) { send({ t: 'answer', id: s.id, v: ta.value }); ta.value = ''; cc.textContent = ''; } } }));
    }
    if (s.type !== 'preguntes') root.push(V.ok, V.cnt);
    m.replaceChildren.apply(m, root);
  }
  function update() {
    var s = state && state.slide; if (!V) return;
    if (curKey.indexOf('wait:') === 0) {
      V.title.textContent = s ? (mine ? t('sent') : t('vote_closed')) : t('waiting');
      V.sub.textContent = s ? (mine ? t('next_wait') : t('closed_msg')) : '';
      if (s && s.type === 'preguntes') renderQA(true); else V.qlist.replaceChildren();
      return;
    }
    if (curKey.indexOf('q:') !== 0) return;
    if (s.type === 'poll' || s.type === 'escala') {
      V.opts.forEach(function (b, i) { b.setAttribute('aria-pressed', (s.type === 'poll' ? mine === i : mine === i + 1) ? 'true' : 'false'); });
      setOk('ok', mine != null ? t('sent_change') : '');
    } else if (s.type === 'nube') {
      V.btn.textContent = mine != null ? t('update') : t('send'); setOk('ok', mine != null ? t('sent_ok') : '');
    } else if (s.type === 'preguntes') {
      var left = 3 - (mine || 0); V.form.hidden = left <= 0;
      setOk(left > 0 ? 'info' : 'warn', left > 0 ? t('ask_left', { n: left }) : t('ask_none')); renderQA();
    } else setOk('ok', mine ? t('sent_msgs', { n: mine }) : '');
  }
  function render() {
    var k = keyNow();
    if (k !== curKey) { curKey = k; build(k); if (V && V.focus) V.focus.focus(); }
    update();
  }
  function renderQA(readonly) {
    var box = V && V.qlist; if (!box) return;
    var open = state && state.open && !readonly, old = box.__k || new Map(), nu = new Map(), prev = null;
    qa.forEach(function (q) {
      var n = old.get(q.id);
      if (!n) { var tx = h('div'), vb = h('button', { type: 'button' }); n = h('div', { class: 'sd-qrow' }, tx, vb); n.__r = { tx: tx, vb: vb }; }
      var x = n.__r; n.classList.toggle('is-done', !!q.done);
      var sub = q.done ? t('answered') : q.own ? t('own') : '';
      x.tx.replaceChildren(q.t); if (sub) x.tx.appendChild(h('small', { text: sub }));
      x.vb.className = 'sd-vb'; x.vb.setAttribute('aria-pressed', q.me ? 'true' : 'false'); x.vb.setAttribute('aria-label', (q.me ? t('voted') : t('vote')) + ' · ' + q.v);
      x.vb.replaceChildren(icon('chevron-up'), String(q.v)); x.vb.disabled = !!(q.own || !open);
      x.vb.onclick = function () { send({ t: 'vote', id: state.slide.id, q: q.id }); };
      nu.set(q.id, n); var want = prev ? prev.nextSibling : box.firstChild; if (n !== want) box.insertBefore(n, want); prev = n;
    });
    old.forEach(function (n, k) { if (!nu.has(k)) n.remove(); });
    box.__k = nu;
  }

  I18N.set(I18N.lang); render(); pill();
  if (code) connect();
})();
