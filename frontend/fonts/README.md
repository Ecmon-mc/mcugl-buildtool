# 字体是怎么来的

这个前端直接用 **Minecraft 自己的位图字体**，不再靠第三方像素字模拟。

```
frontend/fonts/
├── mc_vanilla.ttf   ← 从 MC 的 assets 生成（拉丁、数字、符号、欧洲字符），0.2.0 起是首选
├── mc_seven.woff2   ← 备用的 Minecraft 风格像素字，MC 位图缺字时兜底
└── unifont.woff2    ← Unicode 点阵全字库（中文等），也是 `/unicode true` 的首选
```

字体栈（默认）：`MCUGL Vanilla` → `MCUGL Seven` → `MCUGL Unifont` → 系统字体。
`/unicode true` 会把 `MCUGL Unifont` 提到最前面，所有字符都走点阵。

## `mc_vanilla.ttf` 的来历

源文件是本机 Minecraft 的资源目录：

```
D:\Ecmon\minecraft\Blender_Workspace\26.3\assets\minecraft\
├── font\default.json            → include/space + include/default + include/unifont
├── font\include\default.json    → ascii.png / accented.png / nonlatin_european.png
├── font\include\space.json      → 空格的宽度（" " = 4）
└── textures\font\*.png          → 每个字符一个 8×8 / 9×12 的格子
```

`scripts/make-mc-font.mjs` 把这些位图直接转换成 TrueType：

- 1 位调色板 PNG 解码，按 `default.json` 的 provider 顺序取字形；
- 字形宽度 = 最右不透明列（Minecraft 的 `advance = 宽度 + 1`），空格用 provider 给的 4；
- 每个像素行合并成横向长条，转成矩形轮廓；`unitsPerEm = 128`，一个 MC 像素 = 16 单位，
  所以 `font-size: 16px` 时正好是 MC 的 2 倍 GUI 比例（1 像素 = 2×2 屏幕像素）；
- 字族名 `MCUGL Vanilla`，输出 `frontend/fonts/mc_vanilla.ttf`。
- 中文走 unifont（16px 点阵），它的视觉像素只有 MC 位图的一半，所以 `ui.js` 会把中文段包成
  `.cjk`，字影偏移用 `--shadow-cjk`（`fs/16`）；拉丁仍是 `fs/8`。

重新生成（改了 assets 或想换 MC 版本时）：

```powershell
cd cmdFront
node scripts/make-mc-font.mjs
```

脚本只读 `scripts/mc-font/`（从 assets 复制过来的 json/png 副本），不会去动游戏目录，
也不会把源素材打进 `.mcuglf`。`unifont.json` 里没有 unihex 数据，所以中文仍然走
`unifont.woff2`；Latin 的字形、宽度和字影都已经和原版一致。

## 换字体

`frontend/styles.css` 顶部三个 `@font-face` 分别对应 `MCUGL Vanilla` / `MCUGL Seven` /
`MCUGL Unifont`；改 `--font-ui` 的顺序就能调整优先级。字族名不要动，回退链按名字找。

## 几点提醒

- **`/unicode` 不持久化**。会话内开关，刷新回到默认（MC 位图优先）；想默认强制 Unicode，
  把 `app.js` 里 `state.unicode` 的初值改成 `true`。
- **授权**。`mc_vanilla.ttf` 的字形来自你自己的 Minecraft 安装（Mojang assets），
  随包分发前请自行确认许可；`mc_seven` / `unifont` 请用你有权使用的版本。
- **打包**。`npm run pack` 会把 `frontend/fonts/` 一起打进 `.mcuglf`，换完字体要重新打包。
- **缺字**。三个字体都没覆盖的字符会回退到系统字体；中文目前是 unifont 的矢量点阵，
  在 16px 下可能有轻微抗锯齿，字形本身是 MC 风格的像素轮廓。
