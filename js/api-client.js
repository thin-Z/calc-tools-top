// js/api-client.js
// Cloudflare Worker API 客户端 + 降级策略
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
    return apiFetch(API_BASE + '/all');
  }

  // 点赞/取消点赞
  function toggleLike(toolId, action) {
    return apiFetch(API_BASE + '/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: toolId, action: action || 'like' })
    });
  }

  window.ApiClient = {
    fetchCount: fetchCount,
    fetchAllCounts: fetchAllCounts,
    toggleLike: toggleLike,
    getLocalLikes: getLocalLikes,
    setLocalLikes: setLocalLikes,
  };
})();
