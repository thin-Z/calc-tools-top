// api/test/clicks.test.js
// 点击量 API 单元测试（零依赖：node:test + node:assert + 本地 KV 模拟服务器）
// 运行：node --test api/test/clicks.test.js  或  node --test api/test/likes.test.js api/test/clicks.test.js
//
// 原理：用 http 模块启动一个本地 KV REST 模拟服务器，把 KV_REST_API_URL 指向它，
// 再启动一个真实 http 服务器包装 handler（模拟 Vercel 的 req/res 增强），
// 通过真实 HTTP 请求验证状态码与响应体。

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// ---- 本地 KV REST 模拟服务器：支持 /get /incrby /expire 三类命令 ----
// ⚠️ 严格对齐 Upstash REST 真实规范（勿按调用方代码照抄）：
//    INCRBY = POST /incrby/{key}，body 为裸数字；未知路径一律 400 报错。
//    2026-08-17 教训：mock 曾复刻错误格式 /incr/{key}/{delta} 导致测试全绿、生产必挂。
function startKvMock() {
  const store = new Map();   // key -> number
  const ttl = new Map();     // key -> expiry timestamp (ms)
  const expires = [];        // 记录所有 expire 调用 { key, seconds }
  const calls = [];          // 记录所有命令路径
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    calls.push(pathname);
    let result = null;
    if (pathname.startsWith('/incrby/')) {
      // Upstash REST INCRBY：POST /incrby/{key}，body 为裸数字增量
      const key = pathname.slice('/incrby/'.length);
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        const delta = parseInt((raw || '').trim(), 10) || 0;
        const next = (store.get(key) || 0) + delta;
        store.set(key, next);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: next }));
      });
      return;
    }
    if (pathname.startsWith('/get/')) {
      const key = pathname.slice('/get/'.length);
      result = store.has(key) ? store.get(key) : null;
    } else if (pathname.startsWith('/mget')) {
      // Upstash REST MGET：POST /mget，body 为 key 数组，返回 values 数组（缺失为 null）
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        let keys = [];
        try { keys = JSON.parse(raw || '[]'); } catch (e) { keys = []; }
        if (!Array.isArray(keys)) keys = [];
        const vals = keys.map(function (k) { return store.has(k) ? store.get(k) : null; });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: vals }));
      });
      return;
    } else if (pathname.startsWith('/expire/')) {
      const restPath = pathname.slice('/expire/'.length);
      const idx = restPath.lastIndexOf('/');
      const key = restPath.slice(0, idx);
      const seconds = parseInt(restPath.slice(idx + 1), 10) || 0;
      if (store.has(key) || ttl.has(key)) {
        ttl.set(key, Date.now() + seconds * 1000);
        expires.push({ key, seconds });
        result = 1;
      } else {
        result = 0;
      }
    } else {
      // 刻意拒绝未知命令路径（如旧格式 /incr/{key}/{delta}）：与真实 Upstash 一致。
      // 若调用方写错格式，测试必须失败而非"假装成功"。
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "ERR wrong number of arguments for 'incr' command" }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port,
        url: 'http://127.0.0.1:' + port,
        store,
        ttl,
        expires,
        calls,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// Vercel 风格响应增强：handler 依赖 res.status(code).json(obj) / res.status(code).end()
