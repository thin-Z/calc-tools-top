// api/clicks.js
// Vercel Serverless Function — 点击量 API
// GET  /api/clicks?toolId=xxx  → 返回单个工具总点击量
// POST /api/clicks              → 点击 +1，返回最新总数

const https = require('https');

const REST_URL = process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || '';

function rest(path) {
  return new Promise((resolve) => {
    if (!REST_URL) return resolve(null);
    const url = new URL(REST_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + REST_TOKEN },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && parsed.result !== undefined ? parsed.result : null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
// 单实例内存回退：仅在未配置 KV_REST_API_URL 时启用；多实例部署下不保证全局限速。
const _rateHits = new Map();

const BODY_MAX_BYTES = 1024;        // POST 请求体上限 1KB
const BODY_READ_TIMEOUT_MS = 2000;  // 流式读取超时 2s

const ALLOWED_ORIGINS = [
  'https://www.calc-tools.top',
  'https://calc-tools.top',
  'http://localhost:3000',
  'http://localhost:5173'
];

// 取可信客户端 IP：X-Forwarded-For 最右一段由受信代理（Vercel）追加，
// 客户端可伪造左侧任意段，因此只信任最右段；缺失时回退 socket 地址。
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

// 限速检查：优先使用 KV（跨实例共享），未配置 KV 时回退内存单实例窗口。
async function isRateLimited(ip) {
  if (REST_URL) {
    const key = 'ratelimit:clicks:' + ip;
    const cur = parseInt((await rest('/get/' + key)) || '0', 10);
    const next = cur + 1;
    await rest('/set/' + key + '/' + next + '/EX/' + Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return next > RATE_LIMIT_MAX;
  }
  const now = Date.now();
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
    const timer = setTimeout(function () {
      if (done) return;
      done = true;
      reject(new Error('read timeout'));
    }, BODY_READ_TIMEOUT_MS);
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > BODY_MAX_BYTES && !done) {
        done = true; clearTimeout(timer); reject(new Error('payload too large'));
      }
    });
    req.on('end', () => { if (done) return; done = true; clearTimeout(timer); resolve(raw); });
    req.on('error', () => { if (done) return; done = true; clearTimeout(timer); reject(new Error('read error')); });
  });
}

module.exports = async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : 'https://www.calc-tools.top');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = getClientIp(req);

  // 限速（基于来源 IP）
  if (await isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'too many requests' });
  }

  try {
    if (req.method === 'GET') {
      const searchParams = new URL(req.url, 'http://localhost').searchParams;
      const toolId = searchParams.get('toolId');

      // 缺少 toolId 时禁止全量枚举（避免无分页的数据泄露）
      if (!toolId) {
        return res.status(403).json({ error: 'toolId is required' });
      }

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const total = await rest('/get/click:tool:' + cleanId);
      return res.status(200).json({
        toolId: cleanId,
        total: parseInt(total || '0', 10),
      });
    }

    if (req.method === 'POST') {
      let raw;
      try {
        raw = await readBody(req);
      } catch (e) {
        return res.status(413).json({ error: 'payload too large or read timeout' });
      }
      const body = (function () { try { return JSON.parse(raw); } catch (e) { return {}; } })();
      const toolId = body && body.toolId;

      if (!toolId) return res.status(400).json({ error: 'missing toolId' });

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = 'click:tool:' + cleanId;

      let total = parseInt((await rest('/get/' + key)) || '0', 10);
      total += 1;
      await rest('/set/' + key + '/' + total);

      return res.status(200).json({ toolId: cleanId, total });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'internal error' });
  }
};
