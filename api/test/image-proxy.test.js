// api/test/image-proxy.test.js
// 图片代理 API 单元测试（零依赖：node:test + node:assert + 真实 http 服务器）
// 运行：node --test api/test/image-proxy.test.js
//
// 原理：与 likes.test.js 同一范式——启动真实 http 服务器包装 handler（模拟 Vercel 的
// req/res 增强），通过真实 HTTP 请求验证状态码与响应体。
//
// 网络不可达时的确定性：用例**不发起任何真实网络请求**，而是
//   ① 打桩 globalThis.fetch（返回真实 Response 对象，body 走 Readable.fromWeb）
//   ② 打桩 dns.promises.lookup（返回受控的 A/AAAA 记录，可精确复现 SSRF 场景）
// 两者都在 handler 调用时才解析，因此打桩有效且生产代码零测试钩子。

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

const PROXY_SRC = fs.readFileSync(path.join(__dirname, '..', 'image-proxy.js'), 'utf8');

const PUBLIC_IP = '93.184.216.34';   // 任意公网地址（仅用于打桩返回值）

let realFetch = null;
let realLookup = null;
let handlerServer = null;
let handlerPort = 0;

// ---- Vercel 风格响应增强 ----
function wrapRes(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

// ---- 真实 HTTP 请求（二进制安全）----
function callHandler(urlPath, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: handlerPort,
      path: urlPath,
      method: (headers && headers.__method) || 'GET',
      headers: (function () {
        const h = Object.assign({}, headers || {});
        delete h.__method;
        return h;
      })(),
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(buf.toString('utf8')); } catch (e) { parsed = null; }
        resolve({ status: res.statusCode, headers: res.headers, buf, json: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ---- 打桩助手 ----
function stubLookup(addresses) {
  dns.promises.lookup = async function () {
    return Array.isArray(addresses)
      ? addresses.map(function (a) { return { address: a, family: a.indexOf(':') === -1 ? 4 : 6 }; })
      : addresses;
  };
}

function stubFetch(impl) { globalThis.fetch = impl; }

function okPng(buf) {
  return new Response(buf || Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  });
}

function redirectTo(location) {
  return new Response(null, { status: 302, headers: { location: location } });
}

let ipSeq = 0;
function ipHeaders(extra) {
  ipSeq += 1;
  return Object.assign({ 'x-forwarded-for': '203.0.113.' + (ipSeq % 250 + 1) }, extra || {});
}

before(async () => {
  realFetch = globalThis.fetch;
  realLookup = dns.promises.lookup;
  const handler = require('../image-proxy.js');
  handlerServer = http.createServer((req, res) => {
    Promise.resolve(handler(req, wrapRes(res))).catch(() => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  });
  await new Promise((resolve) => handlerServer.listen(0, '127.0.0.1', resolve));
  handlerPort = handlerServer.address().port;
});

after(async () => {
  globalThis.fetch = realFetch;
  dns.promises.lookup = realLookup;
  if (handlerServer) await new Promise((r) => handlerServer.close(r));
});

// ===========================================================================
// 一、SSRF 网段判定表（纯函数）
// ===========================================================================

test('isPrivateIp：IPv4 私有/保留网段全部拦截', () => {
  const isPrivateIp = require('../image-proxy.js').isPrivateIp;
  const blocked = [
    '0.0.0.0', '0.255.255.255',
    '10.0.0.1', '10.255.255.255',
    '100.64.0.1', '100.127.255.255',
    '127.0.0.1', '127.255.255.255',
    '169.254.169.254', '169.254.0.1',      // 云元数据服务
    '172.16.0.1', '172.31.255.255',
    '192.0.0.1', '192.0.0.255',
    '192.168.1.1',
    '198.18.0.1', '198.19.255.255',
    '192.0.2.1', '198.51.100.1', '203.0.113.1',  // TEST-NET 文档段（P1 修复）
    '224.0.0.1', '239.255.255.255',             // 组播（P1 修复）
    '240.0.0.1',                               // 保留（P1 修复）
    '255.255.255.255',                         // 广播（P1 修复）
    '192.88.99.1',                             // 6to4 中继任播（P1 修复）
  ];
  blocked.forEach(function (ip) {
    assert.strictEqual(isPrivateIp(ip), true, ip + ' 应被拦截');
  });
});

test('isPrivateIp：公网 IPv4 放行（含易误判的边界）', () => {
  const isPrivateIp = require('../image-proxy.js').isPrivateIp;
  const allowed = [
    '8.8.8.8', '1.1.1.1', PUBLIC_IP,
    '172.15.255.255', '172.32.0.1',       // 172.16/12 边界外
    '100.63.255.255', '100.128.0.1',      // 100.64/10 边界外
    '192.0.1.1', '192.167.255.255', '192.169.0.1',
    '198.17.255.255', '198.20.0.1',       // 198.18/15 边界外
    '9.255.255.255', '11.0.0.1',          // 10/8 边界外
    '126.255.255.255', '128.0.0.1',       // 127/8 边界外
  ];
  allowed.forEach(function (ip) {
    assert.strictEqual(isPrivateIp(ip), false, ip + ' 应放行');
  });
});

test('isPrivateIp：IPv6 环回/唯一本地/链路本地/IPv4-mapped 全部拦截', () => {
  const isPrivateIp = require('../image-proxy.js').isPrivateIp;
  const blocked = [
    '::1', '::',
    'fc00::1', 'fd12:3456::1',            // fc00::/7
    'fe80::1', 'febf::1',                 // fe80::/10
    '::ffff:127.0.0.1',                   // IPv4-mapped 点分写法
    '::ffff:7f00:1',                      // IPv4-mapped 十六进制写法
    '::ffff:10.0.0.1',
    '2002:7f00:1::',                       // 6to4 嵌入 127.0.0.1（P1-SSR 修复覆盖）
    '2002:a00:1::',                        // 6to4 嵌入 10.0.0.1
    '64:ff9b::7f00:1',                     // NAT64 嵌入 127.0.0.1
    '64:ff9b::a00:1',                      // NAT64 嵌入 10.0.0.1
    '2001:db8::1',                         // 文档保留段
  ];
  blocked.forEach(function (ip) {
    assert.strictEqual(isPrivateIp(ip), true, ip + ' 应被拦截');
  });
});

test('isPrivateIp：公网 IPv6 放行', () => {
  const isPrivateIp = require('../image-proxy.js').isPrivateIp;
  assert.strictEqual(isPrivateIp('2606:4700::1111'), false);
  assert.strictEqual(isPrivateIp('2001:4860:4860::8888'), false);
});

test('isPrivateIp：无法解析/畸形输入一律 fail-closed', () => {
  const isPrivateIp = require('../image-proxy.js').isPrivateIp;
  ['', null, undefined, 'not-an-ip', '1.2.3', '1.2.3.4.5', '300.1.1.1', '1.2.3.a', '::zzz'].forEach(function (v) {
    assert.strictEqual(isPrivateIp(v), true, String(v) + ' 应 fail-closed');
  });
});

// ===========================================================================
// 二、handler 响应分支
// ===========================================================================

test('200：正常返回图片字节 + no-store', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng(Buffer.from([1, 2, 3, 4, 5])));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers['content-type'], 'image/png');
  assert.strictEqual(r.headers['cache-control'], 'no-store');
  assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
  assert.deepStrictEqual(Array.from(r.buf), [1, 2, 3, 4, 5]);
});

