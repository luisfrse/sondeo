'use strict';
/* Sondeo · ayudas de interfaz: nodos, iconos, dialogos propios (nada de alert/confirm), avisos y herramientas de cabecera (idioma y tema). */
(function () {
  var seq = 0;
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) { if (c == null || c === false) return; if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; } e.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }
  function icon(name, cls) { var w = h('span', { class: 'dc-icon' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' }); if (window.DCIcons) w.appendChild(window.DCIcons.svg(name)); return w; }
  function t(k, v) { return window.I18N ? window.I18N.t(k, v) : k; }

  /* dialogo modal: promesa con el valor del boton (undefined con Esc) */
  function dialog(o) {
    return new Promise(function (resolve) {
      var id = 'dlg-' + (++seq), dlg = h('dialog', { class: 'dc-dialog', 'aria-labelledby': id }), done = false;
      function close(v) { if (done) return; done = true; try { dlg.close(); } catch (_) { /* ya cerrado */ } dlg.remove(); resolve(v); }
      var acts = (o.actions || []).map(function (a) { return h('button', { type: 'button', class: 'dc-btn dc-btn--' + (a.kind || 'secondary'), onclick: function () { close(a.value); } }, a.icon ? icon(a.icon) : null, a.label); });
      dlg.append(h('h2', { class: 'dc-card__title', id: id, text: o.title }), o.build ? o.build() : null, h('div', { class: 'dc-dialog__actions' }, acts));
      dlg.addEventListener('close', function () { close(undefined); }); dlg.addEventListener('cancel', function () { close(undefined); });
      document.body.appendChild(dlg); dlg.showModal();
      var first = dlg.querySelector('.dc-btn--primary, .dc-btn--danger, .dc-btn'); if (first) first.focus();
    });
  }
  function confirm(o) {
    return dialog({ title: o.title, build: function () { return h('p', { text: o.text }); },
      actions: [{ label: o.cancel || t('cancel'), kind: 'secondary', value: false }, { label: o.ok || t('ok'), kind: o.danger ? 'danger' : 'primary', value: true }] }).then(function (v) { return v === true; });
  }
  function toast(text, kind) {
    var box = document.querySelector('.dc-toasts');
    if (!box) { box = h('div', { class: 'dc-toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
    var n = h('div', { class: 'dc-toast' }, icon(kind === 'danger' ? 'x-circle' : 'check-circle'), h('span', { text: text }));
    box.appendChild(n); setTimeout(function () { n.remove(); }, 3500);
  }
  function alertBox(kind, text, role) { return h('div', { class: 'dc-alert dc-alert--' + kind, role: role || 'alert' }, icon(kind === 'ok' ? 'check-circle' : kind === 'danger' ? 'x-circle' : kind === 'warn' ? 'alert' : 'info'), h('div', { text: text })); }

  /* herramientas de cabecera: idioma y tema. onLang se llama al cambiar de idioma. */
  function themeNow() { var a = document.documentElement.getAttribute('data-theme'); if (a) return a; return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function tools(box, onLang) {
    function draw() {
      var lang = h('span', { class: 'sd-lang', role: 'group', 'aria-label': t('lang') });
      window.I18N.langs.forEach(function (l) {
        lang.appendChild(h('button', { type: 'button', class: 'dc-btn dc-btn--on-dark dc-btn--sm', 'aria-pressed': window.I18N.lang === l ? 'true' : 'false', 'aria-label': t('lang') + ' ' + l.toUpperCase(), text: l.toUpperCase(),
          onclick: function () { window.I18N.set(l); draw(); if (onLang) onLang(); } }));
      });
      var dark = themeNow() === 'dark';
      var th = h('button', { type: 'button', class: 'dc-btn dc-btn--on-dark dc-btn--icon', 'aria-label': t(dark ? 'theme_light' : 'theme_dark'), title: t(dark ? 'theme_light' : 'theme_dark'),
        onclick: function () { var n = themeNow() === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('sondeo.tema', n); } catch (_) { /* sin almacenamiento */ } draw(); } }, icon(dark ? 'sun' : 'moon'));
      var extra = box.__extra ? box.__extra() : [];
      box.replaceChildren.apply(box, extra.concat([lang, th]));
    }
    draw(); return draw;
  }
  window.UI = { h: h, icon: icon, dialog: dialog, confirm: confirm, toast: toast, alertBox: alertBox, tools: tools };
})();
