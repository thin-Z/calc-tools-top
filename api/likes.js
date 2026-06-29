// api/likes.js — Vercel Serverless Function

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { searchParams } = new URL(req.url, 'http://localhost');
      const toolId = searchParams.get('toolId');
      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        let count = await kv.get('like:tool:' + cleanId);
        if (count === null) count = await kv.get('like:blog:' + cleanId);
        return res.status(200).json({ toolId: cleanId, count: parseInt(count || '0', 10) });
      }
      return res.status(200).json(await getAllLikes());
    } catch (e) {
      return res.status(200).json({ error: e.message, stack: e.stack });
    }
  }

  if (req.method === 'POST') {
    try {
      // Vercel Node.js runtime: try req.body first, then rawBody
      let body = null;
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        body = req.body;
      } else if (req.body && typeof req.body === 'string') {
        body = JSON.parse(req.body);
      }

      if (!body) {
        return res.status(400).json({
          error: 'no body parsed',
          bodyType: typeof req.body,
          bodyVal: req.body,
          method: req.method,
          contentType: req.headers['content-type'],
        });
      }

      const { toolId, action } = body;
      if (!toolId) return res.status(400).json({ error: 'missing toolId', body });

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = (cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:') + cleanId;
      let count = parseInt((await kv.get(key)) || '0', 10);
      count = action === 'unlike' ? Math.max(0, count - 1) : count + 1;
      await kv.set(key, String(count));
      return res.status(200).json({ toolId: cleanId, count, liked: action !== 'unlike' });
    } catch (e) {
      return res.status(200).json({ error: e.message, stack: e.stack });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}

async function getAllLikes() {
  const keys = await kv.keys('like:*');
  const result = {};
  if (keys && keys.length > 0) {
    for (const key of keys) {
      result[key] = parseInt((await kv.get(key)) || '0', 10);
    }
  }
  return result;
}