// Recorrido de Sondeo con un Chrome real (CDP): comprueba el flujo y hace capturas a 390 y 1200 px, claro y oscuro, con DATOS INVENTADOS.
// El servidor arranca aqui con una base temporal; no se toca ningun servicio real.
// Uso: node tools/capturas.mjs [carpeta]      (npm run capturas)      SIN_CAPTURAS=1 -> solo las comprobaciones (npm run e2e)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { openChrome, free, sleep } from './lib-chrome.mjs';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'capturas'));
const SIN = !!process.env.SIN_CAPTURAS;
const CLAVE = 'capturas-clave-de-prueba', IP = '203.0.113.9';
const port = await free(), base = 'http://localhost:' + port, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sondeo-cap-'));
const srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), DATA_DIR: path.join(tmp, 'data'), ADMIN_PASSWORD: CLAVE }, stdio: 'ignore' });
for (let i = 0; i < 100; i++) { try { await fetch('http://127.0.0.1:' + port + '/api/config'); break; } catch { await sleep(100); } }
const csp = (await fetch(base + '/')).headers.get('content-security-policy');
const BASIC = 'Basic ' + Buffer.from('admin:' + CLAVE).toString('base64');
const post = (u, b, h = {}) => fetch(base + u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': IP, ...h }, body: JSON.stringify(b) });
const ok = (m) => console.log('  OK ' + m);
if (!SIN) fs.mkdirSync(OUT, { recursive: true });

const B = await openChrome({ prefix: 'sondeo', csp: process.env.CSP_REESCRITA ? csp : undefined }); const { ev, waitFor, click, setVal, goto, media, send, log } = B;
const SIZES = [[390, 844], [1200, 900]], THEMES = ['claro', 'oscuro'];
let nshots = 0;
// ruido ajeno a la app: extensiones/antivirus locales (AdGuard), fuentes reescritas por el filtro y el 401 esperado de /admin sin credenciales
const noise = (l) => !/favicon|adguard|FETCHERR|status of 401/i.test(l);
async function shot(name) {
  if (SIN) return;
  for (const [w, hh] of SIZES) for (const th of THEMES) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: hh, deviceScaleFactor: 1, mobile: w < 600 }); await media(th); await sleep(700);
    const full = Math.min(3000, Math.max(hh, await ev('document.documentElement.scrollHeight')));
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: full, deviceScaleFactor: 1, mobile: w < 600 }); await sleep(250);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '-' + w + '-' + (th === 'claro' ? 'claro' : 'oscuro') + '.png'), Buffer.from(r.result.data, 'base64')); nshots++;
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }); await media('claro');
}
const clickText = (sel, txt) => ev(`(function(){var b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(function(x){return x.textContent.indexOf(${JSON.stringify(txt)})>=0});if(!b)return false;b.click();return true})()`);
async function hscroll() { return ev('document.documentElement.scrollWidth<=document.documentElement.clientWidth'); }

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }); await media('claro');
  console.log('Administracion');
  // datos inventados: codigos de invitacion
  const crea = async (etiqueta, caduca) => (await (await post('/api/admin/codis', { etiqueta, caduca }, { Authorization: BASIC })).json());
  const c1 = await crea('Marta Puig (IES Exemple)'), c2 = await crea('Joan Serra (Escola Prova)', '2027-06-30'), c3 = await crea('Laia Roca (Institut Mostra)');
  await fetch(base + '/api/admin/codis/' + c3.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: BASIC, 'X-Forwarded-For': IP }, body: JSON.stringify({ revocat: true }) });
  const nativos = []; // alert/confirm/prompt nativos quedarian anotados en log como DIALOGO NATIVO
  await goto(base + '/'); await ev('localStorage.setItem("sondeo.lang","ca")');
  await goto(base + '/admin');
  assert.ok(await waitFor('!!document.querySelector("#dc-entrada input[type=password]")'), 'pantalla de entrada del administrador (sin dialogo del navegador)'); ok('/admin sin credenciales muestra la pantalla de entrada comun');
  await shot('admin-entrada');
  await setVal('#dc-entrada input[type=password]', 'contrasena-equivocada'); await ev('document.querySelector("#dc-entrada form").requestSubmit()');
  assert.ok(await waitFor('/Quedan|Queden|Queda/.test(document.body.innerText)'), 'intentos restantes'); ok('contrasena incorrecta: error claro con intentos restantes');
  await shot('admin-entrada-error');
  await setVal('#dc-entrada input[type=password]', CLAVE); await ev('document.querySelector("#dc-entrada form").requestSubmit()');
  assert.ok(await waitFor('!!document.querySelector("#cform")'), 'admin tras entrar'); ok('contrasena correcta: sesion y panel de codigos');
  assert.ok(await waitFor('document.querySelectorAll("#codes .sd-crow").length===3')); ok('lista de codigos (3)');
  const rowEl = await ev('(function(){window.__row=document.querySelector("#codes .sd-crow");return true})()');
  await setVal('#et', 'Pau Vidal (Col·legi Demo)'); await ev('document.querySelector("#cform").requestSubmit()');
  assert.ok(await waitFor('!!document.querySelector("#nou .sd-new")')); ok('crear codigo muestra el codigo nuevo');
  await shot('admin');
  assert.ok(await ev('window.__row===document.querySelector("#codes .sd-crow")||document.body.contains(window.__row)'), 'filas se reutilizan'); ok('la lista se actualiza sin reconstruir las filas existentes');
  await clickText('#codes .dc-btn--secondary', 'Revocar'); await sleep(200);
  assert.ok(await waitFor('!!document.querySelector("dialog[open]")'), 'dialogo propio de revocar'); ok('revocar pide confirmacion con dialogo propio');
  await shot('admin-dialogo');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.ok(await waitFor('!document.querySelector("dialog[open]")')); ok('Esc cierra el dialogo');

  console.log('Profesor');
  await goto(base + '/');
  await ev('localStorage.clear(); localStorage.setItem("sondeo.lang","ca")'); await goto(base + '/');
  assert.ok(await waitFor('!!document.querySelector("#login:not([hidden])")')); await shot('login');
  await setVal('#lcode', 'AAAAA-BBBBB'); await ev('document.querySelector("#lform").requestSubmit()');
  assert.ok(await waitFor('/Et queden|Et queda/.test(document.querySelector("#lerr").innerText)')); ok('codigo erroneo: error con intentos restantes');
  await shot('login-error');
  await setVal('#lcode', c1.codi); await ev('document.querySelector("#lform").requestSubmit()');
  assert.ok(await waitFor('!!document.querySelector("#edit:not([hidden])")')); ok('codigo valido: editor');
  await clickText('button', 'Carregar exemple'); await sleep(300);
  assert.ok(await ev('document.querySelectorAll(".sd-slide").length===5')); ok('ejemplo cargado: 5 diapositivas');
  assert.ok(await hscroll()); await shot('editor');
  await ev('document.getElementById("start").click()');
  assert.ok(await waitFor('!document.querySelector("#pres[hidden]") && /^\\d{5}$/.test(document.getElementById("cd").textContent)')); ok('sesion creada: presentacion con QR y codigo');
  const code = await ev('document.getElementById("cd").textContent');
  // alumnos inventados (clientes ws) que contestan a todo
  const alumnos = [];
  const conectar = (c, cid) => new Promise((res) => { const w = new WebSocket(('ws://127.0.0.1:' + port) + '/ws'); w.on('open', () => { w.send(JSON.stringify({ t: 'hello', code: c, cid })); res(w); }); });
  for (let i = 0; i < 14; i++) alumnos.push(await conectar(code, 'alum' + i));
  const resp = (i, v) => { for (let k = 0; k < alumnos.length; k++) { const val = typeof v === 'function' ? v(k) : v; if (val != null) alumnos[k].send(JSON.stringify({ t: 'answer', id: 's' + i, v: val })); } };
  await sleep(500);
  const dots = () => ev('document.querySelectorAll(".sd-dot").length');
  assert.ok(await waitFor('document.querySelectorAll(".sd-dot").length===5'));
  const verTipo = async (i) => { await ev(`document.querySelectorAll(".sd-dot")[${i}].click()`); await waitFor(`document.querySelectorAll(".sd-dot")[${i}].getAttribute("aria-current")==="true"`); await sleep(500); };
  await verTipo(0); resp(0, (k) => [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 3, 0, 1, 1][k]); await sleep(900);
  assert.ok(await waitFor('document.querySelectorAll(".sd-bar").length===4'));
  await ev('(function(){window.__bar=document.querySelector(".sd-bar");window.__ws=document.getElementById("res").firstChild;return 1})()');
  resp(0, (k) => (k === 0 ? 3 : null)); await sleep(800);
  assert.ok(await ev('document.querySelector(".sd-bar")===window.__bar && document.getElementById("res").firstChild===window.__ws'), 'barras no reconstruidas'); ok('votar de nuevo actualiza las barras sin reconstruir el DOM');
  await shot('pres-votacion');
  await verTipo(1); resp(1, (k) => ['calma', 'ilusio', 'calma', 'repte', 'calma', 'ganes', 'ilusio', 'calma', 'futur', 'repte', 'calma', 'ganes', 'pau', 'ilusio'][k] ? [['calma', 'ilusio', 'calma', 'repte', 'calma', 'ganes', 'ilusio', 'calma', 'futur', 'repte', 'calma', 'ganes', 'pau', 'ilusio'][k]] : null); await sleep(900);
  await shot('pres-nube');
  await verTipo(2); resp(2, (k) => [1, 2, 3, 3, 4, 4, 4, 5, 5, 4, 3, 4, 5, 4][k]); await sleep(900);
  assert.ok(await ev('document.querySelectorAll(".sd-col").length===5')); await shot('pres-escala');
  await verTipo(3); resp(3, (k) => (k < 5 ? ['M\'ha sorprès la rapidesa.', 'Els exemples reals.', 'Poder preguntar sense vergonya.', 'La part de dades.', 'Res, ho sabia tot.'][k] : null)); await sleep(900);
  assert.ok(await waitFor('document.querySelectorAll(".sd-note").length===5')); await ev('window.__note=document.querySelector(".sd-note")');
  await ev('document.querySelector(".sd-note__star").click()'); await sleep(700);
  assert.ok(await ev('document.querySelector(".sd-note")===window.__note && window.__note.classList.contains("is-star")')); ok('destacar una nota actualiza el nodo sin reconstruir');
  await shot('pres-text');
  await verTipo(4);
  alumnos[0].send(JSON.stringify({ t: 'answer', id: 's4', v: 'Com es calcula la mitjana ponderada?' })); alumnos[1].send(JSON.stringify({ t: 'answer', id: 's4', v: 'Hi haurà examen final?' })); alumnos[2].send(JSON.stringify({ t: 'answer', id: 's4', v: 'On trobem els apunts?' })); await sleep(500);
  assert.ok(await waitFor('document.querySelectorAll(".sd-qi").length===3'));
  const qs = await ev('JSON.stringify([...document.querySelectorAll(".sd-qi__t")].map(function(x){return x.textContent}))');
  for (let k = 3; k < 9; k++) alumnos[k].send(JSON.stringify({ t: 'vote', id: 's4', q: 2 })); alumnos[5].send(JSON.stringify({ t: 'vote', id: 's4', q: 3 })); await sleep(900);
  await shot('pres-preguntes');
  ok('presentacion: votacion, nube, escala, respuestas abiertas y muro de preguntas');
  await clickText('button', 'Esborrar respostes'); await sleep(300);
  assert.ok(await waitFor('!!document.querySelector("dialog[open]")')); ok('esborrar respostes: dialogo propio');
  await shot('pres-dialogo');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await verTipo(0); alumnos.forEach((w) => w.close());

  console.log('Alumno');
  const tok = (await (await post('/api/acceso', { codi: c1.codi })).json()).token;
  const slides = [{ type: 'poll', q: 'Quin dia preferiu per a l\'excursió?', opts: ['Dilluns', 'Dimecres', 'Divendres'] }, { type: 'escala', q: 'Quant has après avui?', lo: 'Gens', hi: 'Molt' }, { type: 'nube', q: 'Una paraula per descriure la classe', max: 2 }, { type: 'text', q: 'Què canviaries?' }, { type: 'preguntes', q: 'Quins dubtes tens?' }];
  const cs = await (await post('/api/create', { slides }, { Authorization: 'Bearer ' + tok })).json(); assert.ok(cs.code);
  const host = await new Promise((res) => { const w = new WebSocket(('ws://127.0.0.1:' + port) + '/ws'); w.on('open', () => { w.send(JSON.stringify({ t: 'hello', code: cs.code, token: cs.token })); res(w); }); });
  const H = (o) => host.send(JSON.stringify(o));
  await goto(base + '/s');
  assert.ok(await waitFor('!!document.getElementById("jc")')); await shot('alumno-entrar');
  await setVal('#jc', '99999'); await sleep(600);
  assert.ok(await waitFor('/no existeix/.test(document.body.innerText)')); ok('codigo de sesion inexistente: error claro'); await shot('alumno-entrar-error');
  await goto(base + '/s/' + cs.code); await sleep(700);
  assert.ok(await waitFor('/tancada/.test(document.body.innerText)')); await shot('alumno-cerrado-inicio');
  H({ t: 'open', v: true }); await waitFor('!!document.querySelector(".sd-opt")');
  await ev('window.__main=document.getElementById("m").firstChild');
  await ev('document.querySelectorAll(".sd-opt")[1].click()'); await sleep(500);
  assert.ok(await ev('document.querySelectorAll(".sd-opt")[1].getAttribute("aria-pressed")==="true" && document.getElementById("m").firstChild===window.__main')); ok('votar marca la opcion sin reconstruir la pantalla');
  await shot('alumno-votacion');
  H({ t: 'go', idx: 1 }); H({ t: 'open', v: true }); await waitFor('!!document.querySelector(".sd-scale5")'); await ev('document.querySelectorAll(".sd-opt")[3].click()'); await sleep(500); await shot('alumno-escala');
  H({ t: 'go', idx: 2 }); H({ t: 'open', v: true }); await waitFor('document.querySelectorAll(".sd-fields input").length===2');
  await setVal('.sd-fields input', 'curiosa'); H({ t: 'open', v: true }); await sleep(500);
  assert.strictEqual(await ev('document.querySelector(".sd-fields input").value'), 'curiosa'); ok('lo escrito no se pierde cuando llegan actualizaciones');
  await shot('alumno-nube');
  H({ t: 'go', idx: 3 }); H({ t: 'open', v: true }); await waitFor('!!document.querySelector("textarea")'); await setVal('textarea', 'Més pràctiques en grup.'); await clickText('button', 'Enviar'); await sleep(500); await shot('alumno-text');
  H({ t: 'go', idx: 4 }); H({ t: 'open', v: true }); await waitFor('!!document.querySelector("textarea")'); await setVal('textarea', 'Quan és l\'entrega?'); await clickText('button', 'Enviar pregunta'); await sleep(600);
  assert.ok(await hscroll(), 'sin scroll horizontal'); await shot('alumno-preguntes');
  H({ t: 'open', v: false }); await sleep(500); await shot('alumno-tancada');
  H({ t: 'end' }); await waitFor('/ha acabat/.test(document.body.innerText)'); await shot('alumno-final'); ok('alumno: entrar, votar, escala, nube, texto, preguntas, cerrado y final');
  host.close();

  const malos = log.filter(noise); assert.deepStrictEqual(malos, [], 'consola limpia (sin violaciones de CSP ni dialogos nativos): ' + malos.join(' | ')); ok('consola sin errores ni violaciones de CSP, sin alert/confirm nativos');
  console.log(SIN ? '\nE2E OK' : '\nCapturas: ' + nshots + ' en ' + OUT);
} catch (e) { console.error('FALLO', e); console.error('LOG', log.filter(noise)); process.exitCode = 1; }
finally { await B.close(); srv.kill(); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows */ } process.exit(process.exitCode || 0); }
