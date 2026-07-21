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
const _rateHits = new Map();

const ALLOWED_ORIGINS = [
  'https://www.calc-tools.top',
  'https://calc-tools.top',
  'http://localhost:3000',
  'http://localhost:5173'
];

function getClientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (_rateHits.get(ip) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  _rateHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

module.exports = async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : 'https://www.calc-tools.top');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 简单内存滑动窗口限速（基于来源 IP）
  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'too many requests' });
  }


  try {
    if (req.method === 'GET') {
      const searchParams = new URL(req.url, 'http://localhost').searchParams;
      const toolId = searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        const total = await rest('/get/click:tool:' + cleanId);
        return res.status(200).json({
          toolId: cleanId,
          total: parseInt(total || '0', 10),
        });
      }

      const keys = await rest('/keys/click:*');
      const result = {};
      if (keys && keys.length > 0) {
        for (const key of keys) {
          result[key] = parseInt((await rest('/get/' + key)) || '0', 10);
        }
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      let raw = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', resolve);
      });
      const body = (function() { try { return JSON.parse(raw); } catch(e) { return {}; } })();
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
