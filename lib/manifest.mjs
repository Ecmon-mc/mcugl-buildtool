// frontend.json 的字段校验，规则与 MCUGL 的 Rust 安装器保持一致：
// identifier 用反向域名，version 用 semver，entry 必须是包内相对路径。
// 返回的是本地化文案（默认当前界面语言），传 locale 可指定。
import { getLocale, t } from "./i18n.mjs";

const RESERVED_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

export function validateIdentifier(value, locale = getLocale()) {
  if (typeof value !== "string" || value.trim() === "") return t("idEmpty", {}, locale);
  if (value.length < 3 || value.length > 128) return t("idLength", {}, locale);
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return t("idChars", {}, locale);
  if (value.startsWith(".") || value.endsWith(".")) return t("idDotEdge", {}, locale);
  if (value.includes("..")) return t("idDotRepeat", {}, locale);
  const segments = value.split(".");
  if (segments.some((segment) => segment === "")) return t("idDotSegment", {}, locale);
  if (segments.some((segment) => RESERVED_NAMES.has(segment.toLowerCase()))) {
    return t("idReserved", {}, locale);
  }
  return null;
}

export function validateVersion(value, locale = getLocale()) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)) {
    return t("versionBad", {}, locale);
  }
  return null;
}

// 只写入非空的可选字段，保持 frontend.json 干净。
export function buildManifest({ identifier, name, version, description, author, entry = "index.html", kernelApi = "^1.0.0" }) {
  const manifest = { identifier, name, version, kernelApi, entry };
  if (description) manifest.description = description;
  if (author) manifest.author = author;
  return manifest;
}
