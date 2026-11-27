// 界面文案：英文默认，中文可选。TUI、帮助、校验错误共用这一份目录。
//
// 语言优先级：--lang > MCUGL_LANG > LANG/LC_ALL（只有明确是 zh 时才用中文）> 英文。
const catalogs = {
  en: {
    cancelled: "Cancelled",
    empty: "(empty)",
    committed: "{message}: {value}",
    selectHint: "↑/↓ select · Enter confirm · Esc cancel",
    yes: "Yes",
    no: "No",
    questionColon: ": ",
    fallbackSuffix: " ({fallback})",
    invalidNumber: "Please enter one of the listed numbers.",
    selectPrompt: "{message}\n{lines}\nSelect (default {index}): ",
    valueRequired: "{flag} needs a value",
    unknownOption: "Unknown option: {arg}",
    langUnsupported: "Unsupported language: {value} (available: en, zh)",
    defaultTarget: "my-mcugl-frontend",

    idEmpty: "must not be empty",
    idLength: "must be 3–128 characters",
    idChars: "may only contain ASCII letters, digits and . - _",
    idDotEdge: "must not start or end with a dot",
    idDotRepeat: "must not contain consecutive dots",
    idDotSegment: "must not contain empty segments",
    idReserved: "segments must not use Windows reserved names (con, prn, aux, nul, com1…, lpt1…)",
    versionBad: "must be a semantic version such as 1.0.0 or 0.2.0-beta.1",

    introTitle: "MCUGL Build Tool",
    introSubtitle: "Create a third-party frontend for MCUGL Launcher",
    qLanguage: "Language",
    qDirectory: "Project directory",
    hintDirectory: "relative to the current directory; the project is created here",
    dirEmpty: "Directory cannot be empty",
    qTemplate: "Template",
    qStack: "Stack",
    baseVanilla: "vanilla",
    baseVanillaDesc: "plain HTML/CSS/JS, no build step",
    baseVite: "vite-react",
    baseViteDesc: "React + TypeScript + Vite",
    qLayout: "Layout",
    layoutDev: "dev",
    layoutDevDesc: "developer sample: kernel info, raw command console",
    layoutSimple: "simple",
    layoutSimpleDesc: "launcher-like pages: home, instances, accounts, settings",
    tplVanilla: "vanilla",
    tplVanillaDesc: "no build step; plain HTML/JS, just refresh",
    tplSimple: "simple",
    tplSimpleDesc: "launcher-like layout, minimal CSS, no build step",
    tplVite: "vite-react",
    tplViteDesc: "React + TypeScript + Vite",
    qIdentifier: "Frontend identifier",
    hintIdentifier: "reverse-DNS, 3–128 letters, digits or . - _",
    qName: "Display name",
    nameEmpty: "Name cannot be empty",
    qDescription: "Description (optional)",
    qAuthor: "Author (optional)",
    qVersion: "Version",
    targetNotEmpty: "Target directory is not empty: {path}",
    qOverwrite: "Overwrite its files?",
    cancelledNonEmpty: "Cancelled: target directory is not empty",

    generated: "Generated {template} project: {target}",
    summaryIdentifier: "  Identifier: {value}",
    summaryVersion: "  Version: {value}",
    summaryFrontendDir: "  Frontend directory: {value}",
    nextTitle: "Next steps:",
    nextCd: "  cd {target}",
    nextInstall: "  npm install",
    nextDev: "  npm run dev          # watch build, output in dist/frontend",
    nextEnvDist: '  $env:MCUGL_FRONTEND = "<absolute path to dist/frontend>"',
    nextEnvFrontend: '  $env:MCUGL_FRONTEND = "<absolute path to frontend>"',
    nextRefresh: "  # start MCUGL Launcher, then refresh the window after changes",
    nextBuildProd: "  npm run build        # one-off build (tsc --noEmit + vite build)",
    nextVanillaNote: "  # vanilla has no compile step: npm run build is the same as npm run pack",
    nextSimpleNote:
      "  # simple is plain HTML/CSS/JS too: npm run build is the same as npm run pack",
    nextSettings:
      "  Launcher → Settings → Developer options → Frontend (third-party UI) shows whether it was detected.",
    nextPack: "  Pack: npm run pack    # artifact in dist-frontends/, importable from Settings",
    nextDocs: "  API: MCUGLAUNCHER/docs/KERNEL_API_V1.md and FRONTEND_PACKAGE.md.",

    errTooManyArgs: "Only one directory argument is accepted; got extra: {rest}",
    errUnknownTemplate: "Unknown template: {name} (available: {list})",
    errUnknownLayout: "Unknown layout: {name} (available: {list})",
    errDirNotEmpty: "Directory is not empty: {root}\nAdd --force to overwrite.",
    errInvalidIdentifier: "Invalid identifier: {error}",
    errInvalidVersion: "Invalid version: {error}",
    errNameEmpty: "Name cannot be empty",

    help: `@mcugl/frontpack-buildtool — scaffold a third-party frontend for MCUGL Launcher

Usage:
  frontpack-buildtool [directory] [options]

With no directory and no options in a real terminal, an interactive wizard starts
(project name, template, identifier, and more).

Options:
  -t, --template <name>    stack: vanilla (default) | vite-react, or a final id
      --layout <name>      layout: dev (default) | simple
      --identifier <id>    reverse-DNS identifier, e.g. com.example.my-frontend
      --name <name>        display name
      --description <text> description (optional)
      --author <name>      author (optional)
      --version <semver>   version, default 0.1.0
  -y, --yes                use defaults, no prompts
  -f, --force              overwrite a non-empty target directory
  -l, --lang <en|zh>       interface language (default: English)
  -h, --help               show this help

Templates:
  vanilla            vanilla stack, dev layout: plain HTML/JS sample, no build
  simple             vanilla stack, simple layout: launcher-like pages, no build
  vite-react         vite-react stack, dev layout: full command console
  vite-react-simple  vite-react stack, simple layout: launcher-like pages in React

Examples:
  npx @mcugl/frontpack-buildtool my-frontend
  npx @mcugl/frontpack-buildtool my-frontend -t vite-react --layout simple --yes
`,
  },
  zh: {
    cancelled: "已取消",
    empty: "（空）",
    committed: "{message}：{value}",
    selectHint: "↑/↓ 选择 · Enter 确认 · Esc 取消",
    yes: "是",
    no: "否",
    questionColon: "：",
    fallbackSuffix: "（{fallback}）",
    invalidNumber: "请输入列表中的序号。",
    selectPrompt: "{message}\n{lines}\n选择（默认 {index}）：",
    valueRequired: "{flag} 后面需要一个值",
    unknownOption: "未知选项：{arg}",
    langUnsupported: "不支持的语言：{value}（可选：en、zh）",
    defaultTarget: "my-mcugl-frontend",

    idEmpty: "不能为空",
    idLength: "需要 3–128 个字符",
    idChars: "只能包含 ASCII 字母、数字和 . - _",
    idDotEdge: "不能以点开头或结尾",
    idDotRepeat: "不能包含连续的 .",
    idDotSegment: "不能有空命名段",
    idReserved: "命名段不能是 Windows 保留名（con、prn、aux、nul、com1…、lpt1…）",
    versionBad: "必须是语义化版本，例如 1.0.0、0.2.0-beta.1",

    introTitle: "MCUGL Build Tool",
    introSubtitle: "生成一个可以被 MCUGL Launcher 加载的第三方前端",
    qLanguage: "界面语言",
    qDirectory: "项目目录",
    hintDirectory: "相对当前目录；工程会创建在这个位置",
    dirEmpty: "目录不能为空",
    qTemplate: "模板",
    qStack: "技术栈",
    baseVanilla: "vanilla",
    baseVanillaDesc: "纯 HTML/CSS/JS，无构建",
    baseVite: "vite-react",
    baseViteDesc: "React + TypeScript + Vite",
    qLayout: "界面",
    layoutDev: "dev",
    layoutDevDesc: "开发者样例：内核信息 + 原始命令控制台",
    layoutSimple: "simple",
    layoutSimpleDesc: "仿启动器页面：首页、实例、账号、设置",
    tplVanilla: "vanilla",
    tplVanillaDesc: "无构建，纯 HTML/JS，改完刷新即可",
    tplSimple: "simple",
    tplSimpleDesc: "仿启动器布局，极简 CSS，无构建",
    tplVite: "vite-react",
    tplViteDesc: "React + TypeScript + Vite",
    qIdentifier: "前端标识",
    hintIdentifier: "反向域名，3–128 个字母数字或 . - _",
    qName: "显示名称",
    nameEmpty: "名称不能为空",
    qDescription: "描述（可留空）",
    qAuthor: "作者（可留空）",
    qVersion: "版本",
    targetNotEmpty: "目标目录非空：{path}",
    qOverwrite: "覆盖其中的文件？",
    cancelledNonEmpty: "已取消：目标目录非空",

    generated: "已生成 {template} 工程：{target}",
    summaryIdentifier: "  前端标识：{value}",
    summaryVersion: "  版本：{value}",
    summaryFrontendDir: "  前端目录：{value}",
    nextTitle: "下一步：",
    nextCd: "  cd {target}",
    nextInstall: "  npm install",
    nextDev: "  npm run dev          # 监听构建，产物在 dist/frontend",
    nextEnvDist: '  $env:MCUGL_FRONTEND = "<dist/frontend 的绝对路径>"',
    nextEnvFrontend: '  $env:MCUGL_FRONTEND = "<frontend 目录的绝对路径>"',
    nextRefresh: "  # 然后启动 MCUGL Launcher，改完文件刷新窗口",
    nextBuildProd: "  npm run build        # 一次性构建（tsc --noEmit + vite build）",
    nextVanillaNote: "  # vanilla 没有编译步骤：npm run build 等同 npm run pack",
    nextSimpleNote: "  # simple 同样是纯 HTML/CSS/JS：npm run build 等同 npm run pack",
    nextSettings: "  启动器 → 设置 → 开发者选项 → 前端（第三方 UI）可查看是否被识别。",
    nextPack: "  打包：npm run pack    # 产物在 dist-frontends/，可导入设置页",
    nextDocs: "  接口见 MCUGLAUNCHER/docs/KERNEL_API_V1.md 与 FRONTEND_PACKAGE.md。",

    errTooManyArgs: "只接受一个目录参数，多出来的是：{rest}",
    errUnknownTemplate: "未知模板：{name}（可选：{list}）",
    errUnknownLayout: "未知界面：{name}（可选：{list}）",
    errDirNotEmpty: "目录非空：{root}\n如果确实要覆盖，加 --force。",
    errInvalidIdentifier: "identifier 不合法：{error}",
    errInvalidVersion: "version 不合法：{error}",
    errNameEmpty: "name 不能为空",

    help: `@mcugl/frontpack-buildtool — 生成 MCUGL Launcher 第三方前端工程

用法：
  frontpack-buildtool [目录] [选项]

不带目录和选项、在真终端里运行时，会进入交互式向导（项目名、模板、标识等）。

选项：
  -t, --template <name>    技术栈：vanilla（默认）| vite-react，也可直接写最终 id
      --layout <name>      界面：dev（默认）| simple
      --identifier <id>    反向域名标识，例如 com.example.my-frontend
      --name <name>        前端显示名称
      --description <text> 描述（可选）
      --author <name>      作者（可选）
      --version <semver>   版本，默认 0.1.0
  -y, --yes                全部使用默认值，不交互
  -f, --force              目标目录非空时覆盖
  -l, --lang <en|zh>       界面语言（默认英语）
  -h, --help               显示这份帮助

模板：
  vanilla            vanilla 栈 + dev 界面：纯 HTML/JS 样例，无构建
  simple             vanilla 栈 + simple 界面：仿启动器页面，无构建
  vite-react         vite-react 栈 + dev 界面：完整命令控制台
  vite-react-simple  vite-react 栈 + simple 界面：React 版仿启动器页面

示例：
  npx @mcugl/frontpack-buildtool my-frontend
  npx @mcugl/frontpack-buildtool my-frontend -t vite-react --layout simple --yes
`,
  },
};

let currentLocale = "en";

export function normalizeLocale(value) {
  const text = String(value ?? "").toLowerCase();
  if (text.startsWith("zh")) return "zh";
  if (text.startsWith("en")) return "en";
  return null;
}

export function setLocale(value) {
  const normalized = normalizeLocale(value);
  if (normalized) currentLocale = normalized;
  return currentLocale;
}

export function getLocale() {
  return currentLocale;
}

export function detectLocale(argv = [], env = process.env) {
  const index = argv.findIndex((arg) => arg === "-l" || arg === "--lang");
  if (index >= 0) {
    const fromFlag = normalizeLocale(argv[index + 1]);
    if (fromFlag) return fromFlag;
  }
  const fromEnv = normalizeLocale(env.MCUGL_LANG);
  if (fromEnv) return fromEnv;
  const system = env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  return normalizeLocale(system) ?? "en";
}

export function t(key, vars = {}, locale = currentLocale) {
  const table = catalogs[locale] ?? catalogs.en;
  const text = table[key] ?? catalogs.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}
