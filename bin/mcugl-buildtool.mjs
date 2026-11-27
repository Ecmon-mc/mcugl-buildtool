#!/usr/bin/env node
// mcugl-buildtool：生成一个 MCUGL Launcher 第三方前端工程。
//
// 生成物只有静态文件，不需要为启动器编译任何 Rust 代码；开发时用
// MCUGL_FRONTEND 指向工程里的前端目录即可，发布时用 scripts/pack.mjs
// 打成 `.mcuglf`，从「设置 → 开发者选项 → 前端」导入。
//
// 界面语言：默认英语，--lang/--lang zh 或 MCUGL_LANG 可切换；无参数在
// 真终端里运行时，向导第一问就是选语言。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseArgs } from "../lib/args.mjs";
import { detectLocale, normalizeLocale, setLocale, t } from "../lib/i18n.mjs";
import { askSelect, askText, closePrompts } from "../lib/prompts.mjs";
import { validateIdentifier, validateVersion } from "../lib/manifest.mjs";
import { scaffold, slugify, TEMPLATES, BASE_TEMPLATES, LAYOUTS, resolveTemplate } from "../lib/scaffold.mjs";
import { CancelledError, interactive, printDone } from "../lib/ui.mjs";
import { runWizard } from "../lib/wizard.mjs";

const PACKAGE_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

function printNextSteps(target, template) {
  console.log(`\n${t("nextTitle")}`);
  console.log(t("nextCd", { target }));
  if (template === "vite-react") {
    console.log(t("nextInstall"));
    console.log(t("nextDev"));
    console.log(t("nextEnvDist"));
    console.log(t("nextRefresh"));
    console.log(t("nextBuildProd"));
  } else if (template === "vite-react-simple") {
    console.log(t("nextInstall"));
    console.log(t("nextBuildProd"));
    console.log(t("nextEnvDist"));
    console.log(t("nextRefresh"));
  } else if (template === "simple") {
    console.log(t("nextEnvFrontend"));
    console.log(t("nextRefresh"));
    console.log(t("nextSimpleNote"));
  } else {
    console.log(t("nextEnvFrontend"));
    console.log(t("nextRefresh"));
    console.log(t("nextVanillaNote"));
  }
  console.log(t("nextSettings"));
  console.log(t("nextPack"));
  console.log(t("nextDocs"));
}

function printSummary({ identifier, version, frontendDir }) {
  console.log(t("summaryIdentifier", { value: identifier }));
  console.log(t("summaryVersion", { value: version }));
  console.log(t("summaryFrontendDir", { value: frontendDir }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.lang && !normalizeLocale(args.lang)) {
    throw new Error(t("langUnsupported", { value: args.lang }, "en"));
  }
  setLocale(args.lang ?? detectLocale(process.argv.slice(2), process.env));

  if (args.help) {
    console.log(t("help"));
    return;
  }

  if (args.layout && !LAYOUTS.includes(args.layout)) {
    throw new Error(t("errUnknownLayout", { name: args.layout, list: LAYOUTS.join(", ") }));
  }

  // 无参数、非 --yes、真终端：进入交互式向导（与 create-sjmcl-extension 的体验一致）。
  if (!args.positional.length && !args.yes && interactive()) {
    try {
      const answers = await runWizard({
        defaults: {
          template: args.template,
          layout: args.layout,
          identifier: args.identifier,
          name: args.name,
          description: args.description,
          author: args.author,
          version: args.version,
        },
        version: PACKAGE_VERSION,
      });
      const result = scaffold({ ...answers, root: answers.target });
      printDone(t("generated", { template: answers.template, target: answers.target }));
      printSummary({
        identifier: answers.identifier,
        version: answers.version,
        frontendDir: result.frontendDir,
      });
      printNextSteps(answers.target, answers.template);
      return;
    } catch (error) {
      if (error instanceof CancelledError) {
        console.log(`\n${error.message}`);
        process.exitCode = error.code;
        return;
      }
      throw error;
    }
  }

  let target = args.positional[0];
  if (!target) {
    if (args.yes) {
      target = t("defaultTarget");
    } else {
      target = await askText({ message: t("qDirectory"), fallback: t("defaultTarget") });
    }
  }
  if (args.positional.length > 1) {
    throw new Error(t("errTooManyArgs", { rest: args.positional.slice(1).join(" ") }));
  }

  let template = args.template;
  if (!template) {
    if (args.yes) {
      template = "vanilla";
    } else {
      const stack = await askSelect({
        message: t("qStack"),
        options: [
          { value: "vanilla", label: `${t("baseVanilla")} — ${t("baseVanillaDesc")}` },
          { value: "vite-react", label: `${t("baseVite")} — ${t("baseViteDesc")}` },
        ],
        fallback: 0,
      });
      const layout = await askSelect({
        message: t("qLayout"),
        options: [
          { value: "dev", label: `${t("layoutDev")} — ${t("layoutDevDesc")}` },
          { value: "simple", label: `${t("layoutSimple")} — ${t("layoutSimpleDesc")}` },
        ],
        fallback: 0,
      });
      template = resolveTemplate(stack, layout);
    }
  } else if (args.layout) {
    template = resolveTemplate(template, args.layout) ?? template;
  }
  if (!TEMPLATES.includes(template)) {
    throw new Error(t("errUnknownTemplate", { name: template, list: TEMPLATES.join(", ") }));
  }

  const root = resolve(process.cwd(), target);
  if (existsSync(root) && readdirSync(root).length > 0 && !args.force) {
    throw new Error(t("errDirNotEmpty", { root }));
  }

  const packageName = slugify(basename(root));
  const identifier =
    args.identifier ??
    (args.yes
      ? `com.example.${packageName}`
      : await askText({
          message: t("qIdentifier"),
          fallback: `com.example.${packageName}`,
          validate: validateIdentifier,
        }));
  const identifierError = validateIdentifier(identifier);
  if (identifierError) throw new Error(t("errInvalidIdentifier", { error: identifierError }));

  const name =
    args.name ??
    (args.yes ? packageName : await askText({ message: t("qName"), fallback: packageName }));
  if (!name.trim()) throw new Error(t("errNameEmpty"));

  const version =
    args.version ??
    (args.yes
      ? "0.1.0"
      : await askText({ message: t("qVersion"), fallback: "0.1.0", validate: validateVersion }));
  const versionError = validateVersion(version);
  if (versionError) throw new Error(t("errInvalidVersion", { error: versionError }));

  const description =
    args.description ?? (args.yes ? "" : await askText({ message: t("qDescription"), fallback: "" }));
  const author = args.author ?? (args.yes ? "" : await askText({ message: t("qAuthor"), fallback: "" }));

  const result = scaffold({
    root,
    template,
    identifier,
    name: name.trim(),
    description: description.trim(),
    author: author.trim(),
    version,
    packageName,
    force: args.force,
  });

  printDone(t("generated", { template, target: root }));
  printSummary({ identifier, version, frontendDir: result.frontendDir });
  printNextSteps(target, template);
}

try {
  await main();
} catch (error) {
  console.error(`\n[@mcugl/frontpack-buildtool] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  closePrompts();
}
