// functions/api/likes.js
// Cloudflare Pages Function — 点赞 API
// GET  /api/likes?toolId=xxx   → 返回单个工具点赞数
// GET  /api/likes/all          → 返回所有点赞数
// POST /api/likes/toggle       → 点赞 (+1) 或取消点赞 (-1)

export async function onRequest(context) {
  const { request, env } = context;
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
      let count = await env.LIKES.get(`like:tool:${cleanId}`);
      if (count === null) {
        count = await env.LIKES.get(`like:blog:${cleanId}`);
      }
      return new Response(JSON.stringify({
        toolId: cleanId,
        count: parseInt(count || '0', 10),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname.endsWith('/all')) {
      const all = await env.LIKES.list({ prefix: 'like:' });
      const result = {};
      for (const key of all.keys) {
        const val = await env.LIKES.get(key.name);
        result[key.name] = parseInt(val || '0', 10);
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'missing toolId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ===== POST =====
  if (method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateKey = `rate:${ip}:${Math.floor(Date.now() / 60000)}`;
    const rateCount = await env.LIKES.get(rateKey);
    if (rateCount && parseInt(rateCount, 10) >= 20) {
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await env.LIKES.put(
      rateKey,
      String((parseInt(rateCount || '0', 10) + 1)),
      { expirationTtl: 120 }
    );

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { toolId, action = 'like' } = body;
    if (!toolId) {
      return new Response(JSON.stringify({ error: 'missing toolId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanId = toolId.replace(/[^a-zA-Z0-9_-]/g, '');

    // Determine prefix: blog IDs start with "blog_"
    const prefix = cleanId.startsWith('blog_') ? 'like:blog:' : 'like:tool:';
    const key = `${prefix}${cleanId}`;
    const current = await env.LIKES.get(key);
    let count = parseInt(current || '0', 10);

    if (action === 'like') {
      count += 1;
    } else if (action === 'unlike') {
      count = Math.max(0, count - 1);
    }

    await env.LIKES.put(key, String(count));

    return new Response(JSON.stringify({
      toolId: cleanId,
      count,
      liked: action === 'like',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
