// functions/api/[[catch]].js
// Cloudflare Pages Function — 点赞 API（catch-all 路由）
// GET  /api/likes              → 返回所有点赞数
// GET  /api/likes?toolId=xxx   → 返回单个工具点赞数
// POST /api/likes              → 点赞 (+1) 或取消点赞 (-1)

export async function onRequest(context) {
  const { request, env } = context;

  if (!env || !env.LIKES) {
    return new Response(JSON.stringify({ error: 'KV not ready', count: 0 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const url = new URL(request.url);
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ===== GET =====
  if (method === 'GET') {
    const toolId = url.searchParams.get('toolId');

    if (toolId) {
      const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
      try {
        let count = await env.LIKES.get('like:tool:' + cleanId);
        if (count === null) {
          count = await env.LIKES.get('like:blog:' + cleanId);
        }
        return new Response(JSON.stringify({
          toolId: cleanId,
          count: parseInt(count || '0', 10),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, toolId: cleanId, count: 0 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 无 toolId 参数时返回全部
    try {
      const all = await env.LIKES.list({ prefix: 'like:' });
      const result = {};
      for (const key of all.keys) {
        const val = await env.LIKES.get(key.name);
        result[key.name] = parseInt(val || '0', 10);
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ===== POST =====
  if (method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateKey = 'rate:' + ip + ':' + Math.floor(Date.now() / 60000);
    let rateCount = null;
    try { rateCount = await env.LIKES.get(rateKey); } catch (e) { /* skip */ }
    if (rateCount && parseInt(rateCount, 10) >= 20) {
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      await env.LIKES.put(
        rateKey,
        String((parseInt(rateCount || '0', 10) + 1)),
        { expirationTtl: 120 }
      );
    } catch (e) { /* skip */ }

    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: 'invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { toolId, action } = body;
    if (!toolId) {
      return new Response(JSON.stringify({ error: 'missing toolId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');
    const prefix = cleanId.indexOf('blog_') === 0 ? 'like:blog:' : 'like:tool:';
    const key = prefix + cleanId;

    let count = 0;
    try {
      const current = await env.LIKES.get(key);
      count = parseInt(current || '0', 10);
      if (action === 'unlike') {
        count = Math.max(0, count - 1);
      } else {
        count += 1;
      }
      await env.LIKES.put(key, String(count));
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message, toolId: cleanId, count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      toolId: cleanId,
      count,
      liked: action !== 'unlike',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
