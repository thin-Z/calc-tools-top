/**
 * Cloudflare Pages Function — 点赞 API (GET / POST)
 * 使用 Upstash Redis REST API (无需 npm 依赖)
 * Route: /api/likes
 */

async function rest(url, token, path) {
  if (!url) return null;
  const resp = await fetch(${url}, {
    headers: { Authorization: Bearer  },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.result;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const REST_URL = env.KV_REST_API_URL || '';
  const REST_TOKEN = env.KV_REST_API_TOKEN || '';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const toolId = url.searchParams.get('toolId');

      if (toolId) {
        const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
        let count = await rest(REST_URL, REST_TOKEN, /get/like:tool:);
        if (count === null) count = await rest(REST_URL, REST_TOKEN, /get/like:blog:);
        return new Response(JSON.stringify({
          toolId: cleanId,
          count: parseInt(count || '0', 10),
        }), { headers: corsHeaders() });
      }

      const keys = await rest(REST_URL, REST_TOKEN, '/keys/like:*');
      const result = {};
      if (keys && keys.length > 0) {
        for (const key of keys) {
          result[key] = parseInt((await rest(REST_URL, REST_TOKEN, /get/)) || '0', 10);
        }
      }
      return new Response(JSON.stringify(result), { headers: corsHeaders() });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const { toolId, action } = body || {};

      if (!toolId) {
        return new Response(JSON.stringify({ error: 'missing toolId' }), {
          status: 400,
          headers: corsHeaders(),
        });
      }

      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = (cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:') + cleanId;

      let count = parseInt((await rest(REST_URL, REST_TOKEN, /get/)) || '0', 10);
      count = action === 'unlike' ? Math.max(0, count - 1) : count + 1;
      await rest(REST_URL, REST_TOKEN, /set//);

      return new Response(JSON.stringify({ toolId: cleanId, count, liked: action !== 'unlike' }), {
        headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, fallback: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  }
}
