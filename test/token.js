'use strict';
// Prueba del token de API de administracion de codigos (ADMIN_API_TOKEN, Authorization: Bearer).
// Uso: npm test
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAVE = 'clave-admin-de-prueba';
const BASIC = 'Basic ' + Buffer.from('admin:' + CLAVE).toString('base64');
const TOKEN = 'token-api-de-prueba-0123456789abcdef';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (m) => console.log('  OK ' + m);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sondeo-test-'));

async function arrancar(port, token, dir) {
  const env = { ...process.env, PORT: String(port), DATA_DIR: path.join(tmp, dir), ADMIN_PASSWORD: CLAVE };
  delete env.ADMIN_API_TOKEN; if (token) env.ADMIN_API_TOKEN = token;
  const p = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.log = ''; p.stdout.on('data', (d) => { p.log += d; }); p.stderr.on('data', (d) => { p.log += d; });
  for (let i = 0; i < 100 && !p.log.includes('escoltant'); i++) await dormir(100);
  assert.ok(p.log.includes('escoltant'), 'arranque');
  return p;
}
const call = (base, ruta, metodo, auth, cuerpo, ip) => fetch(base + ruta, {
  method: metodo || 'GET',
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}), ...(ip ? { 'X-Forwarded-For': ip } : {}) },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});

async function main() {
  console.log('Token de API activo');
  const p1 = await arrancar(3191, TOKEN, 'd1'); const B = 'http://127.0.0.1:3191'; const IP = '198.51.100.7';
  try {
    assert.strictEqual((await call(B, '/api/admin/codis', 'GET', 'Bearer ' + TOKEN, null, IP)).status, 200); ok('token correcto -> lista de codigos');
    assert.strictEqual((await call(B, '/api/admin/codis', 'GET', 'Bearer ' + TOKEN + 'x', null, IP)).status, 401); ok('token incorrecto -> 401');
    assert.strictEqual((await call(B, '/api/admin/codis', 'GET', 'Bearer ', null, IP)).status, 401); ok('Bearer vacio -> 401');
    assert.strictEqual((await call(B, '/admin', 'GET', 'Bearer ' + TOKEN, null, IP)).status, 401); ok('el token no vale en /admin');
    assert.strictEqual((await call(B, '/api/admin/estat', 'GET', 'Bearer ' + TOKEN, null, IP)).status, 401); ok('el token no vale en /api/admin/estat');
    const c = await call(B, '/api/admin/codis', 'POST', 'Bearer ' + TOKEN, { etiqueta: 'Por token' }, IP);
    assert.strictEqual(c.status, 200); const cj = await c.json(); assert.ok(cj.id);
    const r = await call(B, '/api/admin/codis/' + cj.id, 'PATCH', 'Bearer ' + TOKEN, { revocat: true }, IP);
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await call(B, '/api/admin/codis/' + cj.id, 'DELETE', 'Bearer ' + TOKEN, null, IP)).status, 200); ok('crear, revocar y borrar con token');
    assert.strictEqual((await call(B, '/api/admin/codis', 'GET', BASIC, null, IP)).status, 200);
    assert.strictEqual((await call(B, '/admin', 'GET', BASIC, null, IP)).status, 200); ok('la contrasena de siempre sigue funcionando');
    for (let i = 0; i < 5; i++) await call(B, '/api/admin/codis', 'GET', 'Bearer malo' + i, null, IP);
    assert.strictEqual((await call(B, '/api/admin/codis', 'GET', 'Bearer ' + TOKEN, null, IP)).status, 429); ok('el token comparte el limite de intentos erroneos (429)');
    assert.ok(!p1.log.includes(TOKEN)); ok('el token no aparece en el log');
  } finally { p1.kill(); await dormir(300); }

  for (const [tok, que, port] of [[undefined, 'sin ADMIN_API_TOKEN', 3192], ['corto-123', 'con ADMIN_API_TOKEN de menos de 24 caracteres', 3193]]) {
    console.log('Token desactivado ' + que);
    const p = await arrancar(port, tok, 'd' + port); const b = 'http://127.0.0.1:' + port;
    try {
      assert.strictEqual((await call(b, '/api/admin/codis', 'GET', 'Bearer ' + (tok || TOKEN))).status, 401);
      assert.strictEqual((await call(b, '/api/admin/codis', 'GET', BASIC)).status, 200);
      assert.ok(!p.log.includes(tok || TOKEN));
    } finally { p.kill(); await dormir(300); }
    ok('Bearer rechazado y la contrasena sigue valiendo');
  }
  console.log('\nTODAS LAS COMPROBACIONES CORRECTAS');
}
main().then(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* Windows */ } process.exit(0); })
  .catch((e) => { console.error('\nFALLO:', e); process.exit(1); });
