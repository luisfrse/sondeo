'use strict';
/* Pegamento de la pantalla de entrada comun (/dc/entrada) para la administracion de Sondeo: solo contrasena.
   La contrasena y el limite de intentos son los de siempre (HTTP basica sigue valiendo para scripts); aqui se abre la misma sesion por cookie que el acceso unico de Control. */
(function () {
  var root = document.getElementById('dc-entrada');
  var lang = 'ca'; try { lang = localStorage.getItem('sondeo.lang') || ''; } catch (_) { /* sin almacenamiento */ }
  if (lang !== 'es' && lang !== 'ca') lang = /^es/i.test(navigator.language || '') ? 'es' : 'ca';
  document.documentElement.lang = lang;
  var TXT = { ca: { sub: 'Administració · codis d\'invitació', notice: 'Zona privada. Només per a l\'administrador.' }, es: { sub: 'Administración · códigos de invitación', notice: 'Zona privada. Solo para el administrador.' } }[lang];
  root.setAttribute('data-subtitle', TXT.sub); root.setAttribute('data-notice', TXT.notice);
  function fail(res, data) {
    var e = new Error((data && data.error) || 'http'); e.status = res ? res.status : 0; e.code = (data && data.error) || (res ? 'http' : 'network'); e.left = data && data.left; e.wait = data && data.wait; e.data = data || {}; return e;
  }
  async function call(path, body) {
    var res, data = {};
    try { res = await fetch('/api/admin-entrada' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); } catch (_) { throw fail(null, { error: 'network' }); }
    try { data = await res.json(); } catch (_) { data = {}; }
    if (!res.ok) throw fail(res, data);
    return data;
  }
  window.DCEntrada.init({ root: root, lang: lang, backend: {
    state: function () { return call('/state'); },
    login: async function (password) { await call('/login', { password: password }); return { need: [] }; },
    logout: async function () { try { await call('/logout', {}); } catch (_) { /* da igual */ } }
  } });
})();
