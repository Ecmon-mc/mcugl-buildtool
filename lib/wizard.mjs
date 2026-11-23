// 无参数运行时的交互式向导：与 SJMCL 的 create-sjmcl-extension 同一种体验。
//
// 只负责收集回答，真正的文件生成仍交给 scaffold()，这样向导和 flags
// 两条路径共用同一套校验与落盘逻辑。第一问选择界面语言（默认英语）。
import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { getLocale, setLocale, t } from "./i18n.mjs";
import { validateIdentifier, validateVersion } from "./manifest.mjs";
import { slugify, BASE_TEMPLATES, LAYOUTS, resolveTemplate, splitTemplate } from "./scaffold.mjs";
import {
  CancelledError,
  printIntro,
  promptConfirm,
  promptSelect,
  promptText,
  style,
} from "./ui.mjs";

export async function runWizard({
  cwd = process.cwd(),
  defaults = {},
  version = "",
  stdin = process.stdin,
  stdout = process.stdout,
} = {}) {
  printIntro({ stdout, version, subtitle: t("introSubtitle") });

  const language = await promptSelect({
    message: t("qLanguage"),
    options: [
      { value: "en", label: "English" },
      { value: "zh", label: "中文" },
    ],
    initial: getLocale() === "zh" ? 1 : 0,
    stdin,
    stdout,
  });
  setLocale(language);

  const targetInput = await promptText({
    message: t("qDirectory"),
    initial: defaults.target ?? t("defaultTarget"),
    hint: t("hintDirectory"),
    validate: (value) => (value.trim() ? null : t("dirEmpty")),
    stdin,
    stdout,
  });
  const target = resolve(cwd, targetInput.trim());
  const packageName = slugify(basename(target));

  const defaultsTemplate =
    (defaults.layout
      ? splitTemplate(resolveTemplate(defaults.template ?? "vanilla", defaults.layout) ?? "vanilla")
      : splitTemplate(defaults.template ?? "vanilla")) ?? {
      base: "vanilla",
      layout: "dev",
    };

  const base = await promptSelect({
    message: t("qStack"),
    options: [
      { value: "vanilla", label: t("baseVanilla"), description: t("baseVanillaDesc") },
      { value: "vite-react", label: t("baseVite"), description: t("baseViteDesc") },
    ],
    initial: Math.max(0, BASE_TEMPLATES.indexOf(defaultsTemplate.base)),
    stdin,
    stdout,
  });

  const layout = await promptSelect({
    message: t("qLayout"),
    options: [
      { value: "dev", label: t("layoutDev"), description: t("layoutDevDesc") },
      { value: "simple", label: t("layoutSimple"), description: t("layoutSimpleDesc") },
    ],
    initial: Math.max(0, LAYOUTS.indexOf(defaultsTemplate.layout)),
    stdin,
    stdout,
  });

  const template = resolveTemplate(base, layout);

  const identifier = await promptText({
    message: t("qIdentifier"),
    initial: defaults.identifier ?? `com.example.${packageName}`,
    hint: t("hintIdentifier"),
    validate: (value) => validateIdentifier(value.trim()),
    stdin,
    stdout,
  });

  const name = await promptText({
    message: t("qName"),
    initial: defaults.name ?? packageName,
    validate: (value) => (value.trim() ? null : t("nameEmpty")),
    stdin,
    stdout,
  });

  const description = await promptText({
    message: t("qDescription"),
    initial: defaults.description ?? "",
    stdin,
    stdout,
  });

  const author = await promptText({
    message: t("qAuthor"),
    initial: defaults.author ?? "",
    stdin,
    stdout,
  });

  const semver = await promptText({
    message: t("qVersion"),
    initial: defaults.version ?? "0.1.0",
    validate: (value) => validateVersion(value.trim()),
    stdin,
    stdout,
  });

  let force = false;
  if (existsSync(target) && readdirSync(target).length > 0) {
    stdout.write(`\n${style.dim(t("targetNotEmpty", { path: target }))}\n`);
    const overwrite = await promptConfirm({
      message: t("qOverwrite"),
      initial: false,
      stdin,
      stdout,
    });
    if (!overwrite) throw new CancelledError(t("cancelledNonEmpty"), 0);
    force = true;
  }

  return {
    target,
    template,
    stack: base,
    layout,
    identifier: identifier.trim(),
    name: name.trim(),
    description: description.trim(),
    author: author.trim(),
    version: semver.trim(),
    packageName,
    force,
  };
}
