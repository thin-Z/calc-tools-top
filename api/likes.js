// api/likes.js
// Vercel Serverless Function — 点赞 API

import { kv } from '@vercel/kv';

const RATE_LIMIT = 20;
const RATE_WINDOW = 60;

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  res.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, 'http://localhost');
      const toolId = searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        let count = await kv.get('like:tool:' + cleanId);
        if (count === null) count = await kv.get('like:blog:' + cleanId);
        return res.status(200).json({ toolId: cleanId, count: parseInt(count || '0', 10) });
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

    if (req.method === 'POST') {
      const body = await readBody(req);
      const { toolId, action } = body || {};

      if (!toolId) {
        return res.status(400).json({ error: 'missing toolId', received: body });
      }

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

      return res.status(200).json({ toolId: cleanId, count, liked: action !== 'unlike' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(200).json({ error: e.message, fallback: true });
  }
}