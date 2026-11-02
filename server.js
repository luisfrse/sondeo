'use strict';
/* Sondeo · app de participació en directe (tipus Mentimeter)
   - Els professors entren amb un CODI D'INVITACIÓ que crea i revoca l'administrador a /admin.
   - Les respostes viuen només en memòria i s'esborren en tancar la sessió o als 6 h d'inactivitat.
   - L'única dada guardada a disc (SQLite) són els codis d'invitació: etiqueta, codi, dates i comptador de sessions. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const int = (n, d) => { const v = parseInt(process.env[n], 10); return v > 0 ? v : d; };
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const CONTACT_URL = process.env.CONTACT_URL || 'https://luisfs.com';
const MAX_SESSIONS = int('MAX_SESSIONS', 60), MAX_PER_CODE = int('MAX_SESSIONS_PER_CODE', 3), MAX_CLIENTS = int('MAX_CLIENTS', 400), IDLE_MS = 6 * 3600e3;
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD){ ADMIN_PASSWORD = crypto.randomBytes(9).toString('base64url'); console.warn('[Sondeo] ADMIN_PASSWORD no definida. Contrasenya temporal: ' + ADMIN_PASSWORD); }
const PUB = path.join(__dirname, 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.json':'application/json' };

const sessions = new Map();   // code -> session

/* ---------- base de dades: només codis d'invitació ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'sondeo-codis.db'));
db.exec(`CREATE TABLE IF NOT EXISTS codis (
  id INTEGER PRIMARY KEY AUTOINCREMENT, etiqueta TEXT NOT NULL, codi TEXT NOT NULL UNIQUE, creat TEXT NOT NULL,
  caduca TEXT, revocat INTEGER NOT NULL DEFAULT 0, ultim_us TEXT, sessions INTEGER NOT NULL DEFAULT 0)`);
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // sense 0/O/1/I
const genCodi = () => { let c = ''; for (let i = 0; i < 10; i++) c += ALFABET[crypto.randomInt(ALFABET.length)]; return c; };
const normCodi = t => String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
const fmtCodi = c => c.length === 10 ? c.slice(0, 5) + '-' + c.slice(5) : c;
const estat = f => f.revocat ? 'revocat' : (f.caduca && f.caduca < new Date().toISOString().slice(0, 10) ? 'caducat' : 'actiu');

/* sessions de professor (token en memòria, 12 h) */
const tokens = new Map();   // token -> { codiId, etiqueta, exp }
function tokenSession(h){
  const tk = String(h || '').startsWith('Bearer ') ? h.slice(7) : '';
  const s = tokens.get(tk); if (!s) return null;
  if (s.exp < Date.now()){ tokens.delete(tk); return null; }
  const f = db.prepare('SELECT * FROM codis WHERE id = ?').get(s.codiId);
  if (!f || estat(f) !== 'actiu'){ tokens.delete(tk); return null; }
  return s;
}
function lim(max, ms){
  const m = new Map();
  return { blocked: ip => { const e = m.get(ip); if (!e) return false; if (Date.now() - e.t > ms){ m.delete(ip); return false; } return e.n >= max; },
           fail: ip => { if (m.size > 20000) m.clear(); const e = m.get(ip); if (!e || Date.now() - e.t > ms) m.set(ip, { n: 1, t: Date.now() }); else e.n++; },
           ok: ip => m.delete(ip) };
}
const limAcces = lim(8, 15 * 60e3);
const ipOf = req => { const p = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); return p.length ? p[p.length - 1] : (req.socket.remoteAddress || '?'); };
function closeSessionsOf(codiId, why){
  for (const [t, s] of tokens) if (s.codiId === codiId) tokens.delete(t);
  sessions.forEach(se => { if (se.codiId === codiId) closeSession(se, why); });
}
const rowPub = f => ({ id: f.id, etiqueta: f.etiqueta, codi: fmtCodi(f.codi), creat: f.creat, caduca: f.caduca, ultimUs: f.ultim_us, sessions: f.sessions, estat: estat(f),
  enVivo: [...sessions.values()].filter(x => x.codiId === f.id).length });

function newCode(){
  for (let i = 0; i < 50; i++){
    const c = String(crypto.randomInt(10000, 100000));
    if (!sessions.has(c)) return c;
  }
  return null;
}
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

