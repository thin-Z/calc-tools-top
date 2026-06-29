// api/likes.js
// Vercel Serverless Function — 全局点赞 API
// GET  /api/likes              → 返回所有点赞数
// GET  /api/likes?toolId=xxx   → 返回单个工具点赞数
// POST /api/likes              → 点赞 (+1) 或取消点赞 (-1)
//
// 依赖: @vercel/kv (Upstash Redis)
// 环境变量: KV_URL (Vercel KV 自动注入)

import { kv } from '@vercel/kv';

const RATE_LIMIT = 20;        // 每分钟每 IP 最大请求数
const RATE_WINDOW = 60;       // 限流窗口（秒）

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ===== GET =====
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, 'http://localhost');
      const toolId = searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        let count = await kv.get('like:tool:' + cleanId);
        if (count === null) count = await kv.get('like:blog:' + cleanId);
        return res.status(200).json({
          toolId: cleanId,
          count: parseInt(count || '0', 10),
        });
      }

      const keys = await kv.keys('like:*');
      const result = {};
      if (keys && keys.length > 0) {
        for (const key of keys) {
          result[key] = parseInt((await kv.get(key)) || '0', 10);
        }
      }
      return res.status(200).json(result);
    }

    // ===== POST =====
    if (req.method === 'POST') {
      const body = await readBody(req);
      const { toolId, action } = body || {};

      if (!toolId) {
        return res.status(400).json({ error: 'missing toolId' });
      }

      // Rate limit
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] || 'unknown';
      const rateKey = 'rate:' + ip + ':' + Math.floor(Date.now() / 60000);
      let rateCount = await kv.get(rateKey);
      if (rateCount && parseInt(rateCount, 10) >= RATE_LIMIT) {
        return res.status(429).json({ error: 'rate limited' });
      }
      await kv.set(rateKey, String((parseInt(rateCount || '0', 10) + 1)), { ex: RATE_WINDOW });

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const prefix = cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:';
      const key = prefix + cleanId;

      let count = parseInt((await kv.get(key)) || '0', 10);
      count = action === 'unlike' ? Math.max(0, count - 1) : count + 1;
      await kv.set(key, String(count));

      return res.status(200).json({
        toolId: cleanId,
        count,
        liked: action !== 'unlike',
      });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    // 出错时返回 fallback 标记，客户端 localStorage 接管
    return res.status(200).json({ error: e.message, fallback: true });
  }
}