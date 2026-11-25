import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const currentDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(currentDir, "frontend");
const outDir = resolve(currentDir, "dist/frontend");

// 演示模式标记：`--mode demo` 时在 <head> 里注入，dev 与 build 行为一致。
const DEMO_FLAG = '<script>window.__MCUGL_DEMO__ = true;</script>';

// frontend.json 是启动器识别前端的唯一依据。它随构建复制进产物目录，
// 这样 dist/frontend 本身就是一个可以直接用 MCUGL_FRONTEND 指向的目录。
function copyManifest(): Plugin {
  return {
    name: "mcugl-copy-manifest",
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(sourceDir, "frontend.json"), resolve(outDir, "frontend.json"));
    },
  };
}

function demoFlag(demo: boolean): Plugin {
  return {
    name: "mcugl-demo-flag",
    transformIndexHtml(html) {
      return demo ? html.replace("<head>", `<head>${DEMO_FLAG}`) : html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === "demo";

  return {
    // 页面由自定义协议按目录加载，不在站点根路径下，必须用相对 base。
    base: "./",
    root: sourceDir,
    plugins: [react(), copyManifest(), demoFlag(demo)],
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: true,
    },
    clearScreen: false,
    server: {
      // 演示端口用 5176，便于和启动器自己的 5174 / 5175 并排对比
      port: demo ? 5176 : 5177,
      strictPort: true,
      host: false,
    },
  };
});
