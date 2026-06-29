// api/likes.js
// Vercel Serverless Function — 点赞 API
// GET  /api/likes              → 返回所有点赞数
// GET  /api/likes?toolId=xxx   → 返回单个工具点赞数
// POST /api/likes              → 点赞 (+1) 或取消点赞 (-1)

import { kv } from '@vercel/kv';

const RATE_LIMIT = 20;
const RATE_WINDOW = 60;

export default async function handler(req, res) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(headers).end();
  }

  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const toolId = searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        let count = await kv.get('like:tool:' + cleanId);
        if (count === null) {
          count = await kv.get('like:blog:' + cleanId);
        }
        return res.status(200).json({ toolId: cleanId, count: parseInt(count || '0', 10) });
      }

      const keys = await kv.keys('like:*');
      const result = {};
      if (keys && keys.length > 0) {
        for (const key of keys) {
          const val = await kv.get(key);
          result[key] = parseInt(val || '0', 10);
        }
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || 'unknown';
      const rateKey = 'rate:' + ip + ':' + Math.floor(Date.now() / 60000);
      let rateCount = await kv.get(rateKey);
      if (rateCount && parseInt(rateCount, 10) >= RATE_LIMIT) {
        return res.status(429).json({ error: 'rate limited' });
      }
      await kv.set(rateKey, String((parseInt(rateCount || '0', 10) + 1)), { ex: RATE_WINDOW });

      const { toolId, action } = req.body;
      if (!toolId) {
        return res.status(400).json({ error: 'missing toolId' });
      }

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const prefix = cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:';
      const key = prefix + cleanId;

      let count = await kv.get(key);
      count = parseInt(count || '0', 10);
      count = action === 'unlike' ? Math.max(0, count - 1) : count + 1;
      await kv.set(key, String(count));

      return res.status(200).json({ toolId: cleanId, count, liked: action !== 'unlike' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    // Return 200 with fallback flag so client-side localStorage takes over
    return res.status(200).json({ error: e.message, fallback: true });
  }
}