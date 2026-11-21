(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var t = function (k, v) { return I18N.t(k, v); };
  var h = UI.h, icon = UI.icon;
  function loc() { return I18N.lang === 'es' ? 'es-ES' : 'ca-ES'; }
  function api(url, opt) { return fetch(url, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(t('err_' + (d.err || 'bad'))); return d; }); }); }
  function err(m) { $('err').replaceChildren(m ? UI.alertBox('danger', m) : ''); }
  function fecha(i) { return i ? new Date(i).toLocaleDateString(loc()) : '—'; }
  function fechaH(i) { return i ? new Date(i).toLocaleString(loc(), { dateStyle: 'short', timeStyle: 'short' }) : t('a_never'); }
  function copy(txt) {
    var ok = function () { UI.toast(t('a_copied')); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
  }
  function invite(f) { return t('a_msg', { c: f.codi, u: location.origin + '/' }); }
  var last = [], stat = { sessions: 0, alumnes: 0 }, rows = new Map();

  function logout() { fetch('/api/admin-entrada/logout', { method: 'POST' }).catch(function () { /* da igual */ }).then(function () { location.href = '/admin'; }); }
  var redrawTools = UI.tools($('tools'), apply);
  $('tools').__extra = function () { return [h('a', { class: 'dc-btn dc-btn--on-dark', href: '/' }, icon('arrow-right'), t('a_open')), h('button', { type: 'button', class: 'dc-btn dc-btn--on-dark', onclick: logout }, icon('log-out'), t('a_logout'))]; };

  function apply() {
    document.querySelectorAll('[data-i]').forEach(function (n) { n.textContent = t(n.dataset.i); });
    document.title = 'Sondeo · Admin'; drawStats(); rows.forEach(function (n) { n.remove(); }); rows = new Map(); draw(last);
  }
  function drawStats() {
    $('stats').replaceChildren(
      h('span', { class: 'dc-chip dc-chip--info' }, icon('activity'), stat.sessions + ' ' + t('a_stat_s')),
      h('span', { class: 'dc-chip dc-chip--info' }, icon('users'), stat.alumnes + ' ' + t('a_stat_a')));
  }
  function card(f) {
    var b1 = h('button', { type: 'button', class: 'dc-btn dc-btn--secondary', onclick: function () { copy(f.codi); } }, icon('copy'), t('a_copy'));
    var b2 = h('button', { type: 'button', class: 'dc-btn dc-btn--primary', onclick: function () { copy(invite(f)); } }, icon('mail'), t('a_invite'));
    $('nou').replaceChildren(h('div', { class: 'dc-card sd-new', role: 'status' }, h('div', null, h('div', { class: 'dc-small dc-muted', text: t('a_new_t') + ' · ' + f.etiqueta }), h('div', { class: 'sd-code', text: f.codi })), h('div', { class: 'sd-actions' }, b1, b2)));
  }
  function mk() {
    var who = h('div', { class: 'sd-crow__who' }), code = h('div', { class: 'sd-crow__code' }), chip = h('span', { class: 'dc-chip dc-chip--dot' }), meta = h('div', { class: 'sd-crow__meta' });
    var bc = h('button', { type: 'button', class: 'dc-btn dc-btn--secondary' }, icon('copy'), t('a_copy'));
    var bi = h('button', { type: 'button', class: 'dc-btn dc-btn--secondary' }, icon('mail'), t('a_invite'));
    var br = h('button', { type: 'button', class: 'dc-btn dc-btn--secondary' }), bd = h('button', { type: 'button', class: 'dc-btn dc-btn--danger' }, icon('trash'), t('a_delete'));
    var n = h('article', { class: 'dc-card sd-crow' }, h('div', { class: 'dc-stack--sm' }, who, h('div', { class: 'dc-row' }, code, chip)), h('div', { class: 'sd-crow__ac' }, bc, bi, br, bd), meta);
    n.__r = { who: who, code: code, chip: chip, meta: meta, br: br };
    bc.onclick = function () { copy(n.__f.codi); }; bi.onclick = function () { copy(invite(n.__f)); };
    br.onclick = function () {
      var f = n.__f, rev = f.estat !== 'revocat';
      var go = function () { api('/api/admin/codis/' + f.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revocat: rev }) }).then(load).catch(function (e) { err(e.message); }); };
      if (!rev) return go();
      UI.confirm({ title: t('a_confirm_revoke_t'), text: t('a_confirm_revoke', { n: f.etiqueta }), ok: t('a_revoke'), danger: true }).then(function (v) { if (v) go(); });
    };
    bd.onclick = function () {
      var f = n.__f;
      UI.confirm({ title: t('a_confirm_del_t'), text: t('a_confirm_del', { n: f.etiqueta }), ok: t('a_delete'), danger: true }).then(function (v) { if (v) api('/api/admin/codis/' + f.id, { method: 'DELETE' }).then(load).catch(function (e) { err(e.message); }); });
    };
    return n;
  }
  function draw(list) {
    last = list; $('empty').hidden = list.length > 0;
    var box = $('codes'), seen = new Set(), prev = null;
    list.forEach(function (f) {
      var n = rows.get(f.id); if (!n) { n = mk(); rows.set(f.id, n); }
      n.__f = f; seen.add(f.id); var x = n.__r, rev = f.estat === 'revocat';
      x.who.textContent = f.etiqueta; x.code.textContent = f.codi;
      x.chip.textContent = t('s_' + f.estat); x.chip.className = 'dc-chip dc-chip--dot ' + (f.estat === 'actiu' ? 'dc-chip--ok' : 'dc-chip--danger');
      x.meta.replaceChildren.apply(x.meta, [h('span', { text: t('a_created_n', { d: fecha(f.creat) }) }), f.caduca ? h('span', { text: t('a_exp_n', { d: fecha(f.caduca + 'T12:00:00') }) }) : null,
        h('span', { text: t('a_last_n', { d: fechaH(f.ultimUs) }) }), h('span', { text: t('a_sessions_n', { n: f.sessions }) }), f.enVivo ? h('span', { text: t('a_live_n', { n: f.enVivo }) }) : null].filter(Boolean));
      x.br.replaceChildren(icon(rev ? 'refresh' : 'lock'), rev ? t('a_react') : t('a_revoke'));
      var want = prev ? prev.nextSibling : box.firstChild; if (n !== want) box.insertBefore(n, want); prev = n;
    });
    rows.forEach(function (n, id) { if (!seen.has(id)) { n.remove(); rows.delete(id); } });
  }
  function load() {
    return Promise.all([api('/api/admin/codis'), api('/api/admin/estat')]).then(function (r) { stat = r[1]; drawStats(); draw(r[0]); err(''); })
      .catch(function (e) { err(e.message || t('err_load')); });
  }
  $('cform').addEventListener('submit', function (e) {
    e.preventDefault(); err(''); var b = $('crea'); b.setAttribute('aria-busy', 'true'); b.disabled = true;
    api('/api/admin/codis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etiqueta: $('et').value, caduca: $('cad').value || null }) })
      .then(function (f) { $('et').value = ''; $('cad').value = ''; $('et').removeAttribute('aria-invalid'); card(f); return load(); })
      .catch(function (e2) { err(e2.message); $('et').setAttribute('aria-invalid', 'true'); $('et').focus(); })
      .then(function () { b.removeAttribute('aria-busy'); b.disabled = false; });
  });
  I18N.set(I18N.lang); apply(); load(); setInterval(load, 15000);
})();
