(function(){
  'use strict';
  var $ = function(i){ return document.getElementById(i); };
  var t = function(k, v){ return I18N.t(k, v); };
  function el(c, cls, txt){ var e = document.createElement(c); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function api(url, opt){ return fetch(url, opt).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ if(!r.ok) throw new Error(t('err_' + (d.err || 'bad'))); return d; }); }); }
  function err(m){ $('err').textContent = m || ''; }
  function fecha(i){ return i ? new Date(i).toLocaleDateString(I18N.lang === 'es' ? 'es-ES' : 'ca-ES') : '—'; }
  function fechaH(i){ return i ? new Date(i).toLocaleString(I18N.lang === 'es' ? 'es-ES' : 'ca-ES', { dateStyle: 'short', timeStyle: 'short' }) : t('a_never'); }
  function copy(txt, btn){
    var done = function(){ var o = btn.textContent; btn.textContent = t('a_copied'); setTimeout(function(){ btn.textContent = o; }, 1500); };
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
  }
  function invite(f){ return t('a_msg', { c: f.codi, u: location.origin + '/' }); }
  var last = [];
  function langButtons(){
    var box = $('lang'); box.innerHTML = '';
    I18N.langs.forEach(function(l){ var b = el('button', I18N.lang === l ? 'on' : '', l.toUpperCase()); b.type = 'button'; b.onclick = function(){ I18N.set(l); apply(); }; box.appendChild(b); });
  }
  function apply(){
    document.querySelectorAll('[data-i]').forEach(function(n){ n.textContent = t(n.dataset.i); });
    $('et').placeholder = t('a_person_ph'); langButtons(); draw(last);
  }
  function card(f){
    var d = el('div', 'nou'), a = el('div'); a.appendChild(el('div', '', f.etiqueta)); a.appendChild(el('div', 'mono', f.codi)); d.appendChild(a);
    var b1 = el('button', 'btn ghost', t('a_copy')); b1.onclick = function(){ copy(f.codi, b1); };
    var b2 = el('button', 'btn', t('a_invite')); b2.onclick = function(){ copy(invite(f), b2); };
    d.appendChild(b1); d.appendChild(b2); $('nou').replaceChildren(d);
  }
  function draw(list){
    last = list;
    if(!list.length){ $('tab').replaceChildren(el('p', 'muted', t('a_none'))); return; }
    var tb = el('tbody');
    list.forEach(function(f){
      var tr = el('tr');
      [f.etiqueta].forEach(function(x){ tr.appendChild(el('td', '', x)); });
      var c = el('td'); c.appendChild(el('span', 'mono', f.codi)); tr.appendChild(c);
      tr.appendChild(el('td', '', fecha(f.creat))); tr.appendChild(el('td', '', f.caduca ? fecha(f.caduca + 'T12:00:00') : '—')); tr.appendChild(el('td', '', fechaH(f.ultimUs)));
      tr.appendChild(el('td', '', f.sessions)); tr.appendChild(el('td', '', f.enVivo || '—'));
      var s = el('td'); s.appendChild(el('span', 'st ' + f.estat, t('s_' + f.estat))); tr.appendChild(s);
      var ac = el('td');
      var bc = el('button', 'lk', t('a_copy')); bc.onclick = function(){ copy(f.codi, bc); };
      var bi = el('button', 'lk', t('a_invite')); bi.onclick = function(){ copy(invite(f), bi); };
      var br = el('button', 'lk' + (f.estat === 'revocat' ? '' : ' r'), f.estat === 'revocat' ? t('a_react') : t('a_revoke'));
      br.onclick = function(){ var rev = f.estat !== 'revocat'; if(rev && !confirm(t('a_confirm_revoke', { n: f.etiqueta }))) return;
        api('/api/admin/codis/' + f.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revocat: rev }) }).then(load).catch(function(e){ err(e.message); }); };
      var bd = el('button', 'lk r', t('a_delete'));
      bd.onclick = function(){ if(!confirm(t('a_confirm_del', { n: f.etiqueta }))) return; api('/api/admin/codis/' + f.id, { method: 'DELETE' }).then(load).catch(function(e){ err(e.message); }); };
      [bc, bi, br, bd].forEach(function(b){ ac.appendChild(b); }); tr.appendChild(ac); tb.appendChild(tr);
    });
    var th = el('thead'), hr = el('tr');
    ['a_person', 'a_code', 'a_created', 'a_expires', 'a_last', 'a_sessions', 'a_live', 'a_state', ''].forEach(function(k){ hr.appendChild(el('th', '', k ? t(k).replace(' (opcional)', '').replace(' (opcional)', '') : '')); });
    th.appendChild(hr);
    var tbl = el('table'); tbl.appendChild(th); tbl.appendChild(tb); $('tab').replaceChildren(tbl);
  }
  function load(){
    return Promise.all([api('/api/admin/codis'), api('/api/admin/estat')]).then(function(r){ $('status').textContent = t('a_status', { s: r[1].sessions, a: r[1].alumnes }); draw(r[0]); }).catch(function(e){ err(e.message); });
  }
  $('crea').onclick = function(){ err('');
    api('/api/admin/codis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etiqueta: $('et').value, caduca: $('cad').value || null }) })
      .then(function(f){ $('et').value = ''; $('cad').value = ''; card(f); return load(); }).catch(function(e){ err(e.message); }); };
  $('et').addEventListener('keydown', function(e){ if(e.key === 'Enter') $('crea').click(); });
  I18N.set(I18N.lang); apply(); load(); setInterval(load, 15000);
})();
