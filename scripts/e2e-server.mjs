#!/usr/bin/env node
/**
 * scripts/e2e-server.mjs — E2E 本地静态服务器（T1.5 Playwright 常驻套件配套）
 * -----------------------------------------------------------------
 * 零依赖静态文件服务器：serve dist/ 目录，供 Playwright webServer 使用。
 * 特性：
 *   - 目录请求自动补 index.html；无扩展名路径自动补 .html（对齐 Vercel 静态行为）
 *   - 未命中回退 404.html（可测试真实 404 页渲染）
 *   - Cache-Control: no-store（保证每次断言拿到最新构建产物）
 *
 * 用法：node scripts/e2e-server.mjs   （端口默认 4173，可用 E2E_PORT 覆盖）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.E2E_PORT || 4173);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(ROOT)) {
  console.error(`[e2e-server] dist/ 不存在：${ROOT}。请先运行 node scripts/build.mjs`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    let file = path.normalize(path.join(ROOT, urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const withHtml = file + '.html';
      if (fs.existsSync(withHtml)) {
        file = withHtml;
      } else {
        res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
        const notFound = path.join(ROOT, '404.html');
        return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : '404');
      }
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[e2e-server] serving ${ROOT} at http://${HOST}:${PORT}`);
});
