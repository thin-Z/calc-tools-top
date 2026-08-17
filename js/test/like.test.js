/* Tests for js/like.js (canonical Like System, T9).
 * Runs under `node --test`. Uses minimal DOM/localStorage/fetch shims so the
 * module's core logic can be verified without a browser. */
const test = require('node:test');
const assert = require('node:assert');

/* ---------------- shims ---------------- */
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

let fetchCalls = [];
globalThis.fetch = (url, opts) => {
  fetchCalls.push({ url, opts });
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 42 }) });
};

globalThis.localStorage = makeStorage();
globalThis.window = { addEventListener: () => {} };
globalThis.document = {
  readyState: 'complete',
  addEventListener: () => {},
  querySelectorAll: () => [],
  querySelector: () => null,
};

// Load the module (IIFE; executes and exposes window.LikeSystem).
require('../like.js');

/* ---------------- tests ---------------- */
test('window.LikeSystem is exposed with expected API', () => {
  assert.ok(window.LikeSystem, 'LikeSystem should exist');
  ['getLikes', 'saveLikes', 'getTotalLikes', 'toggleLike',
   'toggleArticleLike', 'initLikes', 'initArticleLikes'].forEach((fn) => {
    assert.strictEqual(typeof window.LikeSystem[fn], 'function', fn + ' should be a function');
  });
});

test('toggleLike flips localStorage and POSTs to /api/likes', () => {
  fetchCalls = [];
  window.LikeSystem.toggleLike('tool-a');
  assert.deepStrictEqual(JSON.parse(localStorage.getItem('toolbox_likes')), { 'tool-a': 1 });
  assert.strictEqual(window.LikeSystem.getTotalLikes('tool-a'), 1);

  assert.ok(fetchCalls.length >= 1, 'expected at least one fetch');
  const post = fetchCalls.find((c) => c.url.endsWith('/api/likes') && c.opts && c.opts.method === 'POST');
  assert.ok(post, 'should POST to /api/likes');
  assert.deepStrictEqual(JSON.parse(post.opts.body), { toolId: 'tool-a', action: 'like' });

  // unlike
  window.LikeSystem.toggleLike('tool-a');
  assert.deepStrictEqual(JSON.parse(localStorage.getItem('toolbox_likes')), { 'tool-a': 0 });
  assert.strictEqual(window.LikeSystem.getTotalLikes('tool-a'), 0);
});

test('toggleArticleLike writes under the same storage key', () => {
  window.LikeSystem.toggleArticleLike('blog-x');
  const ls = JSON.parse(localStorage.getItem('toolbox_likes'));
  assert.strictEqual(ls['blog-x'], 1);
  window.LikeSystem.toggleArticleLike('blog-x');
  assert.strictEqual(JSON.parse(localStorage.getItem('toolbox_likes'))['blog-x'], 0);
});

test('prefers window.ApiClient when present (no fetch fallback)', async () => {
  const calls = [];
  window.ApiClient = {
    toggleLike: (id, action) => { calls.push({ id, action }); return Promise.resolve({ count: 7 }); },
    fetchCount: (id) => Promise.resolve({ count: 7 }),
  };
  fetchCalls = [];
  window.LikeSystem.toggleLike('tool-b');
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(calls.length, 1, 'ApiClient.toggleLike should be used');
  assert.strictEqual(calls[0].id, 'tool-b');
  assert.strictEqual(calls[0].action, 'like');
  assert.strictEqual(fetchCalls.length, 0, 'should NOT call fetch when ApiClient present');
  delete window.ApiClient;
});

test('falls back to fetch when ApiClient absent', () => {
  fetchCalls = [];
  window.LikeSystem.toggleLike('tool-c');
  const post = fetchCalls.find((c) => c.url.endsWith('/api/likes') && c.opts && c.opts.method === 'POST');
  assert.ok(post, 'fetch fallback should POST to /api/likes');
});
