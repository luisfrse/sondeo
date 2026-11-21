'use strict';
// Pantalla de entrada del administrador: /admin sin credenciales desde un navegador, login con intentos restantes, sesion por cookie y cierre.
// La contrasena HTTP basica y el token de API no cambian (los cubren test/token.js y test/control-sso.js).
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const CLAVE = 'clave-admin-de-prueba';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (m) => console.log('  OK ' + m);
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sondeo-ent-')), port = 3194, B = 'http://127.0.0.1:' + port;
  const p = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_PASSWORD: CLAVE }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100 && !log.includes('escoltant'); i++) await dormir(100);
  const J = (r, b, h) => fetch(B + r, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.20', ...h }, body: JSON.stringify(b) });
  try {
    const pag = await fetch(B + '/admin', { headers: { Accept: 'text/html', 'X-Forwarded-For': '198.51.100.20' } });
    assert.strictEqual(pag.status, 401); assert.ok(!pag.headers.get('www-authenticate'), 'sin dialogo del navegador'); assert.ok((await pag.text()).includes('dc-entrada')); ok('/admin desde navegador sin credenciales: pantalla de entrada (401, sin WWW-Authenticate)');
    const api = await fetch(B + '/admin', { headers: { 'X-Forwarded-For': '198.51.100.20' } });
    assert.strictEqual(api.status, 401); assert.ok(api.headers.get('www-authenticate')); ok('clientes que no son navegador siguen recibiendo el desafio HTTP basico');
    const csp = pag.headers.get('content-security-policy'); assert.ok(/style-src 'self';/.test(csp) && !/unsafe-inline/.test(csp) && /font-src 'self'/.test(csp)); ok('CSP estricta (sin unsafe-inline ni fuentes externas)');
    const mal = await J('/api/admin-entrada/login', { password: 'no' }); const mj = await mal.json();
    assert.strictEqual(mal.status, 401); assert.strictEqual(mj.error, 'bad'); assert.strictEqual(mj.left, 4); ok('contrasena incorrecta: 401 con intentos restantes (4)');
    const bien = await J('/api/admin-entrada/login', { password: CLAVE }); assert.strictEqual(bien.status, 200);
    const ck = (bien.headers.getSetCookie() || []).find((c) => c.startsWith('asid=')); assert.ok(/HttpOnly/i.test(ck) && /SameSite=Lax/i.test(ck)); ok('contrasena correcta: cookie HttpOnly SameSite=Lax');
    const cookie = ck.split(';')[0];
    assert.strictEqual((await fetch(B + '/api/admin/codis', { headers: { Cookie: cookie } })).status, 200); ok('la cookie abre la API de codigos');
    const st = await (await fetch(B + '/api/admin-entrada/state', { headers: { Cookie: cookie } })).json(); assert.strictEqual(st.authed, true);
    await J('/api/admin-entrada/logout', {}, { Cookie: cookie });
    assert.notStrictEqual((await fetch(B + '/api/admin/codis', { headers: { Cookie: cookie } })).status, 200); ok('cerrar sesion invalida la cookie');
    for (let i = 0; i < 5; i++) await J('/api/admin-entrada/login', { password: 'x' + i }, { 'X-Forwarded-For': '198.51.100.21' });
    const bl = await J('/api/admin-entrada/login', { password: CLAVE }, { 'X-Forwarded-For': '198.51.100.21' }); const bj = await bl.json();
    assert.strictEqual(bl.status, 429); assert.ok(bj.wait > 0); ok('5 fallos: 429 con segundos de espera');
    console.log('ENTRADA DE ADMIN OK');
  } finally { p.kill(); await dormir(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* Windows */ } }
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
