'use strict';
/* Tema claro/oscuro: sigue al sistema salvo que se haya elegido uno a mano (solo en este navegador). Va en <head> y sin defer para que no parpadee. */
(function () {
  var t = null;
  try { t = localStorage.getItem('sondeo.tema'); } catch (_) { /* sin almacenamiento: automatico */ }
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
})();