function cleanSlides(arr){
  if (!Array.isArray(arr)) return [];
  const out = [];
  arr.slice(0, 60).forEach((s, i) => {
    if (!s || typeof s !== 'object') return;
    const type = ['poll', 'nube', 'text', 'escala', 'preguntes'].includes(s.type) ? s.type : null;
    if (!type) return;
    const o = { id: 's' + i, type, q: clip(s.q, 200) || '' };
    if (type === 'poll') o.opts = (Array.isArray(s.opts) ? s.opts : []).map(x => clip(x, 80)).filter(Boolean).slice(0, 10);
    if (type === 'poll' && o.opts.length < 2) o.opts = ['A', 'B'];
    if (type === 'nube') o.max = Math.min(5, Math.max(1, parseInt(s.max, 10) || 3));
    if (type === 'escala'){ o.lo = clip(s.lo, 30); o.hi = clip(s.hi, 30); }
    out.push(o);
  });
  return out;
}

/* ---------- resultats ---------- */
function results(se, slide){
  const R = se.resp[slide.id] || new Map();
  if (slide.type === 'poll'){
    const c = slide.opts.map(() => 0);
    R.forEach(v => { if (c[v] !== undefined) c[v]++; });
    return { counts: c, total: R.size };
  }
  if (slide.type === 'escala'){
    const c = [0, 0, 0, 0, 0]; let sum = 0;
    R.forEach(v => { c[v - 1]++; sum += v; });
    return { counts: c, total: R.size, avg: R.size ? sum / R.size : 0 };
  }
  if (slide.type === 'nube'){
    const w = {};
    R.forEach(arr => arr.forEach(x => { w[x] = (w[x] || 0) + 1; }));
    return { words: w, total: R.size };
  }
  if (slide.type === 'preguntes'){
    const items = (se.qa[slide.id] || []).map(x => ({ id: x.id, t: x.t, v: x.votes.size, hidden: x.hidden, done: x.done }));
    return { list: items, total: R.size };
  }
  /* text */
  const list = [];
  R.forEach((arr, cid) => arr.forEach(m => list.push({ id: m.id, t: m.t, hidden: m.hidden, star: m.star })));
  list.sort((a, b) => a.id - b.id);
  return { list, total: R.size };
}

