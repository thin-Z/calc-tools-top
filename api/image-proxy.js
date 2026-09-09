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
const https = require('node:https');
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
// S-3 决策：保持内存限速，不迁 Upstash。理由：image-proxy 每个请求都是「抓取一次即透传」的纯读，
// 无任何写操作、无 KV 债务风险；与 likes.js「读限速走内存、写限速走 KV」的既定策略完全一致
// （likes.js 注释明确「读限速不消耗 KV 配额，防爬已足够」）。多实例部署下内存限额会被放大约等于
// 实例数倍，但本端点无状态写、无越权风险，该取舍与项目全局一致，故不在本迭代引入外部依赖。
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
  { base: 0xE0000000, bits: 4 },   // 224.0.0.0/4（组播，非有效 SSRF 目标）
  { base: 0xF0000000, bits: 4 },   // 240.0.0.0/4（保留，非有效目标）
  { base: 0xFFFFFFFF, bits: 32 },  // 255.255.255.255/32（广播）
  { base: 0xC0586300, bits: 24 },  // 192.88.99.0/24（6to4 中继任播）
  { base: 0xC0000200, bits: 24 },  // 192.0.2.0/24（TEST-NET-1）
  { base: 0xC6336400, bits: 24 },  // 198.51.100.0/24（TEST-NET-2）
  { base: 0xCB007100, bits: 24 },  // 203.0.113.0/24（TEST-NET-3）
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
  // 6to4（2002::/16）：前两个 hextet 即内嵌 IPv4，可绕过白名单（实测可触发）
  if (/^2002:/i.test(v)) {
    const parts = v.slice(5).split(':');
    const a = parseInt(parts[0], 16);
    const b = parseInt(parts[1], 16);
    if (isFinite(a) && isFinite(b)) {
      return isPrivateIpv4([(a >> 8) & 255, a & 255, (b >> 8) & 255, b & 255].join('.'));
    }
    return true; // 解析失败 → fail-closed
  }
  // NAT64（64:ff9b::/96）：末 32 位即内嵌 IPv4（实测可触发）
  if (/^64:ff9b:/i.test(v)) {
    const parts = v.split(':').filter(Boolean);
    const a = parseInt(parts[parts.length - 2], 16);
    const b = parseInt(parts[parts.length - 1], 16);
    if (isFinite(a) && isFinite(b)) {
      return isPrivateIpv4([(a >> 8) & 255, a & 255, (b >> 8) & 255, b & 255].join('.'));
    }
    return true; // 解析失败 → fail-closed
  }
  if (/^2001:db8:/i.test(v)) return true;                     // 文档保留段
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
async function resolveAndValidate(hostname) {
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
  // 全部通过校验后，选定一个 IP（优先 IPv4）用于连接锁定，根治 DNS rebinding（TOCTOU）
  const chosen = addrs.find(function (a) { return a.family === 4; }) || addrs[0];
  return { ip: chosen.address, family: chosen.family };
}

// 上游连接层：用 https.request + lookup 回调锁定到 resolveAndValidate 已校验的 IP。
// S-1 根治：connect 时忽略真实 DNS，直接用 pinnedIp（SNI 用原域名验证 TLS 证书），
// 因此「校验时公网 / 建连时内网」的 TOCTOU 窗口被彻底消除。
// 返回与 fetch Response 兼容的 { status, headers.get, body(web ReadableStream) } 接口，
// 使 handler 内部消费逻辑（status / content-type / location / body 流）零改动。
let upstreamFetcher = function httpsFetcher(urlString, pinnedIp, family) {
  return new Promise(function (resolve, reject) {
    const u = new URL(urlString);
    const req = https.request(u, {
      method: 'GET',
      headers: { accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
      lookup: function (hostname, options, callback) {
        // 兼容 lookup 两参 / 三参签名
        if (typeof callback !== 'function') callback = options;
        callback(null, pinnedIp, family); // 锁定到已校验 IP
      },
      servername: u.hostname, // SNI：TLS 证书按原域名验证
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }, function (response) {
      const headerMap = new Map();
      for (const k in response.headers) {
        const v = response.headers[k];
        headerMap.set(String(k).toLowerCase(), Array.isArray(v) ? v.join(', ') : v);
      }
      resolve({
        status: response.statusCode,
        headers: {
          get: function (name) {
            const key = String(name).toLowerCase();
            return headerMap.has(key) ? headerMap.get(key) : null;
          },
        },
        body: Readable.toWeb(response),
      });
    });
    req.on('error', reject);
    req.end();
  });
};

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

  // S-4：仅放行上游 443（防止利用图片代理对内网/公网做任意端口扫描侧信道）
  if (target.port && target.port !== '443') return fail(res, 400, 'invalid_url');

  let current = target.href;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let u;
    try {
      u = new URL(current);
    } catch (e) {
      return fail(res, 400, 'invalid_url');
    }
    if (u.protocol !== 'https:') return fail(res, 400, 'invalid_protocol');

    // S-1：每一跳都重新解析+校验 IP，并选定锁定 IP。
    // 连接时 httpsFetcher 用 lookup 回调锁定到此处已校验的 IP，彻底消除
    // 「校验时公网 / 建连时内网」的 DNS rebinding（TOCTOU）窗口。
    const resolved = await resolveAndValidate(u.hostname);
    if (resolved.status) return fail(res, resolved.status, resolved.code);

    let upstream;
    try {
      upstream = await upstreamFetcher(u.href, resolved.ip, resolved.family);
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

    // S-2：先读 Content-Length 早拒超大响应（避免无谓拉取 8MB+ 字节流驻留内存，
    // 这是 S-2 防 OOM 的核心防线；对无 content-length 的 chunked 响应，下方流中
    // 超限即时中断兜底）。【取舍】不采用全流式 pipe：会牺牲「body 读取错误时返回
    // JSON 错误码」的既有语义（头已发 200 后无法改状态码），故保留「先读后发」。
    // 8MB 上限内的全载入在 serverless 内存预算内安全，错误响应必须精确（504/502）。
    const declaredLen = Number(upstream.headers.get('content-length')) || 0;
    if (declaredLen > MAX_BYTES) return fail(res, 413, 'too_large');

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
// 测试注入点：用桩替换上游连接层，保持 handler 内部 Response 消费逻辑零改动
module.exports.__setFetcher = function (fn) { upstreamFetcher = fn; };
module.exports.__getFetcher = function () { return upstreamFetcher; };
