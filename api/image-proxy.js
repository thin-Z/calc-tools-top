// api/image-proxy.js
// Vercel Serverless Function — 图片代理（供「图片取色器」C3 图片链接渠道使用）
// ---------------------------------------------------------------------------
// GET /api/image-proxy?url=<encodeURIComponent(https url)>  →  200 + 图片字节
// 失败：400 / 413 / 415 / 429 / 502 / 504  +  JSON { error: <code> }
//
// 状态码契约（前端按 body.error 优先、status 兜底映射文案）：
//   400 invalid_url        new URL() 解析失败 / 缺少 url 参数
//   400 invalid_protocol   非 https:（含重定向跳到非 https）
//   400 private_address    解析出的 IP 命中私有/保留网段
//   400 redirect_limit     重定向超过 2 跳
//   413 too_large          响应体 > 8MB
//   415 unsupported_type   Content-Type 不在图片白名单
//   429 too_many_requests  每 IP 30 次/分钟
//   504 upstream_timeout   上游 6s 未完成
//   502 fetch_failed       连接/DNS/读取失败，或上游非 200
//
// 隐私承诺（PRD 1.3）：仅代为抓取一次字节流，直接透传浏览器；
//   —— 不落盘、不写 KV、不记录 URL、不出站二次转发。
//   ⚠️ 本文件禁止出现任何日志输出调用（会把用户提交的 URL 写进日志）。
//
// 零新增依赖：Node 22 全局 fetch + node:dns + node:stream。

'use strict';

const dns = require('dns');
const { Readable } = require('node:stream');

// 复用 api/likes.js 已验证的客户端 IP 提取规则（只信任 XFF 最右段）。
const getClientIp = require('./likes.js').getClientIp;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
const MAX_BYTES = 8 * 1024 * 1024;      // 8MB
const TIMEOUT_MS = 6000;                // 上游总超时（含读取）
const MAX_REDIRECTS = 2;                // 最多跟 2 跳
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;              // 每 IP 30 次/分钟

const ALLOWED_ORIGINS = [
  'https://www.calc-tools.top',
  'https://calc-tools.top',
  'http://localhost:3000',
  'http://localhost:5173',
];

// ---------- 限速：内存滑动窗口（与 likes.js 读限速同一模式，不消耗 KV 配额） ----------
const rateHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  if (rateHits.size > 10000) {
    for (const key of Array.from(rateHits.keys())) {
      const alive = (rateHits.get(key) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
      if (alive.length === 0) rateHits.delete(key);
    }
  }
  const hits = (rateHits.get(ip) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  rateHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

// ---------- SSRF：私有/保留网段判定 ----------
// IPv4 CIDR 表（PRD 2.2 第 3 条）。169.254.0.0/16 用于挡云元数据服务 169.254.169.254。
const PRIVATE_V4 = [
  { base: 0x00000000, bits: 8 },   // 0.0.0.0/8
  { base: 0x0A000000, bits: 8 },   // 10.0.0.0/8
  { base: 0x64400000, bits: 10 },  // 100.64.0.0/10（CGNAT）
  { base: 0x7F000000, bits: 8 },   // 127.0.0.0/8
  { base: 0xA9FE0000, bits: 16 },  // 169.254.0.0/16（link-local / 元数据）
  { base: 0xAC100000, bits: 12 },  // 172.16.0.0/12
  { base: 0xC0000000, bits: 24 },  // 192.0.0.0/24
  { base: 0xC0A80000, bits: 16 },  // 192.168.0.0/16
  { base: 0xC6120000, bits: 15 },  // 198.18.0.0/15（benchmark）
];

function isPrivateIpv4(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return true;
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (!/^[0-9]{1,3}$/.test(parts[i])) return true;
    const n = Number(parts[i]);
    if (n < 0 || n > 255) return true;
    value = value * 256 + n;
  }
  for (let i = 0; i < PRIVATE_V4.length; i++) {
    const c = PRIVATE_V4[i];
    const mask = c.bits === 0 ? 0 : (0xFFFFFFFF << (32 - c.bits)) >>> 0;
    if (((value & mask) >>> 0) === ((c.base & mask) >>> 0)) return true;
  }
  return false;
}

function isPrivateIpv6(ip) {
  const v = String(ip).toLowerCase();
  // IPv4-mapped（::ffff:1.2.3.4 与 ::ffff:7f00:1 两种写法）→ 转回 IPv4 判定
  if (v.indexOf('::ffff:') === 0) {
    const rest = v.slice('::ffff:'.length);
    if (rest.indexOf('.') !== -1) return isPrivateIpv4(rest);
    const parts = rest.split(':');
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16);
      const lo = parseInt(parts[1], 16);
      if (!isFinite(hi) || !isFinite(lo)) return true;
      return isPrivateIpv4([(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.'));
    }
    return true;
  }
  if (v === '::' || v === '::1') return true;                 // 未指定 / 环回
  if (!/^[0-9a-f:]{2,}$/.test(v)) return true;                // 含非法字符 → fail-closed
  if (/^f[cd][0-9a-f]{2}:/.test(v)) return true;              // fc00::/7 唯一本地
  if (/^fe[89ab][0-9a-f]:/.test(v)) return true;              // fe80::/10 链路本地
  return false;
}

/** 判定单个 IP 是否属于私有/保留网段。无法解析的一律视为私有（fail-closed）。 */
function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  return String(ip).indexOf(':') === -1 ? isPrivateIpv4(ip) : isPrivateIpv6(ip);
}

/**
 * 解析 host 的全部 A/AAAA 记录并逐条校验。
 * @returns {null|{status:number, code:string}} null = 放行；否则为错误响应
 */
async function guardHost(hostname) {
  const bare = String(hostname).replace(/^\[/, '').replace(/\]$/, '');
  let addrs = null;
  try {
    addrs = await dns.promises.lookup(bare, { all: true });
  } catch (e) {
    return { status: 502, code: 'fetch_failed' };
  }
  if (!addrs || !addrs.length) return { status: 502, code: 'fetch_failed' };
  for (let i = 0; i < addrs.length; i++) {
    if (isPrivateIp(addrs[i].address)) return { status: 400, code: 'private_address' };
  }
  return null;
}

function isTimeoutError(e) {
  if (!e) return false;
  // AbortSignal.timeout() 触发时抛 DOMException，name 为 'TimeoutError'
  return e.name === 'TimeoutError' || e.name === 'AbortError';
}

function sendCommonHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : 'https://www.calc-tools.top');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function fail(res, status, code) {
  if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
  return res.status(status).json({ error: code });
}

