// 把模板复制到目标目录，写入 frontend.json，放进打包脚本。
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest } from "./manifest.mjs";
import { getLocale } from "./i18n.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const TEMPLATES = ["vanilla", "simple", "vite-react", "vite-react-simple"];
export const BASE_TEMPLATES = ["vanilla", "vite-react"];
export const LAYOUTS = ["dev", "simple"];

// 向导是两级：先选技术栈（vanilla / vite-react），再选用途（dev / simple）。
// CLI 也接受直接写最终模板 id（backward compatible）。
export function resolveTemplate(base, layout = "dev") {
  if (!BASE_TEMPLATES.includes(base)) return null;
  if (layout === "simple") return base === "vanilla" ? "simple" : "vite-react-simple";
  return base;
}

export function splitTemplate(id) {
  if (id === "simple") return { base: "vanilla", layout: "simple" };
  if (id === "vite-react-simple") return { base: "vite-react", layout: "simple" };
  if (BASE_TEMPLATES.includes(id)) return { base: id, layout: "dev" };
  return null;
}

export function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/[-.]+$/g, "")
      .replace(/^[-.]+/g, "") || "mcugl-frontend"
  );
}

const PLACEHOLDER_FILES = /\.(md|json|html|css|js|mjs|ts|tsx)$/i;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJs(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

// 占位符出现在不同语法里：HTML 文本、JS 字符串、JSON/README 纯文本。
// 用户给的名字可能带引号或尖括号，替换前按目标文件类型转义，避免生成坏代码。
function escapeForFile(fileName, value) {
  if (/\.html$/i.test(fileName)) return escapeHtml(value);
  if (/\.(js|mjs|ts|tsx)$/i.test(fileName)) return escapeJs(value);
  return value;
}

function replacePlaceholders(directory, values) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      replacePlaceholders(full, values);
      continue;
    }
    if (!PLACEHOLDER_FILES.test(entry.name)) continue;

    let text = readFileSync(full, "utf8");
    let changed = false;
    for (const [key, value] of Object.entries(values)) {
      const token = `{{${key}}}`;
      if (text.includes(token)) {
        text = text.split(token).join(escapeForFile(entry.name, value));
        changed = true;
      }
    }
    if (changed) writeFileSync(full, text);
  }
}

export function scaffold({
  root,
  template,
  identifier,
  name,
  version,
  description,
  author,
  packageName,
  force,
  lang = getLocale(),
}) {
  if (existsSync(root) && readdirSync(root).length > 0) {
    if (!force) throw new Error(`目录非空：${root}（加 --force 覆盖）`);
    rmSync(root, { recursive: true, force: true });
  }
  mkdirSync(root, { recursive: true });

  cpSync(join(packageRoot, "templates", template), root, {
    recursive: true,
    filter: (source) => !source.includes("node_modules"),
  });

  const manifest = buildManifest({
    identifier,
    name,
    version,
    description,
    author,
    entry: "index.html",
  });
  const frontendDir = join(root, "frontend");
  mkdirSync(frontendDir, { recursive: true });
  writeFileSync(join(frontendDir, "frontend.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  mkdirSync(join(root, "scripts"), { recursive: true });
  // 打包脚本里的构建信息按生成时的语言固定下来：英文向导 → 英文日志，中文向导 → 中文日志。
  const packSource = readFileSync(join(packageRoot, "shared", "pack-frontend.mjs"), "utf8").replace(
    'const SCAFFOLD_LANG = "__MCUGL_LANG__";',
    `const SCAFFOLD_LANG = ${JSON.stringify(lang === "zh" ? "zh" : "en")};`,
  );
  writeFileSync(join(root, "scripts", "pack.mjs"), packSource);
  cpSync(
    join(packageRoot, "shared", "kernel-methods.json"),
    join(root, "scripts", "kernel-methods.json"),
  );

  replacePlaceholders(root, {
    name,
    identifier,
    version,
    description: description || "",
    packageName,
  });

  return { frontendDir, template };
}
