import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const currentDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(currentDir, "frontend");
const outDir = resolve(currentDir, "dist/frontend");

// frontend.json 是启动器识别前端的唯一依据。它随代码一起构建进产物目录，
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

export default defineConfig({
  // 页面由自定义协议加载，不在站点根路径下，必须用相对 base。
  base: "./",
  root: sourceDir,
  plugins: [react(), copyManifest()],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
  },
});
