# @mcugl/frontpack-buildtool

[English](README.md) | [简体中文](README.zh-CN.md)

为 **MCUGL Launcher 的第三方前端**提供脚手架、开发与打包。

生成的项目就是一组普通静态文件：不需要重新编译 Rust，也不需要 fork 启动器。开发时把
`MCUGL_FRONTEND` 指向前端目录；分发时打包成 `.mcuglf`，在启动器设置页导入即可。

本工具目前放在 MCUGL 仓库的 `mcugl-buildtool/` 下，**尚未发布到 npm**。在仓库里可以直接运行：

```powershell
node .\mcugl-buildtool\bin\mcugl-buildtool.mjs my-frontend
```

发布之后等价于 `npx @mcugl/frontpack-buildtool my-frontend`。

> **本包自身没有构建步骤。** 在 `mcugl-buildtool/` 里跑 `npm run build` 只会打印一段说明。
> 真正的构建发生在生成的项目里：`vite-react` 用 Vite 编译，`vanilla` / `simple` 把
> `npm run build` 当作 `npm run pack` 的别名。`npx @mcugl/frontpack-buildtool` 可以在任意目录运行。

## 交互式向导

在真实终端里不带参数运行，就会进入引导式向导，形式与 SJMCL 的 `create-sjmcl-extension` 类似：
语言 → 项目目录 → 技术栈（vanilla / vite-react）→ 界面（dev / simple）→ 前端标识 → 显示名 →
描述 → 作者 → 版本。用 ↑/↓ 移动、Enter 确认，Esc 或 Ctrl+C 取消。目标目录非空时，会先询问再覆盖。

向导完全在包内实现、零依赖（`lib/keys.mjs` 处理按键，`lib/ui.mjs` 负责渲染与提问，
`lib/wizard.mjs` 控制流程，`lib/i18n.mjs` 存放文案），所以不需要先 `npm install`。当输入/输出被
重定向、带了 `--yes`，或处于 CI 环境时，会自动退回参数/readline 模式，脚本化调用保持稳定。

## 语言

界面**默认英文**。向导的第一个问题可以切换语言，脚本也可以传 `--lang zh`（或设置
`MCUGL_LANG=zh`）。没有显式指定时，只有系统区域设置（`LANG`/`LC_ALL`）明确为中文时才会使用中文。

生成工程时选择的语言也会写进 `scripts/pack.mjs`：英文向导生成的工程打包日志与报错都是英文，
中文向导生成的则是中文；需要临时覆盖时可设 `MCUGL_PACK_LANG=en|zh`。

## 用法

```text
mcugl-buildtool [目录] [选项]

  -t, --template <name>    技术栈：vanilla（默认）| vite-react，也可直接写最终 id（simple、vite-react-simple）
      --layout <name>      界面：dev（默认）| simple
      --identifier <id>    反向域名标识，例如 com.example.my-frontend
      --name <name>        显示名
      --description <text> 描述（可选）
      --author <name>      作者（可选）
      --version <semver>   版本，默认 0.1.0
  -y, --yes                全部使用默认值，不提问
  -f, --force              覆盖非空的目标目录
  -l, --lang <en|zh>       界面语言（默认英文）
  -h, --help               显示帮助
```

示例：

```powershell
npx @mcugl/frontpack-buildtool my-frontend --yes
npx @mcugl/frontpack-buildtool my-frontend -t vite-react --identifier com.example.demo --name "Demo Frontend"
npx @mcugl/frontpack-buildtool my-frontend --yes -t vite-react --layout simple
npx @mcugl/frontpack-buildtool my-frontend --yes --lang zh
```

## 模板

模板由**技术栈**和**界面**组合而成：

| id | 技术栈 | 界面 | 构建 |
| --- | --- | --- | --- |
| `vanilla` | vanilla | dev | 无 |
| `simple` | vanilla | simple | 无 |
| `vite-react` | vite-react | dev | Vite |
| `vite-react-simple` | vite-react | simple | Vite |

`-t` 接收技术栈（配合 `--layout`），也可以直接写最终 id：`-t vanilla`、`-t simple`、
`-t vite-react`、`-t vite-react-simple`。

