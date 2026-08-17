// api/clicks.js
// Vercel Serverless Function — 点击量 API
// GET  /api/clicks?toolId=xxx  → 返回单个工具总点击量
// POST /api/clicks              → 点击 +1，返回最新总数

const https = require('https');

const REST_URL = process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || '';

// 兼容本地 KV 模拟服务器（node:test 零依赖测试）：按 URL 协议选择 http/https，
// 端口取自 URL，未指定时使用默认端口。生产环境 KV_REST_API_URL 为 https，行为不变。
function rest(path) {
  return new Promise((resolve) => {
    if (!REST_URL) return resolve(null);
    const url = new URL(REST_URL + path);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : require('http');
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + REST_TOKEN },
    };
    const req = mod.request(options, (res) => {
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
const RATE_LIMIT_MAX = 20;          // 写（POST）限速：20/min
const RATE_LIMIT_READ_MAX = 120;    // 读（GET）限速：120/min，首页批量拉取计数不触发写限速
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

// 限速检查：读（GET）与写（POST）使用独立窗口与配额，
// 首页批量拉取点击计数不再触发 20/min 写限速。
async function isRateLimited(ip, isRead) {
  const max = isRead ? RATE_LIMIT_READ_MAX : RATE_LIMIT_MAX;
  if (REST_URL) {
    const key = 'ratelimit:clicks:' + (isRead ? 'r:' : 'w:') + ip;
    // INCR 原子递增，杜绝并发读改写（TOCTOU）绕过限速；首增时设 TTL
    const next = parseInt((await rest('/incr/' + key + '/1')) || '0', 10);
    if (next === 1) {
      await rest('/expire/' + key + '/' + Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    }
    return next > max;
  }
  const now = Date.now();
  // 内存回退：惰性清理过期条目 + 限制 Map 无界增长
  if (_rateHits.size > 10000) {
    for (const k of Array.from(_rateHits.keys())) {
      const alive = (_rateHits.get(k) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
      if (alive.length === 0) _rateHits.delete(k);
    }
  }
  const hitsKey = (isRead ? 'r:' : 'w:') + ip;
  const hits = (_rateHits.get(hitsKey) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  _rateHits.set(hitsKey, hits);
  return hits.length > max;
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
        req.destroy(); // 停止继续累积内存
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
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = getClientIp(req);
  const isRead = req.method === 'GET';

  // 限速（基于来源 IP，读写分开配额）
  if (await isRateLimited(clientIp, isRead)) {
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
      if (!cleanId) return res.status(400).json({ error: 'invalid toolId' });
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
      if (!cleanId) return res.status(400).json({ error: 'invalid toolId' });

      // 工具 ID 白名单：仅允许已注册的工具/博客 id 写入，防止对任意 id 污染 KV
      const ALLOWED = require('./allowed-ids');
      if (process.env.ID_WHITELIST_OFF !== '1' && !ALLOWED.TOOL_IDS.has(cleanId) && !ALLOWED.BLOG_IDS.has(cleanId)) {
        return res.status(403).json({ error: 'unknown toolId' });
      }
      const key = 'click:tool:' + cleanId;

      // INCR 原子递增，杜绝并发读改写（TOCTOU）丢计数
      const total = parseInt((await rest('/incr/' + key + '/1')) || '0', 10);
      // INCR 不设 TTL，写入后刷新 365 天 TTL，防止无界存储放大
      await rest('/expire/' + key + '/31536000');

      return res.status(200).json({ toolId: cleanId, total });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'internal error' });
  }
};