function pub(se){
  const slide = se.slides[se.idx] || null;
  return { t: 'state', code: se.code, idx: se.idx, n: se.slides.length, open: se.open, slide, students: se.students.size };
}
function send(ws, o){ if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function pushState(se){
  const st = pub(se);
  se.sockets.forEach(ws => { send(ws, st); if (ws !== se.host) sendMine(se, ws); });
  pushResults(se);
}
function pushResults(se){
  const slide = se.slides[se.idx];
  if (!slide) return;
  const msg = { t: 'results', id: slide.id, data: results(se, slide) };
  if (se.host && se.host.readyState === 1) send(se.host, msg);
  /* els alumnes només reben el recompte */
  pushQA(se);
  const cnt = { t: 'count', total: msg.data.total };
  se.sockets.forEach(ws => { if (ws !== se.host) send(ws, cnt); });
}
function qaFor(se, slide, cid){
  return (se.qa[slide.id] || []).filter(x => !x.hidden).map(x => ({ id: x.id, t: x.t, v: x.votes.size, me: x.votes.has(cid), own: x.cid === cid, done: x.done }))
    .sort((a, b) => (a.done - b.done) || (b.v - a.v) || (a.id - b.id));
}
function pushQA(se, now){
  const slide = se.slides[se.idx]; if (!slide || slide.type !== 'preguntes') return;
  if (!now){ if (se.qaTimer) return; se.qaTimer = setTimeout(() => { se.qaTimer = null; pushQA(se, true); }, 250); return; }
  se.sockets.forEach(ws => { if (ws !== se.host) send(ws, { t: 'qa', id: slide.id, list: qaFor(se, slide, ws._cid) }); });
}
function closeSession(se, why){
  se.sockets.forEach(ws => { send(ws, { t: 'ended', why }); try { ws.close(); } catch (_) {} });
  sessions.delete(se.code);
}

/* ---------- HTTP ---------- */
function readBody(req, max = 200000){
  return new Promise((res, rej) => {
    let b = ''; req.on('data', d => { b += d; if (b.length > max){ rej(new Error('big')); req.destroy(); } });
    req.on('end', () => res(b)); req.on('error', rej);
  });
}
function origin(req){
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return proto + '://' + (req.headers['x-forwarded-host'] || req.headers.host);
}
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');

    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

    if (p === '/api/config'){ return json(res, 200, { contactUrl: CONTACT_URL }); }

    if (p === '/api/acceso' && req.method === 'POST'){
      const ip = ipOf(req);
      if (limAcces.blocked(ip)) return json(res, 429, { err: 'many' });
      const body = JSON.parse(await readBody(req, 2000) || '{}');
      const c = normCodi(body.codi);
      const f = c ? db.prepare('SELECT * FROM codis WHERE codi = ?').get(c) : null;
      if (!f || estat(f) !== 'actiu'){ limAcces.fail(ip); return json(res, 401, { err: 'code' }); }
      limAcces.ok(ip);
      const token = crypto.randomBytes(24).toString('hex');
      tokens.set(token, { codiId: f.id, etiqueta: f.etiqueta, exp: Date.now() + 12 * 3600e3 });
      return json(res, 200, { token, etiqueta: f.etiqueta });
    }

    if (p === '/api/create' && req.method === 'POST'){
      const ses = tokenSession(req.headers.authorization);
      if (!ses) return json(res, 401, { err: 'auth' });
      const body = JSON.parse(await readBody(req) || '{}');
      if (sessions.size >= MAX_SESSIONS) return json(res, 503, { err: 'sessions' });
      const mine = [...sessions.values()].filter(x => x.codiId === ses.codiId);
      if (mine.length >= MAX_PER_CODE){                      // si en té massa, tanca la més antiga inactiva
        const old = mine.sort((x, y) => x.last - y.last)[0];
        if (Date.now() - old.last > 20 * 60e3) closeSession(old, 'ended'); else return json(res, 429, { err: 'limit', n: MAX_PER_CODE });
      }
      const slides = cleanSlides(body.slides);
      if (!slides.length) return json(res, 400, { err: 'noslides' });
      const code = newCode();
      const se = { codiId: ses.codiId, qa: {}, qaTimer: null, code, hostToken: crypto.randomBytes(16).toString('hex'), slides, idx: 0, open: false, resp: {}, students: new Set(), sockets: new Set(), host: null, last: Date.now(), msgId: 1 };
      sessions.set(code, se);
      db.prepare('UPDATE codis SET sessions = sessions + 1, ultim_us = ? WHERE id = ?').run(new Date().toISOString(), ses.codiId);
      return json(res, 200, { code, token: se.hostToken });
    }

    /* --- administració (Basic auth amb ADMIN_PASSWORD) --- */
    if (p === '/admin' || p.startsWith('/api/admin/')){
      const h = req.headers.authorization || '';
      let okA = false;
      if (h.startsWith('Basic ')){ const d = Buffer.from(h.slice(6), 'base64').toString('utf8'); const i = d.indexOf(':'); okA = safeEq(crypto.createHash('sha256').update(i >= 0 ? d.slice(i + 1) : d).digest('hex'), crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex')); }
      if (!okA){ res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Sondeo (administrador)", charset="UTF-8"', 'Content-Type': 'text/plain' }); return res.end('Cal contrasenya'); }
      if (p === '/admin'){ res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(fs.readFileSync(path.join(__dirname, 'views', 'admin.html'))); }
      if (p === '/api/admin/codis' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM codis ORDER BY id DESC').all().map(rowPub));
      if (p === '/api/admin/codis' && req.method === 'POST'){
        const b = JSON.parse(await readBody(req, 2000) || '{}');
        const et = clip(b.etiqueta, 60); if (!et) return json(res, 400, { err: 'label' });
        const cad = b.caduca ? String(b.caduca) : null; if (cad && !/^\d{4}-\d{2}-\d{2}$/.test(cad)) return json(res, 400, { err: 'date' });
        for (let i = 0; i < 10; i++){
          try { const r = db.prepare('INSERT INTO codis (etiqueta, codi, creat, caduca) VALUES (?,?,?,?)').run(et, genCodi(), new Date().toISOString(), cad);
                return json(res, 200, rowPub(db.prepare('SELECT * FROM codis WHERE id = ?').get(Number(r.lastInsertRowid)))); }
          catch (e){ if (!/UNIQUE/.test(String(e.message))) throw e; }
        }
        return json(res, 500, { err: 'bad' });
      }
      const mm = p.match(/^\/api\/admin\/codis\/(\d+)$/);
      if (mm){
        const id = parseInt(mm[1], 10), f = db.prepare('SELECT * FROM codis WHERE id = ?').get(id);
        if (!f) return json(res, 404, { err: 'bad' });
        if (req.method === 'PATCH'){
          const b = JSON.parse(await readBody(req, 2000) || '{}');
          if (typeof b.revocat === 'boolean'){ db.prepare('UPDATE codis SET revocat = ? WHERE id = ?').run(b.revocat ? 1 : 0, id); if (b.revocat) closeSessionsOf(id, 'revoked'); }
          if ('caduca' in b){ const c = b.caduca ? String(b.caduca) : null; if (c && !/^\d{4}-\d{2}-\d{2}$/.test(c)) return json(res, 400, { err: 'date' }); db.prepare('UPDATE codis SET caduca = ? WHERE id = ?').run(c, id); }
          return json(res, 200, rowPub(db.prepare('SELECT * FROM codis WHERE id = ?').get(id)));
        }
        if (req.method === 'DELETE'){ closeSessionsOf(id, 'revoked'); db.prepare('DELETE FROM codis WHERE id = ?').run(id); return json(res, 200, { ok: true }); }
      }
      if (p === '/api/admin/estat'){ let al = 0; sessions.forEach(x => { al += x.students.size; }); return json(res, 200, { sessions: sessions.size, alumnes: al }); }
      return json(res, 404, { err: 'bad' });
    }

    if (p === '/api/exists'){ return json(res, 200, { ok: sessions.has(url.searchParams.get('c')) }); }

    let m = p.match(/^\/qr\/(\d{5})\.svg$/);
    if (m){
      const svg = await QRCode.toString(origin(req) + '/s/' + m[1], { type: 'svg', margin: 1, color: { dark: '#0d1a2a', light: '#ffffff' } });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' }); return res.end(svg);
    }

    let file;
    if (p === '/') file = 'index.html';
    else if (p === '/s' || /^\/s\/\d{0,5}$/.test(p)) file = 's.html';
    else file = p.slice(1);
    const full = path.normalize(path.join(PUB, file));
    if (!full.startsWith(PUB + path.sep) && full !== PUB) { res.writeHead(403); return res.end(); }
    fs.readFile(full, (err, data) => {
      if (err){ res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('No trobat'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  } catch (e){
    json(res, 400, { err: 'bad' });
  }
});

/* ---------- WebSocket ---------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 20000 });
wss.on('connection', ws => {
  let se = null, isHost = false, cid = null, bucket = 30, lastTick = Date.now();
  ws.on('message', raw => {
    const now = Date.now();
    bucket = Math.min(30, bucket + (now - lastTick) / 100); lastTick = now;
    if (--bucket < 0) return;                      // límit de ritme
    let m; try { m = JSON.parse(raw); } catch (_) { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'hello'){
      se = sessions.get(String(m.code));
      if (!se){ send(ws, { t: 'ended', why: 'notfound' }); return ws.close(); }
      se.last = Date.now();
      if (m.token && safeEq(m.token, se.hostToken)){
        isHost = true;
        if (se.host && se.host !== ws){ try { se.host.close(); } catch (_) {} }
        se.host = ws;
      } else {
        if (se.students.size >= MAX_CLIENTS && !se.students.has(m.cid)){ send(ws, { t: 'ended', why: 'full' }); return ws.close(); }
        cid = clip(m.cid, 40) || crypto.randomBytes(8).toString('hex');
        se.students.add(cid); ws._cid = cid;
      }
      se.sockets.add(ws);
      send(ws, { ...pub(se), you: isHost ? 'host' : 'student' });
      if (isHost) pushResults(se); else sendMine(se, ws);
      se.host && send(se.host, { t: 'students', n: se.students.size });
      return;
    }
    if (!se) return;
    se.last = Date.now();
    const slide = se.slides[se.idx];

    if (isHost){
      if (m.t === 'go'){ const i = parseInt(m.idx, 10); if (i >= 0 && i < se.slides.length){ se.idx = i; se.open = false; pushState(se); } }
      else if (m.t === 'open'){ se.open = !!m.v; pushState(se); }
      else if (m.t === 'clear' && slide){ delete se.resp[slide.id]; delete se.qa[slide.id]; pushState(se); }
      else if ((m.t === 'hide' || m.t === 'done') && slide && slide.type === 'preguntes'){
        (se.qa[slide.id] || []).forEach(x => { if (x.id === m.id) { if (m.t === 'hide') x.hidden = !x.hidden; else x.done = !x.done; } });
        pushResults(se);
      }
      else if (m.t === 'hide' && slide && slide.type === 'text'){
        (se.resp[slide.id] || new Map()).forEach(arr => arr.forEach(x => { if (x.id === m.id) x.hidden = !x.hidden; }));
        pushResults(se);
      }
      else if (m.t === 'star' && slide && slide.type === 'text'){
        (se.resp[slide.id] || new Map()).forEach(arr => arr.forEach(x => { if (x.id === m.id) x.star = !x.star; }));
        pushResults(se);
      }
      else if (m.t === 'end'){ closeSession(se, 'ended'); }
      return;
    }

    /* alumne */
    if (m.t === 'vote' && slide && slide.type === 'preguntes' && se.open && m.id === slide.id){
      const it = (se.qa[slide.id] || []).find(x => x.id === m.q);
      if (!it || it.hidden || it.cid === cid) return;
      if (it.votes.has(cid)) it.votes.delete(cid); else it.votes.add(cid);
      (se.resp[slide.id] || (se.resp[slide.id] = new Map())).set(cid, true);
      return pushResults(se);
    }
    if (m.t === 'answer' && slide && slide.type === 'preguntes' && se.open && m.id === slide.id){
      const t = clip(m.v, 200); if (!t) return;
      const arr = se.qa[slide.id] || (se.qa[slide.id] = []);
      if (arr.filter(x => x.cid === cid).length >= 3) return send(ws, { t: 'limit' });
      arr.push({ id: se.msgId++, t, cid, hidden: false, done: false, votes: new Set() });
      (se.resp[slide.id] || (se.resp[slide.id] = new Map())).set(cid, true);
      send(ws, { t: 'ack', id: slide.id, v: arr.filter(x => x.cid === cid).length });
      return pushResults(se);
    }
    if (m.t === 'answer' && slide && se.open && m.id === slide.id){
      const R = se.resp[slide.id] || (se.resp[slide.id] = new Map());
      if (slide.type === 'poll'){
        const v = parseInt(m.v, 10); if (!(v >= 0 && v < slide.opts.length)) return; R.set(cid, v);
      } else if (slide.type === 'escala'){
        const v = parseInt(m.v, 10); if (!(v >= 1 && v <= 5)) return; R.set(cid, v);
      } else if (slide.type === 'nube'){
        const arr = [...new Set((Array.isArray(m.v) ? m.v : [m.v]).map(x => clip(x, 30).toLowerCase()).filter(Boolean))].slice(0, slide.max);
        if (!arr.length) return; R.set(cid, arr);
      } else {
        const t = clip(m.v, 240); if (!t) return;
        const arr = R.get(cid) || []; if (arr.length >= 3) return send(ws, { t: 'limit' });
        arr.push({ id: se.msgId++, t, hidden: false, star: false }); R.set(cid, arr);
      }
      send(ws, { t: 'ack', id: slide.id, v: slide.type === 'text' ? R.get(cid).length : R.get(cid) });
      pushResults(se);
    }
  });
  ws.on('close', () => {
    if (!se) return;
    se.sockets.delete(ws);
    if (isHost && se.host === ws) se.host = null;
    /* els alumnes continuen comptant com a "connectats" només mentre hi ha socket */
    if (!isHost && cid){
      let still = false; se.sockets.forEach(s => { if (s !== ws && s._cid === cid) still = true; });
      if (!still) se.students.delete(cid);
      se.host && send(se.host, { t: 'students', n: se.students.size });
    }
  });
  ws.on('error', () => {});
});
function sendMine(se, ws){
  const slide = se.slides[se.idx]; if (!slide) return;
  const v = (se.resp[slide.id] || new Map()).get(ws._cid);
  send(ws, { t: 'mine', id: slide.id, v: v === undefined ? null : (slide.type === 'text' ? v.length : slide.type === 'preguntes' ? (se.qa[slide.id] || []).filter(x => x.cid === ws._cid).length : v) });
  if (slide.type === 'preguntes') send(ws, { t: 'qa', id: slide.id, list: qaFor(se, slide, ws._cid) });
}

/* neteja de sessions inactives */
setInterval(() => { const now = Date.now(); sessions.forEach(se => { if (now - se.last > IDLE_MS) closeSession(se, 'idle'); }); }, 600e3).unref();

server.listen(PORT, () => console.log('Sondeo escoltant al port ' + PORT + ''));
