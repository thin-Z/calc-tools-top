// api/test/csp-report.test.js
// CSP report 端点单元测试（零依赖：node:test + node:assert + 内存限速回退）
// 运行：node --test api/test/csp-report.test.js
//
// 原理：直接 require handler，用模拟 req/res 对象断言状态码与响应体。
// 限速走内存回退（不设 KV_REST_API_URL），并用独立 IP 隔离用例。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

// 确保使用内存限速回退（每 IP 独立窗口）
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const handler = require('../csp-report.js');

// 构造模拟 res（支持 res.status(code).json(obj) / res.status(code).end() / setHeader）
function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; this.ended = true; return this; },
    end(data) {
      if (data !== undefined) this.body = data;
      this.ended = true;
      return this;
    }
  };
  return res;
}

// 构造模拟 req：headers + 可读流式 body（data/end/error 事件）
function makeReq(method, url, headers, body) {
  const req = {
    method: method || 'POST',
    url: url || '/api/csp-report',
    headers: headers || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  // 模拟可读流
  const listeners = { data: [], end: [], error: [] };
  req.on = function (ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return req; };
  req.destroy = function () {};
  // 异步推送 body（等监听器挂上）
  if (body !== undefined) {
    process.nextTick(() => {
      if (body) {
        listeners.data.forEach((cb) => cb(Buffer.isBuffer(body) ? body : Buffer.from(String(body))));
      }
      listeners.end.forEach((cb) => cb());
    });
  } else {
    process.nextTick(() => { listeners.end.forEach((cb) => cb()); });
  }
  return req;
}

// 便捷调用：发送 CSP 报告并返回 { status, body }
function postCspReport(extraHeaders, body) {
  const headers = Object.assign({ 'content-type': 'application/csp-report', origin: 'https://www.calc-tools.top' }, extraHeaders || {});
  const res = makeRes();
  const req = makeReq('POST', '/api/csp-report', headers, body);
  return Promise.resolve(handler(req, res)).then(() => ({ status: res.statusCode, body: res.body }));
}

function validReport() {
  return JSON.stringify({
    'csp-report': {
      'document-uri': 'https://www.calc-tools.top/zh/calculators/color-contrast',
      'violated-directive': 'script-src',
      'effective-directive': 'script-src',
      'blocked-uri': 'inline',
      'source-file': 'https://www.calc-tools.top/zh/calculators/color-contrast',
      'line-number': 12,
      'column-number': 3,
      'disposition': 'enforce'
    }
  });
}

test('POST 合法 CSP 报告 → 204 无 body', async () => {
  const r = await postCspReport({}, validReport());
  assert.strictEqual(r.status, 204);
  assert.strictEqual(r.body, null, '204 不应有响应体');
});

test('OPTIONS → 200 且带 CORS 头', async () => {
  const res = makeRes();
  const req = makeReq('OPTIONS', '/api/csp-report', { origin: 'https://www.calc-tools.top' });
  await handler(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://www.calc-tools.top');
});

test('GET → 405 method not allowed', async () => {
  const res = makeRes();
  const req = makeReq('GET', '/api/csp-report', {});
  await handler(req, res);
  assert.strictEqual(res.statusCode, 405);
  assert.strictEqual(res.body.error, 'method not allowed');
});

test('空 body → 400', async () => {
  const r = await postCspReport({}, '');
  assert.strictEqual(r.status, 400);
});

test('非法 JSON → 400', async () => {
  const r = await postCspReport({}, 'not-json{{{');
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.error, 'invalid JSON');
});

test('body 超过 16KB → 413', async () => {
  const big = 'x'.repeat(20 * 1024); // 20KB
  const r = await postCspReport({ 'content-length': String(Buffer.byteLength(big)) }, big);
  assert.strictEqual(r.status, 413);
});

test('同 IP 超过写限速（60/min）→ 429', async () => {
  const rlHeaders = { 'x-forwarded-for': '203.0.113.99' };
  let last;
  for (let i = 0; i < 61; i++) {
    last = await postCspReport(rlHeaders, validReport());
  }
  assert.strictEqual(last.status, 429);
  assert.strictEqual(last.body.error, 'too many requests');
});

test('不同 IP 不受彼此限速影响', async () => {
  const a = await postCspReport({ 'x-forwarded-for': '203.0.113.10' }, validReport());
  const b = await postCspReport({ 'x-forwarded-for': '203.0.113.11' }, validReport());
  assert.strictEqual(a.status, 204);
  assert.strictEqual(b.status, 204);
});
