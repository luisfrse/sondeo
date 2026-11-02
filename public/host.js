(function(){
  'use strict';
  var $ = function(i){ return document.getElementById(i); };
  var t = function(k, v){ return I18N.t(k, v); };
  var LS = 'sondeo.slides';
  var TYPES = ['poll', 'nube', 'text', 'escala', 'preguntes'];
  var slides = [];
  try { slides = JSON.parse(localStorage.getItem(LS) || '[]'); } catch(_) {}
  if(!Array.isArray(slides) || !slides.length) slides = [{ type: 'poll', q: '', opts: ['', ''] }];
  function save(){ try { localStorage.setItem(LS, JSON.stringify(slides)); } catch(_) {} }
  function el(c, cls, txt){ var e = document.createElement(c); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function nStud(n){ return n === 1 ? t('n_student1') : t('n_students', { n: n }); }
  function nPart(n){ return n === 1 ? t('n_part1') : t('n_part', { n: n }); }

  /* ---------- idioma ---------- */
  function langButtons(box){
    box.innerHTML = '';
    I18N.langs.forEach(function(l){ var b = el('button', I18N.lang === l ? 'on' : '', l.toUpperCase()); b.type = 'button'; b.setAttribute('aria-label', t('lang') + ' ' + l); b.onclick = function(){ I18N.set(l); applyLang(); }; box.appendChild(b); });
  }
  function applyLang(){
    document.querySelectorAll('[data-i]').forEach(function(n){ n.textContent = t(n.dataset.i); });
    document.querySelectorAll('[data-alt]').forEach(function(n){ n.alt = t(n.dataset.alt); });
    $('prev').title = t('prev'); $('next').title = t('next');
    document.title = 'Sondeo';
    if(helloName) $('hello').textContent = t('hello', { n: helloName });
    langButtons($('lang')); langButtons($('lang2')); langButtons($('lang3'));
    document.querySelectorAll('[data-ph]').forEach(function(n){ n.placeholder = t(n.dataset.ph); });
    var ar = $('addrow'); ar.innerHTML = '';
    TYPES.forEach(function(k){ var b = el('button', 'btn ghost', t('add_' + k)); b.type = 'button'; b.onclick = function(){ slides.push(newSlide(k)); save(); renderEditor(); window.scrollTo(0, document.body.scrollHeight); }; ar.appendChild(b); });
    renderEditor();
    if(st){ draw(); $('stu').textContent = nStud(st.students); }
  }

  /* ---------- editor ---------- */
  function newSlide(k){ var o = { type: k, q: '' }; if(k === 'poll') o.opts = ['', '']; if(k === 'nube') o.max = 3; if(k === 'escala'){ o.lo = ''; o.hi = ''; } return o; }
  function renderEditor(){
    var box = $('slides'); box.innerHTML = '';
    slides.forEach(function(s, i){
      var c = el('div', 'card slide'), h = el('div', 'h');
      h.appendChild(el('b', '', (i + 1) + '.'));
      var sel = el('select'); TYPES.forEach(function(k){ var o = el('option', '', t('t_' + k)); o.value = k; if(k === s.type) o.selected = true; sel.appendChild(o); });
      sel.onchange = function(){ var n = newSlide(sel.value); n.q = s.q; slides[i] = n; save(); renderEditor(); };
      h.appendChild(sel); h.appendChild(el('span', 'sp'));
      [['↑', -1], ['↓', 1]].forEach(function(a){ var b = el('button', 'btn ghost sm', a[0]); b.type = 'button'; b.disabled = (i + a[1] < 0 || i + a[1] >= slides.length); b.onclick = function(){ var x = slides[i]; slides[i] = slides[i + a[1]]; slides[i + a[1]] = x; save(); renderEditor(); }; h.appendChild(b); });
      var d = el('button', 'btn danger sm', '✕'); d.type = 'button'; d.setAttribute('aria-label', t('del_slide')); d.onclick = function(){ slides.splice(i, 1); if(!slides.length) slides.push(newSlide('poll')); save(); renderEditor(); }; h.appendChild(d);
      c.appendChild(h);
      var q = el('input'); q.type = 'text'; q.placeholder = t('question'); q.maxLength = 200; q.value = s.q || ''; q.oninput = function(){ s.q = q.value; save(); }; c.appendChild(q);
      if(s.type === 'poll'){
        c.appendChild(el('label', 'l', t('opts_label')));
        var ta = el('textarea'); ta.value = (s.opts || []).join('\n'); ta.oninput = function(){ s.opts = ta.value.split('\n'); save(); }; c.appendChild(ta);
      } else if(s.type === 'nube'){
        c.appendChild(el('label', 'l', t('max_words')));
        var n = el('input'); n.type = 'number'; n.min = 1; n.max = 5; n.value = s.max || 3; n.style.maxWidth = '100px'; n.oninput = function(){ s.max = parseInt(n.value, 10) || 3; save(); }; c.appendChild(n);
      } else if(s.type === 'escala'){
        var w = el('div', 'two'), a = el('div'), b = el('div');
        a.appendChild(el('label', 'l', t('lo_label'))); var lo = el('input'); lo.type = 'text'; lo.maxLength = 30; lo.value = s.lo || ''; lo.oninput = function(){ s.lo = lo.value; save(); }; a.appendChild(lo);
        b.appendChild(el('label', 'l', t('hi_label'))); var hi = el('input'); hi.type = 'text'; hi.maxLength = 30; hi.value = s.hi || ''; hi.oninput = function(){ s.hi = hi.value; save(); }; b.appendChild(hi);
        w.appendChild(a); w.appendChild(b); c.appendChild(w);
      }
      box.appendChild(c);
    });
  }
  $('ex').onclick = function(){ if(!slides.some(function(s){ return s.q; }) || confirm(t('confirm_replace'))){ slides = JSON.parse(JSON.stringify(t('example_slides'))); save(); renderEditor(); } };
  $('exp').onclick = function(){ var a = el('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(slides, null, 1)], { type: 'application/json' })); a.download = 'sondeo-diapositives.json'; a.click(); };
  $('imp').onclick = function(){ $('file').click(); };
  $('file').onchange = function(){ var f = this.files[0]; if(!f) return; var r = new FileReader(); r.onload = function(){ try { var j = JSON.parse(r.result); if(Array.isArray(j) && j.length){ slides = j; save(); renderEditor(); } else throw 0; } catch(_) { $('msg').textContent = t('bad_file'); } }; r.readAsText(f); this.value = ''; };

  /* ---------- accés amb codi d'invitació ---------- */
  var auth = null, contactUrl = 'https://luisfs.com', SAVED = 'sondeo.codi';
  function showLogin(msg){
    auth = null; $('edit').style.display = 'none'; $('pres').style.display = 'none'; $('login').style.display = 'block';
    $('lerr').textContent = msg || ''; $('contact').href = contactUrl;
  }
  function doLogin(codi, remember, silent){
    return fetch('/api/acceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codi: codi }) })
      .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(x){
        if(!x.ok){ if(!silent) showLogin(t(x.j.err === 'many' ? 'err_many' : 'bad_code')); else { try { localStorage.removeItem(SAVED); } catch(_) {} showLogin(''); } return false; }
        auth = x.j.token; $('hello').textContent = t('hello', { n: x.j.etiqueta }); helloName = x.j.etiqueta;
        try { if(remember) localStorage.setItem(SAVED, codi); } catch(_) {}
        $('login').style.display = 'none'; $('edit').style.display = 'block'; return true;
      }).catch(function(){ showLogin(t('err_net')); return false; });
  }
  var helloName = '';
  $('lgo').onclick = function(){ var v = $('lcode').value; if(v.trim()) doLogin(v, $('lrem').checked, false); };
  $('lcode').addEventListener('keydown', function(e){ if(e.key === 'Enter') $('lgo').click(); });
  $('logout').onclick = function(){ try { localStorage.removeItem(SAVED); } catch(_) {} showLogin(''); };
  fetch('/api/config').then(function(r){ return r.json(); }).then(function(c){ contactUrl = c.contactUrl || contactUrl; $('contact').href = contactUrl; }).catch(function(){});
  (function(){ var saved = null; try { saved = localStorage.getItem(SAVED); } catch(_) {} if(saved) doLogin(saved, true, true); else showLogin(''); })();

  $('start').onclick = function(){
    $('msg').textContent = '';
    fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth }, body: JSON.stringify({ slides: slides }) })
      .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j, st: r.status }; }); })
      .then(function(x){ if(!x.ok){ if(x.st === 401){ showLogin(t('err_auth')); return; } $('msg').textContent = t('err_' + (x.j.err || 'bad'), { n: x.j.n }); return; } present(x.j.code, x.j.token); })
      .catch(function(){ $('msg').textContent = t('err_net'); });
  };

  /* ---------- presentació ---------- */
  var ws, st = null, res = null, code, token, retry = 0, done = false, first = true;
  function present(c, tk){
    code = c; token = tk;
    $('edit').style.display = 'none'; $('login').style.display = 'none'; $('pres').style.display = 'block';
    $('qr').src = '/qr/' + c + '.svg'; $('cd').textContent = c;
    $('url').textContent = location.host + '/s';
    connect();
  }
  function connect(){
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = function(){ retry = 0; ws.send(JSON.stringify({ t: 'hello', code: code, token: token })); if(first){ first = false; setTimeout(function(){ send({ t: 'open', v: true }); }, 150); } };
    ws.onmessage = function(ev){
      var d = JSON.parse(ev.data);
      if(d.t === 'state'){ var changed = !st || st.idx !== d.idx; st = d; if(changed) res = null; draw(); }
      else if(d.t === 'results'){ if(st && st.slide && st.slide.id === d.id){ res = d.data; drawRes(); } }
      else if(d.t === 'students'){ $('stu').textContent = nStud(d.n); }
      else if(d.t === 'ended'){ done = true; location.reload(); }
    };
    ws.onclose = function(){ if(!done) setTimeout(connect, Math.min(4000, 500 * (++retry))); };
  }
  function send(o){ if(ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function go(i){ if(!st || i < 0 || i >= st.n) return; send({ t: 'go', idx: i }); if($('auto').checked) setTimeout(function(){ send({ t: 'open', v: true }); }, 60); }
  $('prev').onclick = function(){ go(st.idx - 1); };
  $('next').onclick = function(){ go(st.idx + 1); };
  $('tog').onclick = function(){ send({ t: 'open', v: !st.open }); };
  $('clr').onclick = function(){ if(confirm(t('confirm_clear'))) send({ t: 'clear' }); };
  $('end').onclick = function(){ if(confirm(t('confirm_end'))){ done = true; send({ t: 'end' }); setTimeout(function(){ location.reload(); }, 300); } };
  $('fs').onclick = function(){ if(document.fullscreenElement) document.exitFullscreen(); else if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
  document.addEventListener('fullscreenchange', function(){ document.body.classList.toggle('proj', !!document.fullscreenElement); });
  document.addEventListener('keydown', function(e){
    if($('pres').style.display !== 'block' || !st || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if(e.key === 'ArrowRight') go(st.idx + 1); else if(e.key === 'ArrowLeft') go(st.idx - 1); else if(e.key === ' '){ e.preventDefault(); send({ t: 'open', v: !st.open }); }
  });

  function draw(){
    var s = st.slide; if(!s) return;
    $('pq').textContent = s.q || t('untitled');
    $('tog').textContent = st.open ? t('close_resp') : t('open_resp');
    $('tog').className = 'btn sm' + (st.open ? '' : ' ghost');
    $('stu').textContent = nStud(st.students);
    var dots = $('dots'); dots.innerHTML = '';
    for(var i = 0; i < st.n; i++){ (function(i){ var b = el('button', i === st.idx ? 'cur' : '', i + 1); b.onclick = function(){ go(i); }; dots.appendChild(b); })(i); }
    drawRes();
  }
  var COLORS = ['#b08be0', '#7fb2e0', '#8fd3c6', '#f5c542', '#e0867a', '#c3d96b', '#e8a0d0'];
  function drawRes(){
    var s = st && st.slide, box = $('res'); if(!s) return;
    box.innerHTML = '';
    var r = res || { total: 0, counts: [], words: {}, list: [] };
    $('tot').textContent = (st.open ? t('st_open') : t('st_closed')) + ' · ' + nPart(r.total);
    if(s.type === 'poll'){
      var tot = (r.counts || []).reduce(function(a, b){ return a + b; }, 0) || 1;
      s.opts.forEach(function(o, i){ var n = (r.counts || [])[i] || 0; var row = el('div', 'hb'); row.appendChild(el('div', 't', o)); var tr = el('div', 'tr'), f = el('div', 'f'); f.style.width = (n / tot * 100) + '%'; tr.appendChild(f); row.appendChild(tr); row.appendChild(el('div', 'n', n + ' · ' + Math.round(n / tot * 100) + '%')); box.appendChild(row); });
    } else if(s.type === 'escala'){
      var c = r.counts && r.counts.length ? r.counts : [0, 0, 0, 0, 0], mx = Math.max.apply(null, c.concat([1]));
      box.appendChild(el('div', 'avg', r.total ? t('mean', { v: r.avg.toFixed(1) }) : t('mean_none')));
      var cols = el('div', 'cols'); c.forEach(function(n, i){ var d = el('div'); d.appendChild(el('b', '', n)); var f = el('div', 'f'); f.style.height = (n / mx * 80) + '%'; d.appendChild(f); d.appendChild(el('span', 'muted', (i + 1) + (i === 0 && s.lo ? ' · ' + s.lo : i === 4 && s.hi ? ' · ' + s.hi : ''))); cols.appendChild(d); });
      box.appendChild(cols);
    } else if(s.type === 'nube'){
      var ws2 = Object.keys(r.words || {}), max = Math.max.apply(null, ws2.map(function(k){ return r.words[k]; }).concat([1]));
      var cl = el('div', 'cloud'); ws2.sort(function(a, b){ return r.words[b] - r.words[a] || a.localeCompare(b); });
      var big = Math.min(8, Math.max(2.2, 7 - ws2.length * .12)), arr = [];
      ws2.forEach(function(k, i){ var sp = el('span', '', k); sp.style.fontSize = (1.1 + (r.words[k] / max) * big) + 'rem'; sp.style.color = COLORS[(k.length + i) % COLORS.length]; arr.push(sp); });
      var lo = 0, hi = arr.length - 1; while(lo <= hi){ cl.appendChild(arr[lo++]); if(lo <= hi) cl.appendChild(arr[hi--]); }
      box.appendChild(cl);
    } else if(s.type === 'preguntes'){
      var list = (r.list || []).slice().sort(function(a, b){ return (a.done - b.done) || (b.v - a.v) || (a.id - b.id); });
      if(!list.length){ box.appendChild(el('p', 'muted', t('no_q'))); }
      var qa = el('div', 'qa');
      list.forEach(function(n){
        var d = el('div', 'qi' + (n.done ? ' done' : '') + (n.hidden ? ' hid' : ''));
        var v = el('div', 'v', n.v); v.appendChild(el('small', '', t('votes', { n: n.v }).replace(/^\d+\s*/, '')));
        d.appendChild(v); d.appendChild(el('div', 'tx', n.hidden ? t('hidden') : n.t));
        var ac = el('div', 'ac'); var a = el('button', '', n.done ? t('undone') : t('done')); a.onclick = function(){ send({ t: 'done', id: n.id }); }; var b = el('button', '', n.hidden ? t('show') : t('hide')); b.onclick = function(){ send({ t: 'hide', id: n.id }); };
        ac.appendChild(a); ac.appendChild(b); d.appendChild(ac); qa.appendChild(d);
      });
      box.appendChild(qa);
    } else {
      var wall = el('div', 'wall');
      (r.list || []).forEach(function(n){
        var d = el('div', 'note' + (n.star ? ' star' : '') + (n.hidden ? ' hid' : '')); d.appendChild(el('div', '', n.hidden ? t('hidden') : n.t));
        var ac = el('div', 'ac'); var a = el('button', '', n.star ? '★' : '☆'); a.title = t('highlight'); a.onclick = function(){ send({ t: 'star', id: n.id }); }; var b = el('button', '', n.hidden ? t('show') : t('hide')); b.onclick = function(){ send({ t: 'hide', id: n.id }); };
        ac.appendChild(a); ac.appendChild(b); d.appendChild(ac); wall.appendChild(d);
      });
      box.appendChild(wall);
    }
  }
  I18N.set(I18N.lang); applyLang();
})();
