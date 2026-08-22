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

  // 带超时的 fetch 封装
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

  // 查询单个工具点赞数
  function fetchCount(toolId) {
    return apiFetch(API_BASE + '?toolId=' + encodeURIComponent(toolId));
  }

  // 查询所有工具点赞数
  function fetchAllCounts() {
    return apiFetch(API_BASE);
  }

  // 点赞/取消点赞
  function toggleLike(toolId, action) {
    return apiFetch(API_BASE, {
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