function wrapRes(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

// 真实 HTTP 请求包装
function httpCall(port, method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined || body === null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: Object.assign({}, headers || {}, { 'content-length': String(Buffer.byteLength(payload)) }),
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const JSON_HEADERS = { 'content-type': 'application/json', 'origin': 'https://www.calc-tools.top' };

let mock;
let handlerServer;
let handlerPort;

before(async () => {
  mock = await startKvMock();
  process.env.KV_REST_API_URL = mock.url;
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.ID_WHITELIST_OFF = '1'; // 现有用例使用非白名单 id，测试期间放行
  const handler = require('../clicks.js');
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
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  if (handlerServer) await new Promise((r) => handlerServer.close(r));
  if (mock) await mock.close();
});

test('GET 缺少 toolId → 403', async () => {
  const r = await httpCall(handlerPort, 'GET', '/api/clicks');
  assert.strictEqual(r.status, 403);
});

test('GET 非法 toolId（纯特殊字符）→ 400', async () => {
  const r = await httpCall(handlerPort, 'GET', '/api/clicks?toolId=%21%21%21');
  assert.strictEqual(r.status, 400);
});

test('GET 返回当前总数', async () => {
  await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'get-tool' });
  const r = await httpCall(handlerPort, 'GET', '/api/clicks?toolId=get-tool');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.total, 1);
  assert.strictEqual(r.body.toolId, 'get-tool');
});

test('GET 批量 ?tools=a,b,c → 单请求返回全部计数', async () => {
  await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'bulk-a' });
  await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'bulk-b' });
  await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'bulk-a' }); // bulk-a = 2
  const r = await httpCall(handlerPort, 'GET', '/api/clicks?tools=bulk-a,bulk-b,bulk-nonexistent');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.tools['bulk-a'], 2);
  assert.strictEqual(r.body.tools['bulk-b'], 1);
  assert.strictEqual(r.body.tools['bulk-nonexistent'], 0);
});

test('GET 批量 ?tools= 空/非法 → 400/403', async () => {
  // tools= 空串：等同未传 tools → 落入单工具分支 → 403（toolId required）
  const r1 = await httpCall(handlerPort, 'GET', '/api/clicks?tools=');
  assert.strictEqual(r1.status, 403);
  // tools 全非法字符 → 400
  const r2 = await httpCall(handlerPort, 'GET', '/api/clicks?tools=%21%21%21');
  assert.strictEqual(r2.status, 400);
});

test('GET 批量去重：重复 id 只查一次', async () => {
  const r = await httpCall(handlerPort, 'GET', '/api/clicks?tools=bulk-a,bulk-a,bulk-a');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.tools['bulk-a'], 2);
});

test('POST 正常点击 → 200 且总数 +1', async () => {
  const r = await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'test-tool' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.total, 1);
  assert.strictEqual(r.body.toolId, 'test-tool');
});

test('POST 缺少 toolId → 400', async () => {
  const r = await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, {});
  assert.strictEqual(r.status, 400);
});

test('POST 超过写限速（20/min）→ 429', async () => {
  // 使用独立 IP，避免影响其它用例
  const rlHeaders = { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.60' };
  let last;
  for (let i = 0; i < 21; i++) {
    last = await httpCall(handlerPort, 'POST', '/api/clicks', rlHeaders, { toolId: 'ratelimit-' + i });
  }
  assert.strictEqual(last.status, 429);
});

test('OPTIONS → 200', async () => {
  const r = await httpCall(handlerPort, 'OPTIONS', '/api/clicks');
  assert.strictEqual(r.status, 200);
});

test('不支持的 method → 405', async () => {
  const r = await httpCall(handlerPort, 'DELETE', '/api/clicks');
  assert.strictEqual(r.status, 405);
});

test('点击计数 key 写入后刷新 365 天 TTL', async () => {
  const toolId = 'ttl-tool';
  await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId });
  const found = mock.expires.find((e) => e.key === 'click:tool:' + toolId && e.seconds === 31536000);
  assert.ok(found, '应记录 expire click:tool:' + toolId + ' 31536000，实际记录: ' + JSON.stringify(mock.expires));
});

test('POST 白名单外 id → 403', async () => {
  const prev = process.env.ID_WHITELIST_OFF;
  delete process.env.ID_WHITELIST_OFF;
  const r = await httpCall(handlerPort, 'POST', '/api/clicks', JSON_HEADERS, { toolId: 'not-registered-id-xyz' });
  if (prev !== undefined) process.env.ID_WHITELIST_OFF = prev;
  assert.strictEqual(r.status, 403);
});
