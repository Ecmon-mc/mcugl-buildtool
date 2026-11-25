#!/usr/bin/env node
// 把前端目录打包成 `.mcuglf`（本质是 zip），供 MCUGL Launcher
// 「设置 → 开发者选项 → 前端」导入。
//
// 用法：
//   node scripts/pack.mjs frontend
//   node scripts/pack.mjs dist/frontend --out dist-frontends/my.mcuglf
//
// 不依赖任何 npm 包：Node 自带 zlib 做 deflate，CRC32 在这里实现。
// 包内约定见 MCUGL 的 docs/FRONTEND_PACKAGE.md：根目录必须有 frontend.json。
//
// 构建信息默认英文；脚手架生成时会把下面的 SCAFFOLD_LANG 换成生成时选择的语言，
// 因此中文向导生成的工程会打印中文日志。需要临时覆盖时设 MCUGL_PACK_LANG=en|zh。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const SCAFFOLD_LANG = "zh";

const MESSAGES = {
  en: {
    help: `Usage: node scripts/pack.mjs <frontend-directory> [--out <file.mcuglf>] [--allow-incomplete]

The directory root must contain frontend.json:
  {
    "identifier": "com.example.my-frontend",
    "name": "My Frontend",
    "version": "1.0.0",
    "kernelApi": "^1.0.0",
    "entry": "index.html"
  }

Output defaults to dist-frontends/<identifier>-<version>.mcuglf.

Parity check: a distributable frontend must cover all 66 kernel methods in
kernel-methods.json (host management commands excluded). Packing fails when
methods are missing; --allow-incomplete is only for preview builds.`,
    errOutPath: "--out needs an output path",
    errNeedDir: "Expected exactly one frontend directory.",
    errSymlink: "Symbolic links are not allowed: {path}",
    errIllegalPath: "Illegal path: {name}",
    errFileTooLarge: "File too large: {name}",
    errTotalTooLarge: "The frontend directory exceeds 256 MiB in total",
    errReadManifest: "Failed to read {path}: {error}",
    errManifestField:
      "frontend.json is missing the string field {key} (identifier is required when packing)",
    errIdentifier:
      "identifier must be 3–128 letters, digits and . - _, and must not start with a dot: {value}",
    errVersion: "version must be semver (e.g. 1.0.0): {value}",
    errEntry: "entry must be a relative path inside the package: {value}",
    errEntryMissing: "Entry file not found: {entry}",
    errEmptyDir: "The frontend directory is empty",
    errTooManyFiles: "More than {max} files",
    errNoManifest: "frontend.json is missing from the package",
    coverageHeader:
      "Insufficient method coverage: {covered}/{total} kernel methods, missing {missing}:",
    coverageHint:
      "A distributable frontend must cover every method in kernel-methods.json (host management commands excluded).\nComplete the missing methods and retry; for a preview package add --allow-incomplete.",
    coveragePreview:
      "Coverage {covered}/{total}, missing {missing} (preview package, --allow-incomplete)",
    coverageLine: "  Coverage: {covered}/{total} kernel methods",
    coverageSkipped: "scripts/kernel-methods.json not found; skipping the coverage check",
    outFrontend: "  Frontend: {name} {version} ({identifier})",
    outFiles: "  Files: {count}, {size} KiB raw",
    outArtifact: "  Package: {path} ({size} KiB)",
    outSha: "  sha256: {hash}",
  },
  zh: {
    help: `用法：node scripts/pack.mjs <前端目录> [--out <文件.mcuglf>] [--allow-incomplete]

目录根部必须包含 frontend.json：
  {
    "identifier": "com.example.my-frontend",
    "name": "我的前端",
    "version": "1.0.0",
    "kernelApi": "^1.0.0",
    "entry": "index.html"
  }

输出默认写到 dist-frontends/<identifier>-<version>.mcuglf。

功能对等检查：分发级前端必须覆盖 kernel-methods.json 里的全部 66 个内核方法
（前端管理命令除外）。缺少方法时打包会失败；--allow-incomplete 仅用于预览版。`,
    errOutPath: "--out 后面需要一个输出路径",
    errNeedDir: "需要一个前端目录。",
    errSymlink: "不允许符号链接：{path}",
    errIllegalPath: "非法路径：{name}",
    errFileTooLarge: "文件过大：{name}",
    errTotalTooLarge: "前端目录总大小超过 256 MiB",
    errReadManifest: "读取 {path} 失败：{error}",
    errManifestField: "frontend.json 缺少字符串字段 {key}（打包时必须提供 identifier）",
    errIdentifier: "identifier 需要是 3–128 个字母数字与 . - _，且不能以点开头：{value}",
    errVersion: "version 必须是 semver（如 1.0.0）：{value}",
    errEntry: "entry 必须是包内相对路径：{value}",
    errEntryMissing: "入口文件不存在：{entry}",
    errEmptyDir: "目录是空的",
    errTooManyFiles: "文件数超过 {max}",
    errNoManifest: "打包后缺少 frontend.json",
    coverageHeader: "功能覆盖不足：{covered}/{total} 个内核方法，缺少 {missing} 个：",
    coverageHint:
      "分发级前端必须覆盖 kernel-methods.json 里的全部方法（前端管理命令除外）。\n补全后重试；如果只是打预览包，加 --allow-incomplete。",
    coveragePreview: "覆盖 {covered}/{total}，缺 {missing} 个（预览包，--allow-incomplete）",
    coverageLine: "  覆盖：{covered}/{total} 个内核方法",
    coverageSkipped: "未找到 scripts/kernel-methods.json，跳过功能覆盖检查",
    outFrontend: "  前端：{name} {version}（{identifier}）",
    outFiles: "  文件：{count} 个，原始 {size} KiB",
    outArtifact: "  产物：{path}（{size} KiB）",
    outSha: "  sha256：{hash}",
  },
};

