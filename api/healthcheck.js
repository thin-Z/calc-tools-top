// api/healthcheck.js — 点赞写路径探活（Vercel Cron）
//
// 背景（2026-08-17 复盘 P1）：点赞计数曾因 Upstash REST 调用格式错误静默失效
// 数月（GET /api/likes 正常返回 200，但 POST 计数从不落库），用户不点按钮根本
// 察觉不到。本端点由 vercel.json 的 crons 定时触发，验证「读 → 写递增 → 写恢复」
// 全链路，任一环节异常即返回 500（Vercel Cron 面板可见失败）。
//
// 设计：
//  - 专用 id __health__（在 api/allowed-ids.js 白名单内，由 gen-allowed-ids.js 注入）
//  - like + unlike 净零，不污染任何真实工具/博客的计数
//  - 受 /api/likes 防刷保护（每 IP 每工具每日 5 次，本探活每日 2 次，安全）
//  - 通过 https 自调用生产域名，验证的是「线上真实链路」而非本函数内的假设
const https = require('https');

const HEALTH_ID = '__health__';
const SITE = process.env.SITE_URL || 'https://www.calc-tools.top';
const TIMEOUT_MS = 8000;

function call(path, method, body) {
  return new Promise((resolve) => {
    const u = new URL(SITE + path);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search, // 保留 query string（如 ?toolId=__health__）
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { /* ignore */ }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', () => resolve({ status: 0, json: null }));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ status: 0, json: null }); });
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    // 1) 基线：读当前计数
    const before = await call('/api/likes?toolId=' + HEALTH_ID, 'GET');
    if (before.status !== 200 || !before.json || typeof before.json.count !== 'number') {
      return res.status(500).json({ ok: false, step: 'read-baseline', status: before.status, error: 'GET /api/likes failed' });
    }
    // 2) 写递增：like 必须 +1（核心验证——此前 INCR 格式 bug 正是这一步静默失败）
    const like = await call('/api/likes', 'POST', { toolId: HEALTH_ID, action: 'like' });
    if (like.status !== 200 || !like.json || like.json.count !== before.json.count + 1) {
      return res.status(500).json({ ok: false, step: 'like-increment', got: like.json, expected: before.json.count + 1, error: 'write path broken' });
    }
    // 3) 写恢复：unlike 必须回落到基线（净零，不污染数据）
    const unlike = await call('/api/likes', 'POST', { toolId: HEALTH_ID, action: 'unlike' });
    if (unlike.status !== 200 || !unlike.json || unlike.json.count !== before.json.count) {
      return res.status(500).json({ ok: false, step: 'unlike-restore', got: unlike.json, expected: before.json.count, error: 'restore broken' });
    }
    return res.status(200).json({ ok: true, count: before.json.count, verifiedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