module.exports = async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  sendCommonHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');

  if (isRateLimited(getClientIp(req))) return fail(res, 429, 'too_many_requests');

  const raw = new URL(req.url, 'http://localhost').searchParams.get('url');
  if (!raw) return fail(res, 400, 'invalid_url');

  let target;
  try {
    target = new URL(raw);
  } catch (e) {
    return fail(res, 400, 'invalid_url');
  }
  if (target.protocol !== 'https:') return fail(res, 400, 'invalid_protocol');

  let current = target.href;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let u;
    try {
      u = new URL(current);
    } catch (e) {
      return fail(res, 400, 'invalid_url');
    }
    if (u.protocol !== 'https:') return fail(res, 400, 'invalid_protocol');

    // 每一跳都重新做 IP 校验（防止首跳公网、次跳内网）
    const guard = await guardHost(u.hostname);
    if (guard) return fail(res, guard.status, guard.code);

    let upstream;
    try {
      upstream = await fetch(u.href, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
      });
    } catch (e) {
      return fail(res, isTimeoutError(e) ? 504 : 502, isTimeoutError(e) ? 'upstream_timeout' : 'fetch_failed');
    }

    const status = upstream.status;
    if (status >= 300 && status < 400) {
      const location = upstream.headers.get('location');
      if (!location) return fail(res, 502, 'fetch_failed');
      if (hop === MAX_REDIRECTS) return fail(res, 400, 'redirect_limit');
      let next;
      try {
        next = new URL(location, u.href);
      } catch (e) {
        return fail(res, 400, 'invalid_url');
      }
      if (next.protocol !== 'https:') return fail(res, 400, 'invalid_protocol');
      current = next.href;
      continue;
    }

    if (status !== 200) return fail(res, 502, 'fetch_failed');

    const contentType = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (ALLOWED_TYPES.indexOf(contentType) === -1) return fail(res, 415, 'unsupported_type');
    if (!upstream.body) return fail(res, 502, 'fetch_failed');

    const chunks = [];
    let total = 0;
    let tooLarge = false;
    const nodeStream = Readable.fromWeb(upstream.body);
    try {
      for await (const chunk of nodeStream) {
        total += chunk.length;
        if (total > MAX_BYTES) { tooLarge = true; break; }
        chunks.push(chunk);
      }
    } catch (e) {
      nodeStream.destroy();
      return fail(res, isTimeoutError(e) ? 504 : 502, isTimeoutError(e) ? 'upstream_timeout' : 'fetch_failed');
    }
    if (tooLarge) {
      nodeStream.destroy();
      return fail(res, 413, 'too_large');
    }

    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).end(buf);
  }

  // 理论不可达：循环最多 MAX_REDIRECTS+1 轮，超出由 redirect_limit 提前返回
  return fail(res, 400, 'redirect_limit');
};

// 供单元测试直接覆盖网段判定表（不影响 Vercel 调用：module.exports 仍是 handler）
module.exports.isPrivateIp = isPrivateIp;