test('200：content-type 带参数时取分号前部分（规范化后透传）', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response(Buffer.from([9]), { status: 200, headers: { 'content-type': 'image/JPEG; charset=binary' } }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.jpg'), ipHeaders());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers['content-type'], 'image/jpeg');
});

test('200：跟随 1 跳重定向（每跳重新做 IP 校验）', async () => {
  stubLookup([PUBLIC_IP]);
  let calls = 0;
  const seen = [];
  stubFetch(async (u) => {
    calls += 1;
    seen.push(u);
    if (calls === 1) return redirectTo('https://cdn.example.com/b.png');
    return okPng(Buffer.from([7, 7]));
  });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(calls, 2);
  assert.strictEqual(seen[1], 'https://cdn.example.com/b.png');
});

test('400 redirect_limit：重定向超过 2 跳', async () => {
  stubLookup([PUBLIC_IP]);
  let calls = 0;
  stubFetch(async () => { calls += 1; return redirectTo('https://example.com/hop' + calls + '.png'); });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'redirect_limit');
  assert.strictEqual(calls, 3, '最多发起 3 次请求（首跳 + 2 跳重定向）后停止，实际 ' + calls);
});

test('400 invalid_protocol：重定向落到 http://', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => redirectTo('http://example.com/b.png'));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'invalid_protocol');
});

