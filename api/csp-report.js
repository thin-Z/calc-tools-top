// api/csp-report.js
// Vercel Serverless Function — CSP 违规报告接收端点（P1P2-05）
// POST /api/csp-report → 204（不落盘，仅 console.log 结构化摘要）
// 非法 body → 400；超限 → 429；GET 等其他方法 → 405；超 16KB → 413
//
// 设计要点：
//  - 参照 api/likes.js 骨架：origin 白名单 CORS、每 IP 写限速 20/min。
//  - CSP 报告体通常大于点赞体，readBody 上限放宽到 16KB。
//  - Content-Type 支持 application/csp-report 与 application/json（浏览器两种都发）。
//  - 不落盘敏感数据：仅 console.log 结构化摘要（Vercel 函数日志即观测面）。

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;          // 写限速：20/min
const BODY_MAX_BYTES = 16 * 1024;   // CSP 报告体上限 16KB
const BODY_READ_TIMEOUT_MS = 2000;

const ALLOWED_ORIGINS = [
  'https://www.calc-tools.top',
  'https://calc-tools.top',
  'http://localhost:3000',
  'http://localhost:5173'
];

// 单实例内存回退：仅在未配置 KV_REST_API_URL 时启用（本地测试/开发）
const _rateHits = new Map();

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

// 写限速：每 IP 20/min。优先走 KV（多实例一致）；无 KV 时内存回退。
async function isRateLimited(ip) {
  if (process.env.KV_REST_API_URL) {
    const https = require('https');
    const http = require('http');
    const key = 'ratelimit:csp:' + ip;
    const url = new URL(process.env.KV_REST_API_URL + '/incrby/' + key);
    const mod = url.protocol === 'https:' ? https : http;
    const body = '1';
    const next = await new Promise((resolve) => {
      const req = mod.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (process.env.KV_REST_API_TOKEN || ''),
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed && parsed.result !== undefined ? parseInt(parsed.result, 10) : 0);
          } catch (e) { resolve(0); }
        });
      });
      req.on('error', () => resolve(0));
      req.setTimeout(5000, () => { req.destroy(); resolve(0); });
      req.write(body);
      req.end();
    });
    if (next === 1) {
      // 首增时设 TTL（60s 窗口）
      const expireUrl = new URL(process.env.KV_REST_API_URL + '/expire/' + key + '/60');
      const emod = expireUrl.protocol === 'https:' ? https : http;
      const ereq = emod.request({
        hostname: expireUrl.hostname,
        port: expireUrl.port || (expireUrl.protocol === 'https:' ? 443 : 80),
        path: expireUrl.pathname,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + (process.env.KV_REST_API_TOKEN || '') }
      }, (res) => { res.resume(); });
      ereq.on('error', () => {});
      ereq.end();
    }
    return next > RATE_LIMIT_MAX;
  }
  const now = Date.now();
  if (_rateHits.size > 10000) {
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

  // 仅接受 POST
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'method not allowed');
  }

  const clientIp = getClientIp(req);

  // 写限速 20/min
  if (await isRateLimited(clientIp)) {
    return jsonError(res, 429, 'too many requests');
  }

  // 读取 body（≤16KB）
  let raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return jsonError(res, e.message === 'payload too large' ? 413 : 400, e.message === 'payload too large' ? 'payload too large' : 'bad request');
  }
  if (!raw || !raw.trim()) {
    return jsonError(res, 400, 'empty body');
  }

  // 解析 JSON（浏览器可发 application/csp-report 或 application/json，均放行）
  let report;
  try {
    report = JSON.parse(raw);
  } catch (e) {
    return jsonError(res, 400, 'invalid JSON');
  }

  // 结构化摘要：只记录定位字段，不落盘敏感数据（Vercel 函数日志即观测面）
  const cspReport = report['csp-report'] || report;
  console.log('[csp-report]', JSON.stringify({
    ts: new Date().toISOString(),
    ip: clientIp,
    disposition: cspReport['disposition'] || '',
    directive: cspReport['violated-directive'] || cspReport['effective-directive'] || '',
    blockedURI: cspReport['blocked-uri'] || '',
    sourceFile: cspReport['source-file'] || '',
    line: cspReport['line-number'] || 0,
    column: cspReport['column-number'] || 0
  }));

  // 成功：204 无 body
  return res.status(204).end();
};
