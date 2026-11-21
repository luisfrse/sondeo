(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var t = function (k, v) { return I18N.t(k, v); };
  var h = UI.h, icon = UI.icon;
  var LS = 'sondeo.slides';
  var TYPES = ['poll', 'nube', 'text', 'escala', 'preguntes'];
  var TICON = { poll: 'chart', nube: 'cloud', text: 'edit', escala: 'activity', preguntes: 'info' };
  var slides = [];
  try { slides = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (_) { /* sin datos */ }
  if (!Array.isArray(slides) || !slides.length) slides = [{ type: 'poll', q: '', opts: ['', ''] }];
  function save() { try { localStorage.setItem(LS, JSON.stringify(slides)); } catch (_) { /* sin almacenamiento */ } }
  function nStud(n) { return n === 1 ? t('n_student1') : t('n_students', { n: n }); }

  var auth = null, helloName = '', view = 'gate', contactUrl = 'https://luisfs.com', SAVED = 'sondeo.codi';
  var redrawTools;
  function show(v) {
    view = v;
    ['gate', 'login', 'edit'].forEach(function (k) { $(k).hidden = k !== v; });
    $('pres').hidden = v !== 'pres'; $('top').hidden = v === 'pres';
    if (redrawTools) redrawTools();
    if (v === 'login') setTimeout(function () { $('lcode').focus(); }, 0);
  }

  /* ---------- idioma ---------- */
  function applyLang() {
    document.querySelectorAll('[data-i]').forEach(function (n) { n.textContent = t(n.dataset.i); });
    document.querySelectorAll('[data-alt]').forEach(function (n) { n.alt = t(n.dataset.alt); });
    $('prev').setAttribute('aria-label', t('prev')); $('prev').title = t('prev'); $('next').setAttribute('aria-label', t('next')); $('next').title = t('next');
    $('fs').setAttribute('aria-label', t('fs')); $('fs').title = t('fs'); $('cd').setAttribute('aria-label', t('code_n'));
    document.title = 'Sondeo';
    renderAdd(); renderEditor();
    if (st) draw();
    if (lastLoginErr) showLoginErr(lastLoginErr);
  }
  redrawTools = UI.tools($('tools'), applyLang);
  $('tools').__extra = function () {
    if (view !== 'edit') return [];
    return [h('span', { class: 'sd-hello', text: t('hello', { n: helloName }) }), h('button', { type: 'button', class: 'dc-btn dc-btn--on-dark', onclick: logout }, icon('log-out'), t('logout'))];
  };

  /* ---------- editor ---------- */
  function newSlide(k) { var o = { type: k, q: '' }; if (k === 'poll') o.opts = ['', '']; if (k === 'nube') o.max = 3; if (k === 'escala') { o.lo = ''; o.hi = ''; } return o; }
  function field(id, label, control) { return h('div', { class: 'dc-field' }, h('label', { class: 'dc-label', for: id, text: label }), control); }
  function renderAdd() {
    var ar = $('addrow'); ar.replaceChildren();
    TYPES.forEach(function (k) {
      ar.appendChild(h('button', { type: 'button', class: 'sd-tile', onclick: function () {
        slides.push(newSlide(k)); save(); renderEditor();
        var cards = document.querySelectorAll('.sd-slide'), last = cards[cards.length - 1];
        if (last) { last.scrollIntoView({ block: 'center' }); last.querySelector('input[type=text]').focus(); }
      } }, icon(TICON[k]), t('add_' + k)));
    });
  }
  function renderEditor(focus) {
    var box = $('slides'); box.replaceChildren();
    slides.forEach(function (s, i) {
      var p = 's' + i + '-';
      var c = h('div', { class: 'dc-card sd-slide' }), head = h('div', { class: 'sd-slide__head' });
      head.appendChild(h('span', { class: 'sd-slide__num', text: i + 1, 'aria-hidden': 'true' }));
      head.appendChild(icon(TICON[s.type], 'sd-slide__ico'));
      var sel = h('select', { class: 'dc-select', id: p + 'type', 'aria-label': t('slide_n', { n: i + 1 }) + ' · ' + t('t_' + s.type) });
      TYPES.forEach(function (k) { var o = h('option', { value: k, text: t('t_' + k) }); if (k === s.type) o.selected = true; sel.appendChild(o); });
      sel.onchange = function () { var n = newSlide(sel.value); n.q = s.q; slides[i] = n; save(); renderEditor(p + 'type'); };
      head.appendChild(sel);
      [[-1, 'chevron-up', 'move_up'], [1, 'chevron-down', 'move_down']].forEach(function (a) {
        var b = h('button', { type: 'button', class: 'dc-btn dc-btn--secondary dc-btn--icon', id: p + 'mv' + a[0], 'aria-label': t(a[2]), title: t(a[2]) }, icon(a[1]));
        b.disabled = (i + a[0] < 0 || i + a[0] >= slides.length);
        b.onclick = function () { var x = slides[i]; slides[i] = slides[i + a[0]]; slides[i + a[0]] = x; save(); renderEditor('s' + (i + a[0]) + '-mv' + a[0]); };
        head.appendChild(b);
      });
      var d = h('button', { type: 'button', class: 'dc-btn dc-btn--danger dc-btn--icon', 'aria-label': t('del_slide'), title: t('del_slide') }, icon('trash'));
      d.onclick = function () { slides.splice(i, 1); if (!slides.length) slides.push(newSlide('poll')); save(); renderEditor(); };
      head.appendChild(d);
      c.appendChild(head);
      var q = h('input', { type: 'text', class: 'dc-input', id: p + 'q', maxlength: 200, autocomplete: 'off' }); q.value = s.q || ''; q.oninput = function () { s.q = q.value; save(); };
      c.appendChild(field(p + 'q', t('question'), q));
      if (s.type === 'poll') {
        var ta = h('textarea', { class: 'dc-textarea', id: p + 'o', rows: 4 }); ta.value = (s.opts || []).join('\n'); ta.oninput = function () { s.opts = ta.value.split('\n'); save(); };
        c.appendChild(field(p + 'o', t('opts_label'), ta));
      } else if (s.type === 'nube') {
        var n = h('input', { type: 'number', class: 'dc-input sd-num', id: p + 'n', min: 1, max: 5, inputmode: 'numeric' }); n.value = s.max || 3; n.oninput = function () { s.max = parseInt(n.value, 10) || 3; save(); };
        c.appendChild(field(p + 'n', t('max_words'), n));
      } else if (s.type === 'escala') {
        var lo = h('input', { type: 'text', class: 'dc-input', id: p + 'lo', maxlength: 30 }); lo.value = s.lo || ''; lo.oninput = function () { s.lo = lo.value; save(); };
        var hi = h('input', { type: 'text', class: 'dc-input', id: p + 'hi', maxlength: 30 }); hi.value = s.hi || ''; hi.oninput = function () { s.hi = hi.value; save(); };
        c.appendChild(h('div', { class: 'sd-two' }, field(p + 'lo', t('lo_label'), lo), field(p + 'hi', t('hi_label'), hi)));
      }
      box.appendChild(c);
    });
    if (focus) { var f = $(focus); if (f && !f.disabled) f.focus(); else { var m = document.querySelector('.sd-slide .dc-btn--icon:not(:disabled)'); if (m) m.focus(); } }
  }
  function msg(kind, text) { $('msg').replaceChildren(text ? UI.alertBox(kind, text) : ''); }
  $('ex').onclick = function () {
    var go = function () { slides = JSON.parse(JSON.stringify(t('example_slides'))); save(); renderEditor(); };
    if (!slides.some(function (s) { return s.q; })) return go();
    UI.confirm({ title: t('confirm_replace_t'), text: t('confirm_replace'), ok: t('yes_replace') }).then(function (v) { if (v) go(); });
  };
  $('exp').onclick = function () { var a = h('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(slides, null, 1)], { type: 'application/json' })); a.download = 'sondeo-diapositives.json'; a.click(); };
  $('imp').onclick = function () { $('file').click(); };
  $('file').onchange = function () {
    var f = this.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () { try { var j = JSON.parse(r.result); if (Array.isArray(j) && j.length) { slides = j; save(); renderEditor(); msg('', ''); } else throw 0; } catch (_) { msg('danger', t('bad_file')); } };
    r.readAsText(f); this.value = '';
  };

  /* ---------- acceso con codigo de invitacion ---------- */
  var lastLoginErr = null;
  function showLoginErr(e) {
    lastLoginErr = e; var box = $('lerr'), inp = $('lcode');
    if (!e) { box.replaceChildren(); inp.removeAttribute('aria-invalid'); return; }
    var text = e.text; if (e.left != null) text += ' ' + (e.left === 1 ? t('left_1') : t('left_n', { n: e.left }));
    box.replaceChildren(UI.alertBox('danger', text)); inp.setAttribute('aria-invalid', 'true');
  }
  function showLogin(err) { auth = null; helloName = ''; show('login'); showLoginErr(err || null); $('contact').href = contactUrl; }
  function doLogin(codi, remember, silent) {
    $('lgo').setAttribute('aria-busy', 'true'); $('lgo').disabled = true;
    return fetch('/api/acceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codi: codi }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) {
          if (silent) { try { localStorage.removeItem(SAVED); } catch (_) { /* sin almacenamiento */ } showLogin(null); return false; }
          showLogin(x.j.err === 'many' ? { text: x.j.wait ? t('wait_min', { m: Math.max(1, Math.ceil(x.j.wait / 60)) }) : t('err_many') } : { text: t('bad_code'), left: x.j.left });
          return false;
        }
        auth = x.j.token; helloName = x.j.etiqueta; showLoginErr(null);
        try { if (remember) localStorage.setItem(SAVED, codi); } catch (_) { /* sin almacenamiento */ }
        show('edit'); return true;
      }).catch(function () { if (silent) showLogin(null); else showLogin({ text: t('err_net') }); return false; })
      .then(function (ok) { $('lgo').removeAttribute('aria-busy'); $('lgo').disabled = false; return ok; });
  }
  $('lform').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('lcode').value;
    if (v.trim()) doLogin(v, $('lrem').checked, false); else { showLoginErr({ text: t('code_empty') }); $('lcode').focus(); }
  });
  function logout() { try { localStorage.removeItem(SAVED); } catch (_) { /* sin almacenamiento */ } $('lcode').value = ''; showLogin(null); }
  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) { contactUrl = c.contactUrl || contactUrl; $('contact').href = contactUrl; }).catch(function () { /* usa el de siempre */ });

  $('start').onclick = function () {
    msg('', ''); var b = $('start'); b.setAttribute('aria-busy', 'true'); b.disabled = true;
    fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth }, body: JSON.stringify({ slides: slides }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j, st: r.status }; }); })
      .then(function (x) { if (!x.ok) { if (x.st === 401) { showLogin({ text: t('err_auth') }); return; } msg('danger', t('err_' + (x.j.err || 'bad'), { n: x.j.n })); return; } present(x.j.code, x.j.token); })
      .catch(function () { msg('danger', t('err_net')); })
      .then(function () { b.removeAttribute('aria-busy'); b.disabled = false; });
  };

  /* ---------- presentacion ---------- */
  var ws, st = null, res = null, code, token, retry = 0, done = false, first = true, studentsNow = 0;
  function present(c, tk) {
    code = c; token = tk; show('pres');
    $('qr').src = '/qr/' + c + '.svg'; $('cd').textContent = c; $('url').textContent = location.host + '/s';
    connect();
  }
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = function () { retry = 0; $('conn').hidden = true; ws.send(JSON.stringify({ t: 'hello', code: code, token: token })); if (first) { first = false; setTimeout(function () { send({ t: 'open', v: true }); }, 150); } };
    ws.onmessage = function (ev) {
      var d = JSON.parse(ev.data);
      if (d.t === 'state') { var changed = !st || st.idx !== d.idx; st = d; studentsNow = d.students; if (changed) res = null; draw(); }
      else if (d.t === 'results') { if (st && st.slide && st.slide.id === d.id) { res = d.data; drawRes(); } }
      else if (d.t === 'students') { studentsNow = d.n; drawRing(); }
      else if (d.t === 'ended') { done = true; location.reload(); }
    };
    ws.onclose = function () { if (!done) { $('conn').textContent = t('reconnecting'); $('conn').hidden = false; setTimeout(connect, Math.min(4000, 500 * (++retry))); } };
  }
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function go(i) { if (!st || i < 0 || i >= st.n) return; send({ t: 'go', idx: i }); if ($('auto').checked) setTimeout(function () { send({ t: 'open', v: true }); }, 60); }
  $('prev').onclick = function () { go(st.idx - 1); };
  $('next').onclick = function () { go(st.idx + 1); };
  $('tog').onclick = function () { send({ t: 'open', v: !st.open }); };
  $('clr').onclick = function () { UI.confirm({ title: t('confirm_clear_t'), text: t('confirm_clear'), ok: t('yes_clear'), danger: true }).then(function (v) { if (v) send({ t: 'clear' }); }); };
  $('end').onclick = function () { UI.confirm({ title: t('confirm_end_t'), text: t('confirm_end'), ok: t('yes_end'), danger: true }).then(function (v) { if (v) { done = true; send({ t: 'end' }); setTimeout(function () { location.reload(); }, 300); } }); };
  $('fs').onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
  document.addEventListener('fullscreenchange', function () { document.body.classList.toggle('proj', !!document.fullscreenElement); });
  document.addEventListener('keydown', function (e) {
    if (view !== 'pres' || !st || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') go(st.idx + 1); else if (e.key === 'ArrowLeft') go(st.idx - 1); else if (e.key === ' ') { e.preventDefault(); send({ t: 'open', v: !st.open }); }
  });

  /* anillo de progreso: el SVG se crea una vez y despues solo cambian el trazo y el texto */
  var NS = 'http://www.w3.org/2000/svg', CIRC = 2 * Math.PI * 42;
  function makeRing(box) {
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
    var tr = document.createElementNS(NS, 'circle'), vl = document.createElementNS(NS, 'circle');
    [tr, vl].forEach(function (c) { c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', '42'); });
    tr.setAttribute('class', 'sd-ring__track'); vl.setAttribute('class', 'sd-ring__val'); vl.setAttribute('stroke-dasharray', String(CIRC)); vl.setAttribute('stroke-dashoffset', String(CIRC));
    svg.appendChild(tr); svg.appendChild(vl);
    var big = h('span'), small = h('small'), txt = h('span', { class: 'sd-ring__txt' }, big, small);
    box.replaceChildren(svg, txt); box.setAttribute('role', 'img');
    return { set: function (frac, b, s) { vl.setAttribute('stroke-dashoffset', String(CIRC * (1 - Math.max(0, Math.min(1, frac))))); big.textContent = b; small.textContent = s || ''; box.setAttribute('aria-label', b + ' ' + (s || '')); } };
  }
  var sideRing = makeRing($('ring'));
  function drawRing() { var tot = res ? res.total : 0; sideRing.set(studentsNow ? tot / studentsNow : 0, tot + '/' + studentsNow, t('answered_of')); }

  function draw() {
    var s = st.slide; if (!s) return;
    $('pq').textContent = s.q || t('untitled');
    $('tog').textContent = st.open ? t('close_resp') : t('open_resp');
    $('tog').className = 'dc-btn ' + (st.open ? 'dc-btn--secondary' : 'dc-btn--primary');
    var chip = $('state'); chip.textContent = st.open ? t('st_open') : t('st_closed'); chip.className = 'dc-chip dc-chip--dot ' + (st.open ? 'dc-chip--ok' : 'dc-chip--warn');
    var dots = $('dots');
    if (dots.childNodes.length !== st.n) {
      dots.replaceChildren();
      for (var i = 0; i < st.n; i++) (function (i) { dots.appendChild(h('button', { type: 'button', class: 'sd-dot', text: i + 1, onclick: function () { go(i); } })); })(i);
    }
    for (var j = 0; j < dots.childNodes.length; j++) { var d = dots.childNodes[j]; d.setAttribute('aria-label', t('slide_n', { n: j + 1 })); if (j === st.idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }
    drawRes();
  }

  /* actualizacion por claves: no se reconstruye el contenedor, solo se crean, mueven o quitan los nodos que cambian */
  function sync(box, items, key, make, upd) {
    var old = box.__k || new Map(), nu = new Map(), prev = null;
    items.forEach(function (it) {
      var k = key(it), n = old.get(k) || make(it); upd(n, it); nu.set(k, n);
      var want = prev ? prev.nextSibling : box.firstChild; if (n !== want) box.insertBefore(n, want); prev = n;
    });
    old.forEach(function (n, k) { if (!nu.has(k)) n.remove(); });
    box.__k = nu;
  }
  var cur = null, curKey = '';
  function skeleton(s) {
    var box = $('res'); box.replaceChildren(); var v = { type: s.type };
    if (s.type === 'poll') {
      v.root = h('div', { class: 'sd-bars' });
      v.rows = s.opts.map(function (o) {
        var fill = h('div', { class: 'sd-bar__fill' }), n = h('div', { class: 'sd-bar__n' });
        var row = h('div', { class: 'sd-bar' }, h('div', { class: 'sd-bar__label', text: o }), h('div', { class: 'sd-bar__track', 'aria-hidden': 'true' }, fill), n);
        v.root.appendChild(row); return { row: row, fill: fill, n: n };
      });
      box.appendChild(v.root);
    } else if (s.type === 'escala') {
      var ringBox = h('div', { class: 'sd-ring sd-ring--lg' }), cols = h('div', { class: 'sd-cols' });
      v.ring = makeRing(ringBox);
      v.cols = [0, 1, 2, 3, 4].map(function (i) {
        var n = h('span', { class: 'sd-col__n' }), fill = h('div', { class: 'sd-col__fill' }), l = h('span', { class: 'sd-col__l', text: (i + 1) + (i === 0 && s.lo ? ' · ' + s.lo : i === 4 && s.hi ? ' · ' + s.hi : '') });
        cols.appendChild(h('div', { class: 'sd-col' }, n, fill, l)); return { n: n, fill: fill };
      });
      box.appendChild(h('div', { class: 'sd-scale' }, ringBox, cols));
    } else if (s.type === 'nube') {
      v.cloud = h('div', { class: 'sd-cloud' }); v.hold = h('p', { class: 'sd-hold' }, icon('clock'), h('span', { text: t('no_words') })); v.sig = '';
      box.appendChild(v.cloud); box.appendChild(v.hold);
    } else {
      v.list = h('div', { class: s.type === 'preguntes' ? 'sd-qa' : 'sd-wall' });
      v.hold = h('p', { class: 'sd-hold' }, icon('clock'), h('span', { text: t(s.type === 'preguntes' ? 'no_q' : 'no_notes') }));
      box.appendChild(v.list); box.appendChild(v.hold);
    }
    return v;
  }
  function actBtn(name, fn, cls) { return h('button', { type: 'button', class: 'dc-btn dc-btn--secondary dc-btn--icon' + (cls ? ' ' + cls : ''), onclick: fn }, icon(name)); }
  function setLabel(b, text) { b.setAttribute('aria-label', text); b.title = text; }
  function drawRes() {
    var s = st && st.slide; if (!s) return;
    var key = s.id + '|' + s.type + '|' + (s.opts || []).join('\u0001') + '|' + (s.lo || '') + '|' + (s.hi || '') + '|' + I18N.lang;
    if (key !== curKey) { cur = skeleton(s); curKey = key; }
    var r = res || { total: 0, counts: [], words: {}, list: [] };
    drawRing();
    if (s.type === 'poll') {
      var counts = r.counts || [], tot = counts.reduce(function (a, b) { return a + b; }, 0), mx = Math.max.apply(null, counts.concat([0]));
      cur.rows.forEach(function (row, i) {
        var n = counts[i] || 0, pct = tot ? Math.round(n / tot * 100) : 0;
        row.fill.style.setProperty('--w', (tot ? n / tot * 100 : 0) + '%'); row.row.classList.toggle('is-lead', mx > 0 && n === mx);
        row.n.replaceChildren(String(n), h('small', { text: ' · ' + pct + '%' }));
      });
    } else if (s.type === 'escala') {
      var c = r.counts && r.counts.length ? r.counts : [0, 0, 0, 0, 0], m2 = Math.max.apply(null, c.concat([1]));
      cur.ring.set(r.total ? r.avg / 5 : 0, r.total ? r.avg.toFixed(1) : '–', t('mean', { v: '' }).trim());
      cur.cols.forEach(function (col, i) { col.n.textContent = c[i]; col.fill.style.setProperty('--h', (c[i] / m2 * 85) + '%'); });
    } else if (s.type === 'nube') {
      var words = Object.keys(r.words || {}), sig = JSON.stringify(words.map(function (k) { return [k, r.words[k]]; }).sort());
      cur.hold.hidden = words.length > 0;
      if (sig !== cur.sig) {
        cur.sig = sig; cur.cloud.replaceChildren();
        var max = Math.max.apply(null, words.map(function (k) { return r.words[k]; }).concat([1]));
        words.sort(function (a, b) { return r.words[b] - r.words[a] || a.localeCompare(b); });
        var big = Math.min(6, Math.max(2.2, 6 - words.length * .12)), arr = [];
        words.forEach(function (k, i) { var sp = h('span', { class: 'sd-w' + ((k.length + i) % 6), text: k }); sp.style.fontSize = (1.1 + (r.words[k] / max) * big) + 'rem'; arr.push(sp); });
        var lo = 0, hi = arr.length - 1; while (lo <= hi) { cur.cloud.appendChild(arr[lo++]); if (lo <= hi) cur.cloud.appendChild(arr[hi--]); }
      }
    } else if (s.type === 'preguntes') {
      var list = (r.list || []).slice().sort(function (a, b) { return (a.done - b.done) || (b.v - a.v) || (a.id - b.id); });
      cur.hold.hidden = list.length > 0;
      sync(cur.list, list, function (n) { return n.id; }, function (n) {
        var v = h('div', { class: 'sd-qi__v' }), tx = h('div', { class: 'sd-qi__t' });
        var a = actBtn('check', function () { send({ t: 'done', id: n.id }); }), b = actBtn('eye-off', function () { send({ t: 'hide', id: n.id }); });
        var node = h('div', { class: 'sd-qi' }, v, tx, h('div', { class: 'sd-qi__ac' }, a, b)); node.__r = { v: v, tx: tx, a: a, b: b }; return node;
      }, function (node, n) {
        var x = node.__r; node.classList.toggle('is-done', !!n.done); node.classList.toggle('is-hid', !!n.hidden);
        x.v.replaceChildren(String(n.v), h('small', { text: t('votes', { n: n.v }).replace(/^\d+\s*/, '') })); x.tx.textContent = n.hidden ? t('hidden') : n.t;
        setLabel(x.a, n.done ? t('undone') : t('done')); x.a.setAttribute('aria-pressed', n.done ? 'true' : 'false');
        if (x.b.__h !== !!n.hidden) { x.b.__h = !!n.hidden; x.b.replaceChildren(icon(n.hidden ? 'eye' : 'eye-off')); } setLabel(x.b, n.hidden ? t('show') : t('hide'));
      });
    } else {
      cur.hold.hidden = (r.list || []).length > 0;
      sync(cur.list, r.list || [], function (n) { return n.id; }, function (n) {
        var tx = h('div', { class: 'sd-note__t' }), a = actBtn('star', function () { send({ t: 'star', id: n.id }); }, 'sd-note__star'), b = actBtn('eye-off', function () { send({ t: 'hide', id: n.id }); });
        var node = h('div', { class: 'sd-note' }, tx, h('div', { class: 'sd-note__ac' }, a, b)); node.__r = { tx: tx, a: a, b: b }; return node;
      }, function (node, n) {
        var x = node.__r; node.classList.toggle('is-star', !!n.star); node.classList.toggle('is-hid', !!n.hidden); x.tx.textContent = n.hidden ? t('hidden') : n.t;
        setLabel(x.a, t('highlight')); x.a.setAttribute('aria-pressed', n.star ? 'true' : 'false');
        if (x.b.__h !== !!n.hidden) { x.b.__h = !!n.hidden; x.b.replaceChildren(icon(n.hidden ? 'eye' : 'eye-off')); } setLabel(x.b, n.hidden ? t('show') : t('hide'));
      });
    }
  }

  I18N.set(I18N.lang); applyLang();
  (function () { var saved = null; try { saved = localStorage.getItem(SAVED); } catch (_) { /* sin almacenamiento */ } if (saved) doLogin(saved, true, true); else showLogin(null); })();
})();
