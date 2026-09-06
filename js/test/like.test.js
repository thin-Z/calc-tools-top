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

/* DOM button mock：模拟 like.js 期望的 DOM API（classList / querySelector /
 * setAttribute / getAttribute / addEventListener）。paint 通过 querySelector('.count')
 * 写 textContent，事件委托通过 addEventListener 注册 click 回调（测试中可直接
 * 调 toggleLike 触发，无需模拟点击）。 */
const domBtns = [];
function makeBtn(id, kind) {
  kind = kind || 'tool';
  let tc = ''; // 模拟浏览器 DOM：textContent setter 强制转字符串
  const countEl = {
    get textContent() { return tc; },
    set textContent(v) { tc = String(v); },
  };
  const set = new Set();
  return {
    _id: id,
    _kind: kind,
    _dataLikeId: kind === 'tool' ? id : null,
    _dataBlogId: kind === 'blog' ? id : null,
    _initialized: false,
    _countEl: countEl,
    _listeners: [],
    classList: {
      add(c) { set.add(c); },
      remove(c) { set.delete(c); },
      contains(c) { return set.has(c); },
    },
    querySelector(sel) {
      return (sel === '.count' || sel === '.like-count') ? countEl : null;
    },
    setAttribute(k, v) { if (k === 'data-initialized') this._initialized = v === 'true'; },
    getAttribute(k) {
      if (k === 'data-like-id') return this._dataLikeId;
      if (k === 'data-blog-id') return this._dataBlogId;
      return null;
    },
    addEventListener(evt, fn) { this._listeners.push({ evt, fn }); },
    isLiked() { return set.has('liked'); },
  };
}

let fetchCalls = [];
let fetchResp = { ok: true, json: () => Promise.resolve({ count: 42 }) };
let fetchDelay = 0;
function installFetch({ resp, delay, rejectWith } = {}) {
  if (resp !== undefined) fetchResp = resp;
  if (delay !== undefined) fetchDelay = delay;
  globalThis.fetch = (url, opts) => {
    fetchCalls.push({ url, opts });
    if (rejectWith) {
      return new Promise((_, reject) => {
        if (fetchDelay > 0) {
          setTimeout(() => reject(rejectWith), fetchDelay);
        } else {
          Promise.resolve().then(() => reject(rejectWith));
        }
      });
    }
    return new Promise((resolve) => {
      if (fetchDelay > 0) {
        setTimeout(() => resolve(fetchResp), fetchDelay);
      } else {
        resolve(fetchResp);
      }
    });
  };
}
function resetFetch() {
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 42 }) }, delay: 0 });
}

globalThis.localStorage = makeStorage();
globalThis.window = { addEventListener: () => {} };
globalThis.document = {
  readyState: 'complete',
  addEventListener: () => {},
  querySelector() { return null; },
  querySelectorAll(selector) {
    // tool: 支持 '.like-btn[data-like-id="ID"]'（生产选择器，排除 hot 卡 <a>）
    //       与旧式裸 '[data-like-id="ID"]'（兼容历史调用）。
    const toolPrefix = '.like-btn[data-like-id="';
    const toolLegacy = '[data-like-id="';
    if (selector.startsWith(toolPrefix) || selector.startsWith(toolLegacy)) {
      const id = selector.slice(selector.startsWith(toolPrefix) ? toolPrefix.length : toolLegacy.length, -2);
      return domBtns.filter(b => b._dataLikeId === id);
    }
    // blog: 支持 '.article-like[data-blog-id="ID"]' 与旧式裸 '[data-blog-id="ID"]'。
    const blogPrefix = '.article-like[data-blog-id="';
    const blogLegacy = '[data-blog-id="';
    if (selector.startsWith(blogPrefix) || selector.startsWith(blogLegacy)) {
      const id = selector.slice(selector.startsWith(blogPrefix) ? blogPrefix.length : blogLegacy.length, -2);
      return domBtns.filter(b => b._dataBlogId === id);
    }
    if (selector.endsWith(':not([data-initialized])')) {
      return domBtns.filter(b => !b._initialized);
    }
    if (selector.includes('.heart')) {
      return []; // heartPop 暂不测
    }
    return [];
  },
};

resetFetch();

// Load the module (IIFE; executes and exposes window.LikeSystem).
require('../like.js');

// 测试钩子：把防抖时间从 300ms 调小到 30ms 以加速测试
window.LikeSystem._setDebounceMs(30);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------------- existing baseline tests (preserve) ---------------- */

test('window.LikeSystem is exposed with expected API', () => {
  assert.ok(window.LikeSystem, 'LikeSystem should exist');
  ['getLikes', 'saveLikes', 'getTotalLikes', 'toggleLike',
   'toggleArticleLike', 'initLikes', 'initArticleLikes'].forEach((fn) => {
    assert.strictEqual(typeof window.LikeSystem[fn], 'function', fn + ' should be a function');
  });
});

