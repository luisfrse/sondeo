(function(){
  'use strict';
  var m = document.getElementById('m'), st = document.getElementById('st');
  var t = function(k, v){ return I18N.t(k, v); };
  var code = (location.pathname.match(/\/s\/(\d{5})/) || [])[1];
  var cid; try { cid = localStorage.getItem('sondeo.cid'); if(!cid){ cid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sondeo.cid', cid); } } catch(_) { cid = Math.random().toString(36).slice(2); }
  function el(c, cls, txt){ var e = document.createElement(c); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }

  var ws, state = null, mine = null, qa = [], count = 0, retry = 0, ended = null, connected = false, localAns = {}, typed = '';
  function pill(){
    if(ended){ st.textContent = t('closed'); st.className = 'pill'; return; }
    st.textContent = code ? (connected ? t('code_pill', { c: code }) : (retry ? t('reconnecting') : t('connecting'))) : '';
    st.className = 'pill' + (connected ? ' on' : '');
  }
  function langButtons(){
    var box = document.getElementById('lang'); box.innerHTML = '';
    I18N.langs.forEach(function(l){ var b = el('button', I18N.lang === l ? 'on' : '', l.toUpperCase()); b.type = 'button'; b.setAttribute('aria-label', t('lang') + ' ' + l); b.onclick = function(){ I18N.set(l); langButtons(); pill(); render(); }; box.appendChild(b); });
  }

  function joinForm(){
    m.innerHTML = '';
    var box = el('div', 'joinbox'); box.appendChild(el('h2', '', t('enter_code'))); box.appendChild(el('p', 'muted', t('code_help')));
    var inp = el('input'); inp.setAttribute('inputmode', 'numeric'); inp.maxLength = 5; inp.placeholder = '12345'; inp.autocomplete = 'off'; box.appendChild(inp);
    var e = el('p', 'muted', ''); e.style.minHeight = '1.4em'; box.appendChild(e);
    var b = el('button', 'btn', t('enter')); b.type = 'button'; box.appendChild(b); m.appendChild(box);
    function go(){ var c = inp.value.replace(/\D/g, ''); fetch('/api/exists?c=' + c).then(function(r){ return r.json(); }).then(function(j){ if(j.ok) location.href = '/s/' + c; else e.textContent = t('code_bad'); }); }
    b.onclick = go; inp.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') go(); });
  }

  function connect(){
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = function(){ retry = 0; connected = true; ws.send(JSON.stringify({ t: 'hello', code: code, cid: cid })); pill(); };
    ws.onmessage = function(ev){
      var d = JSON.parse(ev.data);
      if(d.t === 'state'){ var ch = !state || state.idx !== d.idx; state = d; if(ch){ mine = null; qa = []; } render(); }
      else if(d.t === 'mine'){ if(state && state.slide && state.slide.id === d.id){ mine = d.v; render(); } }
      else if(d.t === 'ack'){ mine = d.v; render(); }
      else if(d.t === 'qa'){ if(state && state.slide && state.slide.id === d.id){ qa = d.list; renderQA(); } }
      else if(d.t === 'count'){ count = d.total; var c = document.getElementById('cnt'); if(c) c.textContent = cntTxt(); }
      else if(d.t === 'limit'){ var o = document.getElementById('ok'); if(o) o.textContent = t(state && state.slide && state.slide.type === 'preguntes' ? 'ask_none' : 'max_msgs'); }
      else if(d.t === 'ended'){ ended = d.why; render(); pill(); }
    };
    ws.onclose = function(){ connected = false; if(ended) return; retry++; pill(); setTimeout(connect, Math.min(5000, 600 * retry)); };
  }
  function send(o){ if(ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function cntTxt(){ return count ? (count === 1 ? t('n_answer1') : t('n_answers', { n: count })) : ''; }

  function render(){
    m.innerHTML = '';
    if(!code){ joinForm(); return; }
    if(ended){ var w0 = el('div', 'wait'); w0.appendChild(el('h2', '', ended === 'notfound' ? t('e_notfound') : ended === 'full' ? t('e_full') : t('e_ended'))); w0.appendChild(el('p', 'muted', t('thanks'))); m.appendChild(w0); return; }
    var s = state && state.slide;
    if(!s || !state.open){
      var w = el('div', 'wait'); w.appendChild(el('div', 'dot'));
      w.appendChild(el('h2', '', s ? (mine ? t('sent') : t('vote_closed')) : t('waiting')));
      if(s) w.appendChild(el('p', 'muted', mine ? t('next_wait') : t('closed_msg')));
      m.appendChild(w);
      if(s && s.type === 'preguntes' && qa.length){ var l0 = el('div', 'qlist'); l0.id = 'qlist'; m.appendChild(l0); renderQA(true); }
      return;
    }
    m.appendChild(el('h2', 'q', s.q || t('untitled')));
    var ok = el('p', 'ok'); ok.id = 'ok';
    if(s.type === 'poll'){
      s.opts.forEach(function(o, i){ var b = el('button', 'opt' + (mine === i ? ' sel' : ''), o); b.type = 'button'; b.onclick = function(){ send({ t: 'answer', id: s.id, v: i }); }; m.appendChild(b); });
      ok.textContent = mine != null ? t('sent_change') : '';
    } else if(s.type === 'escala'){
      var g = el('div', 'scale'); for(var i = 1; i <= 5; i++){ (function(i){ var b = el('button', mine === i ? 'sel' : '', i); b.type = 'button'; b.onclick = function(){ send({ t: 'answer', id: s.id, v: i }); }; g.appendChild(b); })(i); }
      m.appendChild(g); var e = el('div', 'ends'); e.appendChild(el('span', '', s.lo || '1')); e.appendChild(el('span', '', s.hi || '5')); m.appendChild(e);
      ok.textContent = mine != null ? t('sent_change') : '';
    } else if(s.type === 'nube'){
      var ins = [];
      for(var k = 0; k < s.max; k++){ var r = el('div', 'row'), inp = el('input'); inp.type = 'text'; inp.maxLength = 30; inp.placeholder = t('word_n', { n: k + 1 }); inp.autocomplete = 'off'; inp.value = (localAns[s.id] || [])[k] || ''; r.appendChild(inp); m.appendChild(r); ins.push(inp); }
      var b = el('button', 'btn', mine != null ? t('update') : t('send')); b.type = 'button';
      b.onclick = function(){ var v = ins.map(function(x){ return x.value; }).filter(function(x){ return x.trim(); }); localAns[s.id] = ins.map(function(x){ return x.value; }); if(v.length) send({ t: 'answer', id: s.id, v: v }); };
      m.appendChild(b); ok.textContent = mine != null ? t('sent_ok') : '';
    } else if(s.type === 'preguntes'){
      var left = 3 - (mine || 0);
      if(left > 0){
        var ta = el('textarea'); ta.maxLength = 200; ta.placeholder = t('ask_ph'); ta.value = typed; ta.oninput = function(){ typed = ta.value; }; m.appendChild(ta);
        var bq = el('button', 'btn', t('ask_send')); bq.type = 'button'; bq.style.marginTop = '8px';
        bq.onclick = function(){ if(ta.value.trim()){ send({ t: 'answer', id: s.id, v: ta.value }); typed = ''; ta.value = ''; } }; m.appendChild(bq);
        ok.textContent = t('ask_left', { n: left });
      } else ok.textContent = t('ask_none');
      m.appendChild(ok);
      var ql = el('div', 'qlist'); ql.id = 'qlist'; m.appendChild(ql); renderQA();
      return;
    } else {
      var ta2 = el('textarea'); ta2.maxLength = 240; ta2.placeholder = t('write_ph'); m.appendChild(ta2);
      var cc = el('div', 'cnt', '');
      ta2.oninput = function(){ cc.textContent = ta2.value.length + '/240'; }; m.appendChild(cc);
      var b2 = el('button', 'btn', t('send')); b2.type = 'button';
      b2.onclick = function(){ if(ta2.value.trim()){ send({ t: 'answer', id: s.id, v: ta2.value }); ta2.value = ''; cc.textContent = ''; } };
      m.appendChild(b2); ok.textContent = mine ? t('sent_msgs', { n: mine }) : '';
    }
    m.appendChild(ok);
    var c = el('div', 'cnt', cntTxt()); c.id = 'cnt'; m.appendChild(c);
  }
  function renderQA(readonly){
    var box = document.getElementById('qlist'); if(!box) return;
    box.innerHTML = '';
    var open = state && state.open && !readonly;
    qa.forEach(function(q){
      var r = el('div', 'qrow' + (q.done ? ' done' : '')), tx = el('div', '', q.t);
      if(q.own || q.done){ tx.appendChild(el('small', '', q.done ? t('answered') : t('own'))); }
      r.appendChild(tx);
      var b = el('button', 'vb' + (q.me ? ' sel' : ''), '▲ ' + q.v); b.type = 'button'; b.setAttribute('aria-label', q.me ? t('voted') : t('vote'));
      if(q.own || !open) b.disabled = true; else b.onclick = function(){ send({ t: 'vote', id: state.slide.id, q: q.id }); };
      r.appendChild(b); box.appendChild(r);
    });
  }

  I18N.set(I18N.lang); langButtons(); pill(); render();
  if(code) connect();
})();
