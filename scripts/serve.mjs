// 零依赖静态服务器：只用来在浏览器里预览 frontend/，不参与打包。
//
// 用法：
//   node scripts/serve.mjs            # http://127.0.0.1:5173
//   node scripts/serve.mjs 8080       # 换端口
//
// 为什么需要它：index.html 用 <script type="module">，file:// 打开会被 CORS 拦。
// 真正的启动器里前端是被塞进 Tauri 窗口的，不需要这个服务器。

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "frontend");
const PORT = Number(process.argv[2] || process.env.PORT || 5173);
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".mcmeta": "application/json; charset=utf-8",
};

function insideRoot(path) {
  const full = resolve(path);
  return full === ROOT || full.startsWith(ROOT + sep);
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const relative = normalize(clean).replace(/^([/\\])+/, "");
  let target = join(ROOT, relative);
  if (!insideRoot(target)) return null;

  let info = await stat(target).catch(() => null);
  if (info && info.isDirectory()) {
    target = join(target, "index.html");
    info = await stat(target).catch(() => null);
  }
  if (!info || !info.isFile()) return null;
  return { path: target, size: info.size };
}

const server = createServer(async (request, response) => {
  const url = request.url || "/";
  const file = await resolveFile(url);

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(`404 ${url}\n只服务 frontend/ 目录下的文件。`);
    return;
  }

  response.writeHead(200, {
    "content-type": MIME[extname(file.path).toLowerCase()] || "application/octet-stream",
    "content-length": file.size,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  createReadStream(file.path).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`MCUGL 命令终端 · 预览`);
  console.log(`  http://${HOST}:${PORT}/`);
  console.log(`  根目录 ${ROOT}`);
  console.log(`  演示参数示例：http://${HOST}:${PORT}/?run=/help&type=/seat`);
  console.log(`  Ctrl+C 结束`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`端口 ${PORT} 已被占用，换一个：node scripts/serve.mjs 5174`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