test('toggleLike flips localStorage and POSTs to /api/likes', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 50 }) } });
  const btn = makeBtn('tool-a');
  domBtns.push(btn);

  window.LikeSystem.toggleLike('tool-a');
  await sleep(80);

  assert.deepStrictEqual(JSON.parse(localStorage.getItem('toolbox_likes')), { 'tool-a': 1 });
  assert.strictEqual(window.LikeSystem.getTotalLikes('tool-a'), 1);

  const post = fetchCalls.find(c => c.url.endsWith('/api/likes') && c.opts && c.opts.method === 'POST');
  assert.ok(post, 'should POST to /api/likes');
  assert.deepStrictEqual(JSON.parse(post.opts.body), { toolId: 'tool-a', action: 'like' });

  // unlike
  window.LikeSystem.toggleLike('tool-a');
  await sleep(80);
  assert.deepStrictEqual(JSON.parse(localStorage.getItem('toolbox_likes')), { 'tool-a': 0 });
});

test('toggleArticleLike writes under the same storage key', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 50 }) } });
  const btn = makeBtn('blog-x', 'blog');
  domBtns.push(btn);

  window.LikeSystem.toggleArticleLike('blog-x');
  await sleep(80);
  assert.strictEqual(JSON.parse(localStorage.getItem('toolbox_likes'))['blog-x'], 1);

  window.LikeSystem.toggleArticleLike('blog-x');
  await sleep(80);
  assert.strictEqual(JSON.parse(localStorage.getItem('toolbox_likes'))['blog-x'], 0);
});

test('prefers window.ApiClient when present (no fetch fallback)', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 7 }) } });
  const calls = [];
  window.ApiClient = {
    toggleLike: (id, action) => { calls.push({ id, action }); return Promise.resolve({ count: 7 }); },
    fetchCount: (id) => Promise.resolve({ count: 7 }),
  };
  const btn = makeBtn('tool-b');
  domBtns.push(btn);

  window.LikeSystem.toggleLike('tool-b');
  await sleep(80);

  assert.strictEqual(calls.length, 1, 'ApiClient.toggleLike should be used');
  assert.strictEqual(calls[0].id, 'tool-b');
  assert.strictEqual(calls[0].action, 'like');
  assert.strictEqual(fetchCalls.length, 0, 'should NOT call fetch when ApiClient present');
  delete window.ApiClient;
});

test('falls back to fetch when ApiClient absent', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 7 }) } });
  const btn = makeBtn('tool-c');
  domBtns.push(btn);

  window.LikeSystem.toggleLike('tool-c');
  await sleep(80);

  const post = fetchCalls.find(c => c.url.endsWith('/api/likes') && c.opts && c.opts.method === 'POST');
  assert.ok(post, 'fetch fallback should POST to /api/likes');
});

/* ===== 新增：BUGFIX 回归测试（2026-09-05） ===== */

test('BUGFIX E9: 全局数=1 时全新访客红心为 false（不依赖 count>0）', () => {
  domBtns.length = 0;
  const btn = makeBtn('tool-e9');
  domBtns.push(btn);
  // 模拟服务端返回 1
  window.LikeSystem.updateLikeUI('tool-e9', 1);
  // 全新访客 localStorage 无记录 → isLiked 返回 false
  assert.strictEqual(btn._countEl.textContent, '1', 'count 应等于 serverCount');
  assert.strictEqual(btn.isLiked(), false, '红心应为 false（不依赖 count>0）');
});

test('BUGFIX 乐观更新: 基于 serverCounts ±1，不写本地 0/1 覆盖', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 100 }) } });
  const btn = makeBtn('tool-opt');
  domBtns.push(btn);
  // 首屏 GET 到 7
  window.LikeSystem.updateLikeUI('tool-opt', 7);
  assert.strictEqual(btn._countEl.textContent, '7');

  window.LikeSystem.toggleLike('tool-opt');
  // UI 立即翻转：7 + 1 = 8（不等 debounce）
  assert.strictEqual(btn._countEl.textContent, '8', 'optimistic 应基于 serverCounts +1');
  assert.strictEqual(btn.isLiked(), true);

  // POST 完成后用服务端真值（fetch mock 返回 100）刷新
  await sleep(80);
  assert.strictEqual(btn._countEl.textContent, '100', 'POST 成功后 paint 应用服务端真值');
});

test('BUGFIX 失败回滚 (429/ok=false): 本地状态与显示值整体回滚', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: false, json: () => Promise.resolve(null) } });
  const btn = makeBtn('tool-429');
  domBtns.push(btn);
  window.LikeSystem.updateLikeUI('tool-429', 10);

  window.LikeSystem.toggleLike('tool-429');
  // 立即翻转
  assert.strictEqual(btn._countEl.textContent, '11', 'optimistic 11');
  assert.strictEqual(btn.isLiked(), true);

  await sleep(80);
  // 失败回滚
  assert.strictEqual(btn._countEl.textContent, '10', '回滚到 serverCount=10');
  assert.strictEqual(btn.isLiked(), false, 'liked 回滚');
});