### `vanilla`

没有依赖；改完文件刷新启动器窗口即可：

```text
my-frontend/
├─ frontend/               # 启动器直接加载这个目录
│  ├─ frontend.json
│  ├─ index.html
│  ├─ kernel.js            # 很薄的 invoke 封装 + KernelError
│  ├─ app.js               # kernel_manifest / get_overview 示例
│  └─ styles.css
├─ scripts/pack.mjs        # 零依赖 zip + sha256
└─ package.json            # npm run pack
```

```powershell
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\frontend"
```

### `simple`

仿启动器的起点，**极简 CSS、无构建步骤**：顶栏带首页/实例/账号/设置导航，首页有概览数字，
实例与账号可点选，右下角悬浮启动按钮，底部 toast。它照着官方布局做，而不是 `vite-react` 那种
命令控制台，因此更适合作为自定义启动器界面的基础。它覆盖核心流程（选择 + 启动 + 日志），
不是全部命令面——见[功能对等](#功能对等functional-parity)。

```text
my-frontend/
├─ frontend/
│  ├─ frontend.json
│  ├─ index.html            # 外壳：顶栏、导航、内容容器、启动按钮、toast
│  ├─ kernel.js             # 很薄的 invoke 封装 + KernelError
│  ├─ app.js                # 页面、选择、启动、日志
│  └─ styles.css            # 小体积、可整体替换的样式
├─ scripts/pack.mjs
└─ package.json             # npm run pack / build
```

```powershell
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\frontend"
```

### `vite-react`

React 19 + TypeScript + Vite + Chakra UI。这个模板同时是内核 API 的**参考实现**：
`frontend/src/actions.ts` 把 66 个内核方法和 4 个宿主管理命令都列成了可点击的表单，
新工程可以直接把整套接口点一遍。`npm run dev` 会在改动时重新构建到 `dist/frontend`：

```text
my-frontend/
├─ frontend/               # Vite 根目录（源码）
│  ├─ frontend.json
│  ├─ index.html
│  └─ src/{main.tsx, App.tsx, kernel.ts, actions.ts, ActionCard.tsx}
├─ vite.config.ts          # base "./"、outDir ../dist/frontend、复制 frontend.json
├─ scripts/pack.mjs
└─ package.json
```

```powershell
npm install
npm run dev                # 改动后重新构建
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\dist\frontend"
```

> 启动器通过自己的 `mcugl` 协议从磁盘读取前端，而不是连 Vite 的开发服务器，所以没有 HMR。
> 开发循环是「改动后重新构建，再刷新窗口」。

### `vite-react-simple`

`vite-react` 技术栈上的 `simple` 界面：React 19 + TypeScript + Vite + Chakra UI，没有自定义
样式表；页面同样仿启动器（首页 / 实例 / 账号 / 设置、悬浮启动按钮、toast），另外多一个
**命令**页。命令页把 66 个内核方法列成快捷按钮，可以用 JSON 参数执行任意一个，因此模板覆盖了
完整接口，`npm run pack` 不需要 `--allow-incomplete` 就能通过。随着 UI 成长，可以把命令页里的
某个命令逐步做成正式页面。

```text
my-frontend/
├─ frontend/
│  ├─ frontend.json
│  ├─ index.html
│  └─ src/{main.tsx, App.tsx, kernel.ts}
├─ vite.config.ts          # base "./"、outDir dist/frontend、复制 frontend.json
├─ scripts/pack.mjs
└─ package.json
```

## 功能对等（functional parity）

第三方前端是整页替换，所以必须自己把官方能力暴露出来。可分发前端的规则是：
**覆盖 `kernel_manifest.methods` 里的全部方法**（`mcugl.kernel/v1` 中是 66 个）。缺少的条目
会静默地从用户启动器里删掉功能，内核侧没有兜底 UI。

这条规则在打包期强制执行。`scripts/pack.mjs` 读取随包的 `kernel-methods.json`，扫描前端目录里的
文本文件，发现缺方法时拒绝出包：

```text
[frontend:pack] 功能覆盖不足：7/66 个内核方法，缺少 59 个：
  - get_overview
  …
补全后重试；如果只是打预览包，加 --allow-incomplete。
```

英文界面下同样的信息是英文；生成时用 `--lang en`（默认）即可。

- `vite-react` 是基线：`actions.ts` 就是清单，页面顶部会显示 `covered/total` 与缺失方法。
- `vite-react-simple` 通过命令页达到同样的 66/66（快捷按钮 + JSON 参数），不需要
  `--allow-incomplete`。
- `simple` 与 `vanilla` 是布局起点，只覆盖各自实现的页面。原型阶段可以用 `--allow-incomplete`
  打预览包；正式分发必须完整。
- 扫描是静态启发式：在打包的文本文件里查找独立出现的方法名（带引号、反引号，或被压缩器用点号
  拼接）。它不能证明调用接线正确——`vite-react` 运行时的缺失方法红字提示仍然是准绳。
- `--allow-incomplete`（或 `MCUGL_PACK_ALLOW_INCOMPLETE=1`）会带警告写出预览包，**不要分发给用户**。
- 演示后端对 28 个写命令返回 `UNSUPPORTED`；前端应展示这个错误，而不是隐藏入口。
- 细节见 `MCUGLauncher/docs/KERNEL_API_V1.md` §4.5 与 `FRONTEND_PACKAGE.md` §6.1。

## 打包与安装

```powershell
npm run pack
# dist-frontends/<identifier>-<version>.mcuglf
```

在启动器里：**设置 → 开发者选项 → 前端（第三方 UI）→ 导入前端包…**，然后点
**使用**并重启（或点「重启前端」）。开发期 `MCUGL_FRONTEND` 也可以直接指向 `.mcuglf` 文件，
启动器会把它解压到数据目录下的 `.dev/`。

## 生成工程依赖的约定

- `frontend.json`：`identifier`（3–128 个 ASCII 字母、数字与 `. - _`；反向域名；避开 Windows
  保留名）、`name`、`version`（semver）、`kernelApi`（默认 `^1.0.0`）、`entry`（默认
  `index.html`），以及可选的展示字段（`author`、`description`、`homepage`、`icon`）。
- 可选的 `icon.png` 放在 `frontend.json` 旁边（也可以在 `icon` 字段里指定别的路径，≤ 512 KiB，
  支持 png / jpg / webp / gif / svg），会显示在启动器的已安装前端列表里；没有时启动器回退到
  内置占位图标。
- 页面在 Windows 上运行于 `http://mcugl.localhost/`，其它平台是 `mcugl://localhost/`。这是本地
  origin，所以 `invoke` 不需要 Tauri capability 或远程域名白名单。
- `kernel.js` / `kernel.ts` 只是 `__TAURI_INTERNALS__.invoke` 的薄封装，用来统一错误。方法语义在
  MCUGL 仓库的 `docs/KERNEL_API_V1.md` 与 `docs/BACKEND_CONTRACT.md` 里。

## 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `npm run build` → `Missing script: "build"` | 在 `mcugl-buildtool/` 里运行，或工程是旧版 `vanilla` 生成的 | 到生成工程里构建：`vite-react` 用 `npm install && npm run build`；`vanilla` 用 `npm run pack`（新模板把 `build` 指向它） |
| `vite: not found` | 依赖没装 | 先在生成工程里执行 `npm install` |
| 启动器没有加载我的前端 | `MCUGL_FRONTEND` 指错了目录，或清单不合法 | 指向包含 `frontend.json` 的目录（`vite-react` 是 `dist/frontend`），并查看启动日志里的 `[mcugl] 前端（directory/package）：…` |

## 测试

```powershell
npm test
```

测试会生成全部技术栈/界面组合，打包 `vanilla` 与 `simple`（带 `--allow-incomplete`），检查
功能对等门（包括 `vite-react-simple` 覆盖全部 66 个方法），验证 zip 文件头与产物名；同时驱动
按键状态机、三个 prompt、通过假终端跑完整向导，以及 i18n 文案（共 26 个用例）。
