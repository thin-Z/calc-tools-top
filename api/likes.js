// api/likes.js
// Vercel Serverless Function — 点赞 API
// GET  /api/likes?toolId=xxx  → 返回单个工具点赞数
// POST /api/likes              → 点赞 +1 或取消 -1

const https = require('https');

const REST_URL = process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || '';

// 兼容本地 KV 模拟服务器（node:test 零依赖测试）：按 URL 协议选择 http/https，
// 端口取自 URL，未指定时使用默认端口。生产环境 KV_REST_API_URL 为 https，行为不变。
// method/body 可选：写命令（INCRBY）用 POST + 裸数字 body（Upstash REST 约定）。
function rest(path, method, body) {
  return new Promise((resolve) => {
    if (!REST_URL) return resolve(null);
    const url = new URL(REST_URL + path);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : require('http');
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method || 'GET',
      headers: { 'Authorization': 'Bearer ' + REST_TOKEN },
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(String(body));
    }
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
    if (body !== undefined) req.write(String(body));
    req.end();
  });
}

// Upstash REST MGET：POST /mget，body 为 key 数组，返回 values 数组（缺失为 null）
async function restMGet(keys) {
  if (!REST_URL || !keys.length) return [];
  const body = JSON.stringify(keys);
  const result = await rest('/mget', 'POST', body);
  return Array.isArray(result) ? result : [];
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;          // 写（POST）限速：20/min
const RATE_LIMIT_READ_MAX = 600;    // 读（GET）限速：600/min。读限速走内存（不消耗 KV 配额）
// 读限速内存实现（不消耗 Upstash KV 配额——免费层 10K/天，读计数不应占用配额）。
// 写限速保持 KV 全局一致（防刷核心），读限速用内存即可。
const _rateHits = new Map();

const BODY_MAX_BYTES = 1024;        // POST 请求体上限 1KB
const BODY_READ_TIMEOUT_MS = 2000;  // 流式读取超时 2s
const LIKE_DAILY_MAX = 5;           // 每 IP 每工具每日 ±次数上限（防刷）

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

// 限速检查：读（GET）与写（POST）使用独立窗口与配额。
// 读限速走内存（不消耗 KV 配额，防爬已足够）；写限速走 KV（多实例全局一致，防刷核心）。
async function isRateLimited(ip, isRead) {
  const max = isRead ? RATE_LIMIT_READ_MAX : RATE_LIMIT_MAX;
  if (isRead) {
    const now = Date.now();
    if (_rateHits.size > 20000) {
      for (const k of Array.from(_rateHits.keys())) {
        const alive = (_rateHits.get(k) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
        if (alive.length === 0) _rateHits.delete(k);
      }
    }
    const hitsKey = 'r:' + ip;
    const hits = (_rateHits.get(hitsKey) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
    hits.push(now);
    _rateHits.set(hitsKey, hits);
    return hits.length > max;
  }
  if (REST_URL) {
    const key = 'ratelimit:likes:w:' + ip;
    // INCR 原子递增，杜绝并发读改写（TOCTOU）绕过限速；首增时设 TTL
    const next = parseInt((await rest('/incrby/' + key, 'POST', '1')) || '0', 10);
    if (next === 1) {
      await rest('/expire/' + key + '/' + Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    }
    return next > max;
  }
  const now = Date.now();
  if (_rateHits.size > 20000) {
    for (const k of Array.from(_rateHits.keys())) {
      const alive = (_rateHits.get(k) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
      if (alive.length === 0) _rateHits.delete(k);
    }
  }
  const hitsKey = 'w:' + ip;
  const hits = (_rateHits.get(hitsKey) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  _rateHits.set(hitsKey, hits);
  return hits.length > max;
}

// 点赞防刷：每 IP 每工具每日上限 LIKE_DAILY_MAX 次（含 +1/-1 动作）
async function isLikeAbuse(ip, toolId) {
  if (!REST_URL) return false; // 无 KV 时不强制每日上限
  const day = new Date().toISOString().slice(0, 10);
  const key = 'likecap:' + ip + ':' + toolId + ':' + day;
  const next = parseInt((await rest('/incrby/' + key, 'POST', '1')) || '0', 10);
  if (next === 1) await rest('/expire/' + key + '/86400');
  return next > LIKE_DAILY_MAX;
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

  if (await isRateLimited(clientIp, isRead)) {
    return res.status(429).json({ error: 'too many requests' });
  }

  try {
    if (req.method === 'GET') {
      const searchParams = new URL(req.url, 'http://localhost').searchParams;
      const toolId = searchParams.get('toolId');
      const tools = searchParams.get('tools');

      // 批量查询：?tools=a,b,c → { "a": 1, "b": 2 }（单次 MGET 取全部）
      if (tools) {
        const ids = tools.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ids.length) return res.status(400).json({ error: 'invalid tools' });
        const cleanIds = [];
        for (const id of ids) {
          const clean = id.replace(/[^a-zA-Z0-9_-]/g, '');
          if (clean && cleanIds.indexOf(clean) === -1) cleanIds.push(clean);
        }
        if (!cleanIds.length) return res.status(400).json({ error: 'invalid tools' });
        // 工具与博客 key 混合批量：每个 id 先查工具 key，miss 再查博客 key。
        // 并发 GET 每个 key：Upstash REST 的 /mget 端点不可靠（返回空/全 null），改用单 key GET 并行。
        const toolKeys = cleanIds.map(function (id) { return 'like:tool:' + id; });
        const blogKeys = cleanIds.map(function (id) { return 'like:blog:' + id; });
        const toolVals = await Promise.all(toolKeys.map(function (key) {
          return rest('/get/' + key);
        }));
        const blogVals = await Promise.all(blogKeys.map(function (key) {
          return rest('/get/' + key);
        }));
        const out = {};
        cleanIds.forEach(function (id, i) {
          const v = toolVals[i] !== null && toolVals[i] !== undefined ? toolVals[i] : blogVals[i];
          out[id] = Math.max(0, parseInt(v || '0', 10));
        });
        return res.status(200).json({ tools: out });
      }

      // 缺少 toolId 时禁止全量枚举（避免无分页的数据泄露）
      if (!toolId) {
        return res.status(403).json({ error: 'toolId is required' });
      }
      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanId) return res.status(400).json({ error: 'invalid toolId' });
      let count = await rest('/get/like:tool:' + cleanId);
      if (count === null) count = await rest('/get/like:blog:' + cleanId);
      return res.status(200).json({
        toolId: cleanId,
        // 负数钳制：本地"已赞"状态可能与全局计数不同步（如计数被清零），
        // 用户再点取消会 INCRBY -1 把 KV 存为负值；读侧一律回退到 0。
        count: Math.max(0, parseInt(count || '0', 10)),
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
      const action = body && body.action;

      if (!toolId) return res.status(400).json({ error: 'missing toolId' });

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanId) return res.status(400).json({ error: 'invalid toolId' });

      // 工具 ID 白名单：仅允许已注册的工具/博客 id 写入，防止对任意 id 污染 KV
      const ALLOWED = require('./allowed-ids');
      if (process.env.ID_WHITELIST_OFF !== '1' && !ALLOWED.TOOL_IDS.has(cleanId) && !ALLOWED.BLOG_IDS.has(cleanId)) {
        return res.status(403).json({ error: 'unknown toolId' });
      }

      // 点赞防刷：超出每日上限拒绝
      if (await isLikeAbuse(clientIp, cleanId)) {
        return res.status(429).json({ error: 'like limit exceeded for this tool today' });
      }

      const key = (cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:') + cleanId;
      const delta = action === 'unlike' ? -1 : 1;
      // INCRBY 原子增减（POST /incrby/{key}，body 为裸数字；Upstash REST 不接受
      // /incr/{key}/{delta} 路径参数），杜绝并发读改写（TOCTOU）丢计数
      let count = Math.max(0, parseInt((await rest('/incrby/' + key, 'POST', String(delta))) || '0', 10));
      // INCR 不设 TTL，写入后刷新 365 天 TTL，防止无界存储放大
      await rest('/expire/' + key + '/31536000');

      return res.status(200).json({ toolId: cleanId, count, liked: action !== 'unlike' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'internal error' });
  }
};
