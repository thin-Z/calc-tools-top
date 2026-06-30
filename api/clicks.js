// api/clicks.js
// Vercel Serverless Function — 点击量 API
// GET  /api/clicks?toolId=xxx  → 返回单个工具总点击量
// POST /api/clicks              → 点击 +1，返回最新总数

const https = require('https');

const REST_URL = process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || '';

function rest(path) {
  return new Promise((resolve) => {
    if (!REST_URL) return resolve(null);
    const url = new URL(REST_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + REST_TOKEN },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && parsed.result !== undefined ? parsed.result : null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const searchParams = new URL(req.url, 'http://localhost').searchParams;
      const toolId = searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        const total = await rest('/get/click:tool:' + cleanId);
        return res.status(200).json({
          toolId: cleanId,
          total: parseInt(total || '0', 10),
        });
      }

      const keys = await rest('/keys/click:*');
      const result = {};
      if (keys && keys.length > 0) {
        for (const key of keys) {
          result[key] = parseInt((await rest('/get/' + key)) || '0', 10);
        }
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      let raw = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', resolve);
      });
      const body = (function() { try { return JSON.parse(raw); } catch(e) { return {}; } })();
      const toolId = body && body.toolId;

      if (!toolId) return res.status(400).json({ error: 'missing toolId' });

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = 'click:tool:' + cleanId;

      let total = parseInt((await rest('/get/' + key)) || '0', 10);
      total += 1;
      await rest('/set/' + key + '/' + total);

      return res.status(200).json({ toolId: cleanId, total });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(200).json({ error: e.message, fallback: true });
  }
};