test('400 invalid_url：重定向 Location 无法解析', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => redirectTo('http://['));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
});

test('400 private_address：DNS 解析到 127.0.0.1', async () => {
  stubLookup(['127.0.0.1']);
  let fetchCalled = false;
  stubFetch(async () => { fetchCalled = true; return okPng(); });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://internal.example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'private_address');
  assert.strictEqual(fetchCalled, false, '命中私有地址时不得发起上游请求');
});

test('400 private_address：DNS 解析到云元数据地址 169.254.169.254', async () => {
  stubLookup(['169.254.169.254']);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://metadata.example.com/latest/meta-data'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'private_address');
});

test('400 private_address：任一 A 记录命中私有网段即拦截（混合解析结果）', async () => {
  stubLookup([PUBLIC_IP, '10.0.0.5']);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://split.example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'private_address');
});

test('400 private_address：重定向第二跳落到内网（每跳都重新校验）', async () => {
  stubLookup([PUBLIC_IP]);
  let calls = 0;
  stubFetch(async () => { calls += 1; return redirectTo('https://internal.example.com/a.png'); });
  dns.promises.lookup = async function (host) {
    // 首跳公网，次跳内网
    return host === 'internal.example.com'
      ? [{ address: '192.168.0.10', family: 4 }]
      : [{ address: PUBLIC_IP, family: 4 }];
  };
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'private_address');
  assert.strictEqual(calls, 1);
});

test('400 invalid_url：缺少 url 参数', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy', ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'invalid_url');
});

test('400 invalid_url：URL 无法解析', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('notaurl'), ipHeaders());
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'invalid_url');
});

test('400 invalid_protocol：http:// / file:// 一律拒绝', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const http1 = await callHandler('/api/image-proxy?url=' + encodeURIComponent('http://example.com/a.png'), ipHeaders());
  assert.strictEqual(http1.status, 400);
  assert.strictEqual(http1.json.error, 'invalid_protocol');
  const file1 = await callHandler('/api/image-proxy?url=' + encodeURIComponent('file:///etc/passwd'), ipHeaders());
  assert.strictEqual(file1.status, 400);
  assert.strictEqual(file1.json.error, 'invalid_protocol');
  const data1 = await callHandler('/api/image-proxy?url=' + encodeURIComponent('data:image/png;base64,AAAA'), ipHeaders());
  assert.strictEqual(data1.status, 400);
  assert.strictEqual(data1.json.error, 'invalid_protocol');
});

test('413 too_large：响应体超过 8MB', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response(Buffer.alloc(8 * 1024 * 1024 + 1024), { status: 200, headers: { 'content-type': 'image/png' } }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/big.png'), ipHeaders());
  assert.strictEqual(r.status, 413);
  assert.strictEqual(r.json.error, 'too_large');
});

test('415 unsupported_type：Content-Type 非图片', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/page.html'), ipHeaders());
  assert.strictEqual(r.status, 415);
  assert.strictEqual(r.json.error, 'unsupported_type');
});

test('415 unsupported_type：SVG 不在白名单（防 XSS 载体）', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.svg'), ipHeaders());
  assert.strictEqual(r.status, 415);
  assert.strictEqual(r.json.error, 'unsupported_type');
});

test('429 too_many_requests：每 IP 30 次/分钟', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const headers = { 'x-forwarded-for': '198.51.100.200' };
  let last = null;
  for (let i = 0; i < 31; i++) {
    last = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), headers);
  }
  assert.strictEqual(last.status, 429);
  assert.strictEqual(last.json.error, 'too_many_requests');
});

test('429 与 200 共存：不同 IP 互不干扰', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), { 'x-forwarded-for': '198.51.100.201' });
  assert.strictEqual(r.status, 200);
});

test('504 upstream_timeout：fetch 抛 TimeoutError', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => {
    const e = new Error('timed out');
    e.name = 'TimeoutError';
    throw e;
  });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/slow.png'), ipHeaders());
  assert.strictEqual(r.status, 504);
  assert.strictEqual(r.json.error, 'upstream_timeout');
});