// 语言优先级：显式 MCUGL_PACK_LANG > 脚手架生成时写入的语言 > LANG/LC_ALL 里的 zh > 英文。
const LANG = (() => {
  const explicit = process.env.MCUGL_PACK_LANG;
  if (explicit === "zh" || explicit === "en") return explicit;
  if (SCAFFOLD_LANG === "zh" || SCAFFOLD_LANG === "en") return SCAFFOLD_LANG;
  return /^zh/i.test(process.env.LC_ALL || process.env.LANG || "") ? "zh" : "en";
})();

function t(key, vars = {}) {
  const template = MESSAGES[LANG][key] ?? MESSAGES.en[key];
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist-frontends", ".staging"]);
const MAX_ENTRY_BYTES = 128 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const MAX_ENTRIES = 2048;
// 只有可能包含 invoke 名称的文本文件参与覆盖扫描；图片、字体等直接跳过。
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".css",
  ".vue",
  ".svelte",
]);

function fail(message) {
  console.error(`[frontend:pack] ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(t("help"));
}

function parseArgs(argv) {
  const positional = [];
  let output = null;
  let allowIncomplete = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out" || arg === "-o") {
      output = argv[++index];
      if (!output) fail(t("errOutPath"));
    } else if (arg === "--allow-incomplete") {
      allowIncomplete = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    printHelp();
    fail(t("errNeedDir"));
  }
  return { dir: positional[0], output, allowIncomplete };
}

// 方法清单随脚手架复制到 scripts/kernel-methods.json；直接运行 shared/ 下的副本时
// 也能从同目录读到。缺失时跳过检查（不阻塞手工打包）。
function loadKernelMethods() {
  const file = join(dirname(fileURLToPath(import.meta.url)), "kernel-methods.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed.methods) ? parsed.methods : null;
  } catch {
    return null;
  }
}

function methodPattern(method) {
  const escaped = method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 只要求方法名两侧不是标识符字符。压缩器既可能保留引号，
  // 也可能把字符串数组折叠成 `get_overview.get_settings.…` 这样的拼接串。
  return new RegExp(`(^|[^A-Za-z0-9_$])${escaped}($|[^A-Za-z0-9_$])`);
}

function scanCoverage(files, methods) {
  const covered = new Set();
  const patterns = methods.map((method) => [method, methodPattern(method)]);
  for (const { file } of files) {
    const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!text.includes("_")) continue;
    for (const [method, pattern] of patterns) {
      if (covered.has(method)) continue;
      if (pattern.test(text)) covered.add(method);
    }
  }
  return methods.filter((method) => !covered.has(method));
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function walk(directory, root, files) {
  const entries = readdirSync(directory, { withFileTypes: true });
  // 排序让产物可复现，便于比较两次打包的 sha256。
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      fail(t("errSymlink", { path: join(relative(root, directory), entry.name) }));
    }
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, root, files);
    } else if (entry.isFile()) {
      const name = relative(root, full).split(sep).join("/");
      if (name.includes("..")) fail(t("errIllegalPath", { name }));
      files.push({ name, file: full });
    }
  }
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let total = 0;

  for (const { name, file } of files) {
    const data = readFileSync(file);
    if (data.length > MAX_ENTRY_BYTES) fail(t("errFileTooLarge", { name }));
    total += data.length;
    if (total > MAX_TOTAL_BYTES) fail(t("errTotalTooLarge"));

    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const { time, date } = dosDateTime(statSync(file).mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 文件名
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBytes, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);

    offset += local.length + nameBytes.length + payload.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

const { dir: input, output, allowIncomplete } = parseArgs(process.argv.slice(2));
const root = resolve(input);
const manifestPath = join(root, "frontend.json");

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(t("errReadManifest", { path: manifestPath, error: error.message }));
}

for (const key of ["identifier", "name", "version", "kernelApi"]) {
  if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
    fail(t("errManifestField", { key }));
  }
}
if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]{2,127}$/.test(manifest.identifier)) {
  fail(t("errIdentifier", { value: manifest.identifier }));
}
if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
  fail(t("errVersion", { value: manifest.version }));
}
const entry = manifest.entry ?? "index.html";
if (entry.startsWith("/") || entry.includes("..") || entry.includes("\\")) {
  fail(t("errEntry", { value: entry }));
}
try {
  if (!statSync(join(root, entry)).isFile()) fail(t("errEntryMissing", { entry }));
} catch {
  fail(t("errEntryMissing", { entry }));
}

const files = [];
walk(root, root, files);
if (files.length === 0) fail(t("errEmptyDir"));
if (files.length > MAX_ENTRIES) fail(t("errTooManyFiles", { max: MAX_ENTRIES }));
if (!files.some((file) => file.name === "frontend.json")) fail(t("errNoManifest"));

// 功能对等检查：第三方前端是整页替换，缺命令就等于删功能，所以在打包期拦一次。
const kernelMethods = loadKernelMethods();
const allowPreview = allowIncomplete || process.env.MCUGL_PACK_ALLOW_INCOMPLETE === "1";
let coverageLine = null;
if (kernelMethods) {
  const missing = scanCoverage(files, kernelMethods);
  const covered = kernelMethods.length - missing.length;
  if (missing.length > 0) {
    if (!allowPreview) {
      console.error(t("coverageHeader", {
        covered,
        total: kernelMethods.length,
        missing: missing.length,
      }));
      for (const name of missing) console.error(`  - ${name}`);
      console.error(t("coverageHint"));
      process.exit(1);
    }
    console.warn(t("coveragePreview", {
      covered,
      total: kernelMethods.length,
      missing: missing.length,
    }));
  } else {
    coverageLine = t("coverageLine", { covered, total: kernelMethods.length });
  }
} else {
  console.warn(t("coverageSkipped"));
}

const zip = buildZip(files);
const target = output
  ? resolve(output)
  : resolve(`dist-frontends/${manifest.identifier}-${manifest.version}.mcuglf`);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, zip);

const sha256 = createHash("sha256").update(zip).digest("hex");
const kb = (zip.length / 1024).toFixed(1);
const rawKb = (
  files.reduce((sum, file) => sum + statSync(file.file).size, 0) / 1024
).toFixed(1);
console.log(`[frontend:pack] ${basename(target)}`);
console.log(t("outFrontend", {
  name: manifest.name,
  version: manifest.version,
  identifier: manifest.identifier,
}));
console.log(t("outFiles", { count: files.length, size: rawKb }));
console.log(t("outArtifact", { path: target, size: kb }));
console.log(t("outSha", { hash: sha256 }));
if (coverageLine) console.log(coverageLine);
