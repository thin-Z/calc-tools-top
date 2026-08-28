// api/error-report.js
// Vercel Serverless Function — 前端 JS 错误上报端点（Phase 5 T5.1）
// POST /api/error-report → 204（不落盘，仅 console.log 结构化摘要）
// 非法 body → 400；超限 → 429；GET 等其他 → 405；超 16KB → 413
//
// 设计要点：
//  - 参照 api/csp-report.js 骨架：origin 白名单 CORS、每 IP 写限速 60/min、readBody 上限 16KB。
//  - 接收前端 window.onerror / unhandledrejection 捕获的错误，仅 console.log（Vercel 函数日志即观测面）。
//  - 与 csp-report 分开，避免 CSP 违规与 JS 错误混淆。

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const BODY_MAX_BYTES = 16 * 1024;
const BODY_READ_TIMEOUT_MS = 2000;

const ALLOWED_ORIGINS = [
  'https://www.calc-tools.top',
  'https://calc-tools.top',
  'http://localhost:3000',
  'http://localhost:5173'
];

function getClientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) {
    const segs = String(xff).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (segs.length) return segs[segs.length - 1];
  }
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  return 'unknown';
}

const RATE_LIMIT_MAX = 60;
const _rateHits = new Map();

async function isRateLimited(ip) {
  const now = Date.now();
  if (_rateHits.size > 20000) {
    for (const k of Array.from(_rateHits.keys())) {
      const alive = (_rateHits.get(k) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
      if (alive.length === 0) _rateHits.delete(k);
    }
  }
  const hits = (_rateHits.get(ip) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  _rateHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const len = parseInt((req.headers && req.headers['content-length']) || '0', 10);
    if (len > BODY_MAX_BYTES) { reject(new Error('payload too large')); return; }
    let raw = '';
    let done = false;
    const timer = setTimeout(function () { if (done) return; done = true; reject(new Error('read timeout')); }, BODY_READ_TIMEOUT_MS);
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > BODY_MAX_BYTES && !done) {
        done = true; clearTimeout(timer); reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => { if (done) return; done = true; clearTimeout(timer); resolve(raw); });
    req.on('error', () => { if (done) return; done = true; clearTimeout(timer); reject(new Error('read error')); });
  });
}

function jsonError(res, status, message) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json({ error: message });
}

module.exports = async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : 'https://www.calc-tools.top');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'method not allowed');

  const clientIp = getClientIp(req);
  if (await isRateLimited(clientIp)) return jsonError(res, 429, 'too many requests');

  let raw;
  try { raw = await readBody(req); }
  catch (e) { return jsonError(res, e.message === 'payload too large' ? 413 : 400, e.message === 'payload too large' ? 'payload too large' : 'bad request'); }
  if (!raw || !raw.trim()) return jsonError(res, 400, 'empty body');

  let data;
  try { data = JSON.parse(raw); }
  catch (e) { return jsonError(res, 400, 'invalid JSON'); }

  // 结构化摘要：只记录定位字段（Vercel 函数日志即观测面）
  console.log('[error-report]', JSON.stringify({
    ts: new Date().toISOString(),
    ip: clientIp,
    type: data.type || 'error',
    message: (data.message || '').slice(0, 300),
    source: data.source || '',
    lineno: data.lineno || 0,
    colno: data.colno || 0,
    ua: (data.userAgent || '').slice(0, 120),
    url: (data.pageUrl || '').slice(0, 200)
  }));

  return res.status(204).end();
};