test('502 fetch_failed：fetch 抛普通错误（连接/解析失败）', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => { throw new Error('ENOTFOUND'); });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://nope.example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('502 fetch_failed：DNS 解析失败', async () => {
  dns.promises.lookup = async function () { throw new Error('ENOTFOUND'); };
  let fetchCalled = false;
  stubFetch(async () => { fetchCalled = true; return okPng(); });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://nope.example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
  assert.strictEqual(fetchCalled, false);
});

test('502 fetch_failed：DNS 返回空数组', async () => {
  stubLookup([]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://empty.example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('502 fetch_failed：上游非 200 且不重定向', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response('nope', { status: 404 }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/missing.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('502 fetch_failed：3xx 缺少 Location 头', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response(null, { status: 302 }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('502 fetch_failed：响应无 body', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => new Response(null, { status: 200, headers: { 'content-type': 'image/png' } }));
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('504 upstream_timeout：读取响应体过程中中断（AbortError）', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.error((function () {
          const e = new Error('body timeout');
          e.name = 'AbortError';
          return e;
        })());
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'image/png' } });
  });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 504);
  assert.strictEqual(r.json.error, 'upstream_timeout');
});

test('502 fetch_failed：读取响应体过程中发生普通错误', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.error(new Error('socket hang up'));
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'image/png' } });
  });
  const r = await callHandler('/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'), ipHeaders());
  assert.strictEqual(r.status, 502);
  assert.strictEqual(r.json.error, 'fetch_failed');
});

test('405：非 GET 方法', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy', Object.assign(ipHeaders(), { __method: 'POST' }));
  assert.strictEqual(r.status, 405);
});

test('OPTIONS → 204 且带 no-store', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const r = await callHandler('/api/image-proxy', Object.assign(ipHeaders(), { __method: 'OPTIONS' }));
  assert.strictEqual(r.status, 204);
  assert.strictEqual(r.headers['cache-control'], 'no-store');
});

test('CORS：白名单内 Origin 回显，白名单外回落主域', async () => {
  stubLookup([PUBLIC_IP]);
  stubFetch(async () => okPng());
  const okOrigin = await callHandler(
    '/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'),
    Object.assign(ipHeaders(), { origin: 'https://calc-tools.top' }),
  );
  assert.strictEqual(okOrigin.headers['access-control-allow-origin'], 'https://calc-tools.top');
  const badOrigin = await callHandler(
    '/api/image-proxy?url=' + encodeURIComponent('https://example.com/a.png'),
    Object.assign(ipHeaders(), { origin: 'https://evil.example' }),
  );
  assert.strictEqual(badOrigin.headers['access-control-allow-origin'], 'https://www.calc-tools.top');
});

// ===========================================================================
// 三、隐私承诺（PRD 1.3）回归
// ===========================================================================

test('隐私：源码禁止出现 console.*（避免 URL 落日志）', () => {
  assert.ok(!/console\s*\./.test(PROXY_SRC), 'api/image-proxy.js 不得包含 console.* 调用');
});

test('隐私：源码禁止写 KV / 落盘 / 二次转发', () => {
  assert.ok(!/KV_REST_API|fs\s*\.\s*write|createWriteStream/.test(PROXY_SRC), '不得出现 KV 或文件写入调用');
  assert.ok(/no-store/.test(PROXY_SRC), '必须设置 Cache-Control: no-store');
});

test('隐私：SSRF 硬性要求全部落地（https / manual / 2 跳 / 6s / 8MB）', () => {
  assert.ok(/redirect:\s*'manual'/.test(PROXY_SRC), '必须使用 redirect: manual');
  assert.ok(/AbortSignal\.timeout\(/.test(PROXY_SRC), '必须设置 AbortSignal.timeout');
  assert.ok(/MAX_REDIRECTS\s*=\s*2/.test(PROXY_SRC), '重定向上限必须为 2');
  assert.ok(/MAX_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/.test(PROXY_SRC), '大小上限必须为 8MB');
  assert.ok(/MAX_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/.test(PROXY_SRC));
  assert.ok(/\{\s*all:\s*true\s*\}/.test(PROXY_SRC), 'DNS 必须解析全部 A/AAAA 记录');
  assert.ok(/169\.254/.test(PROXY_SRC), '必须拦截 169.254.0.0/16（云元数据服务）');
  assert.ok(/100\.64|0x64400000/.test(PROXY_SRC), '必须拦截 100.64.0.0/10');
  assert.ok(/198\.18|0xC6120000|0xc6120000/.test(PROXY_SRC), '必须拦截 198.18.0.0/15');
});