test('BUGFIX 失败回滚 (500/json reject): 与 429 行为一致', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.reject(new Error('500')) } });
  const btn = makeBtn('tool-500');
  domBtns.push(btn);
  window.LikeSystem.updateLikeUI('tool-500', 20);

  window.LikeSystem.toggleLike('tool-500');
  await sleep(80);

  // json() reject → apiPost catch → null → 回滚
  assert.strictEqual(btn._countEl.textContent, '20', '500 回滚到 serverCount');
  assert.strictEqual(btn.isLiked(), false, 'liked 回滚');
});

test('BUGFIX 失败回滚 (网络异常/超时): fetch reject → 回滚', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ rejectWith: new TypeError('network error') });
  const btn = makeBtn('tool-net');
  domBtns.push(btn);
  window.LikeSystem.updateLikeUI('tool-net', 30);

  window.LikeSystem.toggleLike('tool-net');
  await sleep(80);

  assert.strictEqual(btn._countEl.textContent, '30', '网络异常回滚到 serverCount');
  assert.strictEqual(btn.isLiked(), false, 'liked 回滚');
});

test('BUGFIX 防抖合并: 30ms 内多次点击只发 1 次 POST', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 100 }) } });
  const btn = makeBtn('tool-debounce');
  domBtns.push(btn);
  window.LikeSystem.updateLikeUI('tool-debounce', 99);

  // 5 次连点，间隔 5ms << 30ms debounce
  for (let i = 0; i < 5; i++) {
    window.LikeSystem.toggleLike('tool-debounce');
    await sleep(5);
  }

  // 等 debounce 完成 + POST
  await sleep(120);

  const posts = fetchCalls.filter(c => c.opts && c.opts.method === 'POST');
  assert.strictEqual(posts.length, 1, '防抖合并应只发 1 次 POST');
});

test('BUGFIX E8: localStorage 不可用时点击不抛异常、UI 仍正常更新', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  installFetch({ resp: { ok: true, json: () => Promise.resolve({ count: 50 }) } });
  const btn = makeBtn('tool-e8');
  domBtns.push(btn);
  window.LikeSystem.updateLikeUI('tool-e8', 5);

  // 模拟 Cookie 全禁 → setItem/getItem 抛 SecurityError
  const origSet = localStorage.setItem;
  const origGet = localStorage.getItem;
  localStorage.setItem = () => { throw new Error('SecurityError: cookie disabled'); };
  localStorage.getItem = () => { throw new Error('SecurityError: cookie disabled'); };

  try {
    assert.doesNotThrow(() => {
      window.LikeSystem.toggleLike('tool-e8');
    }, '不应抛异常');

    // UI 立即翻转：5 + 1 = 6（base=5 → optimisticCount(5, true) = 6）
    assert.strictEqual(btn._countEl.textContent, '6', 'UI 应正常更新');
    assert.strictEqual(btn.isLiked(), true, 'liked 应立即更新');

    await sleep(80);

    // POST 完成后 liked 保持 true（memLikes 降级镜像仍记录了状态）
    assert.strictEqual(btn.isLiked(), true, '降级后 liked 应保持');
    assert.strictEqual(btn._countEl.textContent, '50', 'POST 成功应用服务端真值');
  } finally {
    localStorage.setItem = origSet;
    localStorage.getItem = origGet;
  }
});

test('BUGFIX 过期 GET 丢弃: 本地 toggle 后延迟返回的 GET 不覆盖已提交值', async () => {
  domBtns.length = 0;
  fetchCalls = [];
  // 区分 GET/POST：POST 快速返回 100；GET 延迟 200ms 返回旧值 1
  globalThis.fetch = (url, opts) => {
    fetchCalls.push({ url, opts });
    if (opts && opts.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 100 }) });
    }
    // GET 延迟 200ms 返回旧值
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ count: 1 }) }), 200);
    });
  };

  const btn = makeBtn('tool-stale');
  domBtns.push(btn);

  // init 触发 GET（延迟 200ms 返回旧值 1）
  window.LikeSystem.initLikes();
  // 立刻 toggle（POST 立即 + lastMutationAt 更新）
  window.LikeSystem.toggleLike('tool-stale');
  // 立即断言：optimistic → base=undefined 退化路径 → countEl=1
  assert.strictEqual(btn._countEl.textContent, '1');

  // 等 POST 完成 + GET 返回（200ms）
  await sleep(250);

  // POST 完成后 paint 应是 100；GET 返回 1 应被 lastMutationAt 守卫丢弃
  assert.strictEqual(btn._countEl.textContent, '100', 'POST 完成后应显示服务端真值 100');
  assert.notStrictEqual(btn._countEl.textContent, '1', '过期 GET 返回的旧值 1 应被丢弃');
});