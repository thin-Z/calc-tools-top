// js/api-client.js
// Vercel Serverless API 客户端 + 降级策略
// 在 like.js 和 site.js 之前加载

(function() {
  'use strict';

  var API_BASE = '/api/likes';
  var TIMEOUT_MS = 3000;
  var LIKE_KEY = 'toolbox_likes';

  function getLocalLikes() {
    try { return JSON.parse(localStorage.getItem(LIKE_KEY)) || {}; }
    catch(e) { return {}; }
  }

  function setLocalLikes(likes) {
    localStorage.setItem(LIKE_KEY, JSON.stringify(likes));
  }

  // 带超时的 fetch 封装（成功/失败均返回解析后的 data；失败返回 null）
  function apiFetch(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, TIMEOUT_MS);
    return fetch(url, options).then(function(res) {
      clearTimeout(timer);
      if (!res.ok) return null;
      return res.json();
    }).catch(function() {
      clearTimeout(timer);
      return null;
    });
  }

  // 带状态位的 fetch 封装：返回 { data, status }，供 like.js 区分限流(429)等
  function apiFetchRaw(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, TIMEOUT_MS);
    return fetch(url, options).then(function(res) {
      clearTimeout(timer);
      return res.json().then(function(d) {
        return { data: res.ok ? d : (d || null), status: res.status };
      }).catch(function() {
        return { data: null, status: res.status };
      });
    }).catch(function() {
      clearTimeout(timer);
      return { data: null, status: 0 };
    });
  }

  // 查询单个工具点赞数
  function fetchCount(toolId) {
    return apiFetch(API_BASE + '?toolId=' + encodeURIComponent(toolId));
  }

  // 查询所有工具点赞数
  function fetchAllCounts() {
    return apiFetch(API_BASE);
  }

  // 批量查询多个工具点赞数：GET /api/likes?tools=a,b,c → { tools: { a: 1, b: 2 } }
  function fetchCountsBulk(toolIds) {
    if (!Array.isArray(toolIds) || !toolIds.length) return Promise.resolve({ tools: {} });
    var uniq = [];
    toolIds.forEach(function (id) {
      if (uniq.indexOf(id) === -1) uniq.push(id);
    });
    return apiFetch(API_BASE + '?tools=' + encodeURIComponent(uniq.join(',')));
  }

  // 批量查询多个工具点击量：GET /api/clicks?tools=a,b,c → { tools: { a: 1, b: 2 } }
  function fetchClicksBulk(toolIds) {
    if (!Array.isArray(toolIds) || !toolIds.length) return Promise.resolve({ tools: {} });
    var uniq = [];
    toolIds.forEach(function (id) {
      if (uniq.indexOf(id) === -1) uniq.push(id);
    });
    return apiFetch('/api/clicks?tools=' + encodeURIComponent(uniq.join(',')));
  }

  // 点赞/取消点赞（返回 { data, status } 以便 like.js 区分限流/失败）
  function toggleLike(toolId, action) {
    return apiFetchRaw(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: toolId, action: action || 'like' })
    });
  }

  // 通用 GET 请求
  function apiGet(path) {
    return apiFetch(path);
  }

  // 通用 POST 请求
  function apiPost(path, data) {
    return apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  window.ApiClient = {
    fetchCount: fetchCount,
    fetchAllCounts: fetchAllCounts,
    fetchCountsBulk: fetchCountsBulk,
    fetchClicksBulk: fetchClicksBulk,
    toggleLike: toggleLike,
    getLocalLikes: getLocalLikes,
    setLocalLikes: setLocalLikes,
    get: apiGet,
    post: apiPost,
    // P1-1：单一数据源，like.js / site.js 从此处读取，避免三处硬编码
    config: {
      LIKE_KEY: LIKE_KEY,
      API_BASE: API_BASE,
      TIMEOUT_MS: TIMEOUT_MS,
    },
  };
})();
