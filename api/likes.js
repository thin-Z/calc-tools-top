const REST_URL = process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function rest(path) {
  if (!REST_URL) return null;
  const resp = await fetch(REST_URL + path, {
    headers: { Authorization: 'Bearer ' + REST_TOKEN },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data && data.result;
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
        let count = await rest('/get/like:tool:' + cleanId);
        if (count === null) count = await rest('/get/like:blog:' + cleanId);
        return res.status(200).json({
          toolId: cleanId,
          count: parseInt(count || '0', 10),
        });
      }

      const keys = await rest('/keys/like:*');
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
      const action = body && body.action;

      if (!toolId) return res.status(400).json({ error: 'missing toolId' });

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = (cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:') + cleanId;

      let count = parseInt((await rest('/get/' + key)) || '0', 10);
      count = action === 'unlike' ? Math.max(0, count - 1) : count + 1;
      await rest('/set/' + key + '/' + count);

      return res.status(200).json({ toolId: cleanId, count, liked: action !== 'unlike' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(200).json({ error: e.message, fallback: true });
  }
};
