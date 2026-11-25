// 命令注册表、补全引擎、执行器。
//
// 这一层不碰 DOM，也不直接读全局状态：所有输入来自 `ctx`（app.js 组装的上下文）。
// 因此 scripts/selftest.mjs 能在 Node 里直接跑补全与执行逻辑。
//
// 设计要点：
//   * 每条命令由若干「路由」组成：`/server add <名称> <地址>` 是一条路由。
//     路由的 path 是字面量子命令，args 是参数；补全与用法提示都从同一份数据生成。
//   * 补全按「当前 token」计算，候选携带插入后的尾随空格规则，UI 只负责渲染与替换。
//   * 参数在发送给内核前已经是 camelCase（见 args 的 key）。

import { unwrap, revisionOf } from "./kernel.js";
import {
  ALL_METHODS,
  CATALOG,
  GROUP_ORDER,
  argHints,
  camelizeDeep,
  catalogEntry,
} from "./methods.js";

/** 用户输入层面的错误：参数缺失、取值非法、命令不存在。 */
export class UsageError extends Error {
  constructor(message, usage = "") {
    super(message);
    this.name = "UsageError";
    this.usage = usage;
  }
}

const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const hasPrefix = (value, typed) => String(value).toLowerCase().startsWith(String(typed).toLowerCase());

/**
 * 命令列表的分组顺序：内核方法分组之外，命令层自己多两组。
 * /help 与入参补全都按这个顺序展示。
 */
export const COMMAND_GROUPS = ["界面", ...GROUP_ORDER, "整活"];

// ---------------------------------------------------------------------------
// 词法
// ---------------------------------------------------------------------------

/**
 * 把一行输入切成 token。支持双引号 / 单引号包住带空格的值，引号内可用 \ 转义。
 * @returns {{value: string, start: number, end: number, raw: string, quoted: boolean}[]}
 */
export function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i += 1;
    if (i >= text.length) break;
    const start = i;
    let value = "";
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\\" && i + 1 < text.length) {
          value += text[i + 1];
          i += 2;
        } else {
          value += text[i];
          i += 1;
        }
      }
      if (i < text.length) i += 1; // 收尾引号
      tokens.push({ value, start, end: i, raw: text.slice(start, i), quoted: true });
    } else {
      while (i < text.length && !/\s/.test(text[i])) {
        value += text[i];
        i += 1;
      }
      tokens.push({ value, start, end: i, raw: text.slice(start, i), quoted: false });
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// 补全候选的来源
// ---------------------------------------------------------------------------

const onOff = () => [
  { value: "on", hint: "启用" },
  { value: "off", hint: "停用" },
];

function instanceCandidates(ctx) {
  const items = ctx.cache.instances || [];
  return items.map((item) => ({
    value: item.id,
    hint: `${item.name}${item.isPlaceholder ? "（未安装）" : ""}`,
  }));
}

function accountCandidates(ctx) {
  return (ctx.cache.accounts || []).map((item) => ({
    value: item.id,
    hint: `${item.player} · ${item.kind}`,
  }));
}

function serverCandidates(ctx) {
  return (ctx.cache.servers || []).map((item) => ({
    value: item.name,
    hint: item.address,
  }));
}

async function listServers(ctx) {
  await ctx.refresh();
  if (!ctx.cache.servers.length) {
    ctx.warn("还没有收藏的服务器。用 /server add <名称> <地址> 添加。");
    return;
  }
  for (const server of ctx.cache.servers) {
    ctx.print([
      ["  · ", "dark_gray"],
      [server.name, "white"],
      [`  ${server.address}`, "gray"],
      ["  ", "gray"],
      ["直连", "aqua", { click: `/join ${server.name}` }],
      ["  ", "gray"],
      ["延迟", "dark_gray", { click: `/server ping ${server.address}` }],
    ]);
  }
}

function modCandidates(ctx) {
  const maps = ctx.cache.mods;
  const list = maps && typeof maps.get === "function" ? maps.get(ctx.cache.selectedInstanceId) : null;
  return (list || []).map((item) => ({
    value: item.id,
    hint: `${item.name}${item.enabled ? "" : "（已禁用）"}`,
  }));
}

function methodCandidates(ctx) {
  return ALL_METHODS.map((method) => {
    const entry = catalogEntry(method);
    return {
      value: method,
      hint: entry ? `${entry.h || ""}${entry.host ? " · 宿主" : ""}` : "",
    };
  });
}

function commandCandidates() {
  return COMMANDS.map((cmd) => ({
    value: `/${cmd.name}`,
    hint: cmd.desc,
    kind: "command",
  }));
}

// ---------------------------------------------------------------------------
// 路由 / 命令定义
// ---------------------------------------------------------------------------

const INSTANCE = { key: "instance", hint: "实例", complete: instanceCandidates };
const ACCOUNT = { key: "account", hint: "账号", complete: accountCandidates };

const cmd = (config) => ({
  aliases: [],
  routes: [],
  ...config,
  routes: config.routes.map((route) => ({ path: [], args: [], desc: "", ...route })),
});

const routes = (cmdName, list) => list;

/**
 * 全部命令。`run(ctx, a)` 里的 a 已经完成参数绑定与类型转换。
 *
 * 约定：`ctx.invoke(method, args)` 是唯一的内核入口；`ctx.print` 接受
 * `[[文本, 颜色名], ...]` 或纯字符串。
 */
export const COMMANDS = [
  // ------------------------------------------------------------------ 界面
  cmd({
    name: "help",
    aliases: ["?"],
    group: "界面",
    desc: "查看命令列表或单条命令的用法",
    routes: [
      {
        desc: "列出全部命令",
        args: [
          {
            key: "command",
            hint: "命令名",
            optional: true,
            complete: () =>
              COMMANDS.map((item) => ({ value: item.name, hint: item.desc })),
          },
        ],
        run: async (ctx, a) => {
          if (!a.command) {
            ctx.print([[`命令列表`, "gold"], [`  共 ${COMMANDS.length} 条`, "dark_gray"]]);
            for (const group of COMMAND_GROUPS) {
              const items = COMMANDS.filter((item) => item.group === group);
              if (!items.length) continue;
              ctx.print([["", "gray"], [`— ${group} —`, "dark_aqua"]]);
              for (const item of items) {
                ctx.print([
                  [`/${item.name}`, "green"],
                  [`  ${item.desc}`, "gray"],
                ]);
              }
            }
            ctx.print([["Tab 补全 · ↑↓ 翻历史 · /help <命令> 看用法", "dark_gray"]]);
            return;
          }
          const target = findCommand(String(a.command).replace(/^\//, ""));
          if (!target) throw new UsageError(`没有命令 /${a.command}`);
          ctx.print([[`/${target.name}`, "green"], [`  ${target.desc}`, "gray"]]);
          if (target.aliases.length) {
            ctx.print([["  别名：", "dark_gray"], [target.aliases.map((x) => `/${x}`).join("、"), "gray"]]);
          }
          for (const route of target.routes) {
            ctx.print([["  ", "gray"], [usageOf(target, route), "white"]]);
            if (route.desc) ctx.print([["      ", "gray"], [route.desc, "dark_gray"]]);
            for (const spec of route.args || []) {
              const hint = spec.hint || spec.key;
              const extra = spec.values ? `（${spec.values.join(" / ")}）` : "";
              const optional = spec.optional ? "可选" : "必填";
              ctx.print([["      · ", "dark_gray"], [hint, "gray"], [`  ${optional}${extra}`, "dark_gray"]]);
            }
          }
        },
      },
    ],
  }),

  cmd({
    name: "clear",
    aliases: ["cls"],
    group: "界面",
    desc: "清空聊天记录",
    routes: [{ desc: "清空聊天记录", run: async (ctx) => ctx.clear() }],
  }),

  cmd({
    name: "about",
    aliases: ["version"],
    group: "界面",
    desc: "前端与内核版本",
    routes: [
      {
        desc: "显示版本信息",
        run: async (ctx) => {
          const manifest = await ctx.manifest();
          ctx.print([[`MCUGL 命令终端`, "gold"], [` v${ctx.version.frontend}`, "white"]]);
          ctx.print([[`协议 `, "dark_gray"], [manifest.protocol || "mcugl.kernel/v1", "gray"], [` · API `, "dark_gray"], [manifest.apiVersion || "1.0.0", "gray"], [` · 应用 `, "dark_gray"], [manifest.appVersion || "?", "gray"]]);
          ctx.print([
            [`模式 `, "dark_gray"],
            [ctx.mode === "kernel" ? "内核（真实数据）" : "演示（内存数据）", ctx.mode === "kernel" ? "green" : "yellow"],
            [` · 方法 ${(manifest.methods || ALL_METHODS).length} 个`, "dark_gray"],
          ]);
          ctx.print([["这个前端把启动器当成一台命令方块终端：/help 看命令，Tab 补全，/api 看内核方法。", "gray"]]);
        },
      },
    ],
  }),

  cmd({
    name: "api",
    group: "界面",
    desc: "列出内核方法表（kernel_manifest）",
    routes: [
      {
        desc: "按分组列出全部方法",
        args: [{ key: "filter", hint: "关键字", optional: true }],
        run: async (ctx, a) => {
          const manifest = await ctx.manifest();
          const filter = (a.filter || "").toLowerCase();
          let shown = 0;
          for (const group of GROUP_ORDER) {
            const entries = CATALOG.filter((entry) => entry.g === group).filter((entry) => {
              if (!filter) return true;
              return entry.m.includes(filter) || (entry.h || "").toLowerCase().includes(filter);
            });
            if (!entries.length) continue;
            ctx.print([[`— ${group} —`, "dark_aqua"]]);
            for (const entry of entries) {
              const supported = manifest.capabilities ? manifest.capabilities[entry.m] !== false : true;
              const parts = [
                [`${entry.m}`, supported ? "green" : "dark_gray", { click: `/kernel ${entry.m} ` }],
                [`  ${entry.h || ""}`, "gray"],
              ];
              if (entry.a && entry.a.length) {
                parts.push([`  ${entry.a.map((spec) => `${camelKeyOf(spec.n)}`).join(", ")}`, "dark_gray"]);
              }
              if (entry.host) parts.push([`  宿主命令`, "aqua"]);
              if (!supported) parts.push([`  （当前后端不支持）`, "dark_gray"]);
              ctx.print(parts);
              shown += 1;
            }
          }
          ctx.print([[`共 ${shown} 个方法 · 点击方法名填入 /kernel · /api <关键字> 过滤`, "dark_gray"]]);
        },
      },
    ],
  }),

  cmd({
    name: "kernel",
    group: "界面",
    desc: "直接调用任意内核方法（JSON 展开）",
    routes: [
      {
        desc: "调用一个内核方法",
        args: [
          { key: "method", hint: "方法名", complete: methodCandidates },
          { key: "args", hint: "JSON 参数", type: "json", optional: true, rest: true },
        ],
        run: async (ctx, a) => {
          if (!ALL_METHODS.includes(a.method)) {
            throw new UsageError(`内核没有方法 ${a.method}`, "/api 查看方法表");
          }
          let args = {};
          if (a.args && String(a.args).trim()) {
            try {
              args = camelizeDeep(JSON.parse(a.args));
            } catch (error) {
              throw new UsageError(`参数不是合法 JSON：${error.message}`, `/kernel ${a.method} '{"instanceId":"..."}'`);
            }
          }
          const started = performance.now();
          const result = await ctx.invoke(a.method, args, { silentRaw: true });
          const ms = Math.round(performance.now() - started);
          ctx.print([[a.method, "green"], [`  ${ms} ms`, "dark_gray"], [`  ${JSON.stringify(args)}`, "dark_gray"]]);
          ctx.printJson(result);
        },
      },
    ],
  }),

  cmd({
    name: "raw",
    group: "界面",
    desc: "每次内核调用后附加 JSON 结构",
    routes: [
      {
        desc: "开关 JSON 结构输出",
        args: [{ key: "mode", hint: "on|off", values: ["on", "off"], complete: onOff }],
        run: async (ctx, a) => {
          ctx.state.raw = a.mode === "on";
          ctx.ok(`JSON 结构输出已${ctx.state.raw ? "开启" : "关闭"}`);
        },
      },
    ],
  }),

  cmd({
    name: "sound",
    group: "界面",
    desc: "界面音效开关",
    routes: [
      {
        desc: "开关音效",
        args: [{ key: "mode", hint: "on|off", values: ["on", "off"], complete: onOff }],
        run: async (ctx, a) => {
          ctx.state.sound = a.mode === "on";
          ctx.ok(`音效已${ctx.state.sound ? "开启" : "关闭"}`);
          if (ctx.state.sound) ctx.ui.sound("click");
        },
      },
    ],
  }),

  cmd({
    name: "gui",
    group: "界面",
    desc: "界面缩放（Minecraft GUI Scale）",
    routes: [
      {
        desc: "设置缩放级别",
        args: [
          {
            key: "scale",
            hint: "1-4",
            values: ["1", "2", "3", "4"],
            complete: () => ["1", "2", "3", "4"].map((v) => ({ value: v, hint: `GUI Scale ${v}` })),
          },
        ],
        run: async (ctx, a) => {
          ctx.state.gui = Number(a.scale);
          ctx.ui.setGui(ctx.state.gui);
          ctx.ok(`界面缩放：${ctx.state.gui}`);
        },
      },
    ],
  }),

  cmd({
    name: "unicode",
    group: "界面",
    desc: "强制 Unicode 字体（unifont 优先）",
    routes: [
      {
        desc: "切换字体优先级",
        args: [
          {
            key: "flag",
            hint: "true|false",
            type: "bool",
            complete: () => [
              { value: "false", hint: "mc_seven 优先（默认）" },
              { value: "true", hint: "unifont 优先，强制 Unicode" },
            ],
          },
        ],
        run: async (ctx, a) => {
          ctx.state.unicode = a.flag;
          ctx.ui.setUnicode(a.flag);
          ctx.ok(`字体：${a.flag ? "unifont 优先（强制 Unicode）" : "mc_seven 优先"}`);
        },
      },
    ],
  }),

  cmd({
    name: "debug",
    group: "界面",
    desc: "F3 调试屏",
    routes: [
      { desc: "切换调试屏", run: async (ctx) => ctx.ui.toggleDebug() },
    ],
  }),

  // ------------------------------------------------------------------ 状态
  cmd({
    name: "status",
    aliases: ["overview"],
    group: "状态",
    desc: "启动器概览：实例、账号、任务",
    routes: [
      {
        desc: "显示概览",
        run: async (ctx) => {
          await ctx.refresh();
          const selected = (ctx.cache.instances || []).find((item) => item.id === ctx.cache.selectedInstanceId);
          const account = (ctx.cache.accounts || []).find((item) => item.id === ctx.cache.activeAccountId);
          ctx.print([[`MCUGL`, "gold"], [` ${ctx.cache.manifest?.appVersion || "?"}`, "white"], [`   ${ctx.mode === "kernel" ? "内核模式" : "演示模式"}`, ctx.mode === "kernel" ? "green" : "yellow"]]);
          ctx.print([[`当前实例  `, "dark_gray"], [selected ? selected.name : "（未选择）", selected ? "white" : "red"], [`  ${ctx.cache.selectedInstanceId || ""}`, "dark_gray"]]);
          ctx.print([[`当前账号  `, "dark_gray"], [account ? `${account.player} · ${account.kind}` : "（未选择）", account ? "white" : "red"]]);
          ctx.print([
            [`实例 ${ctx.cache.instances.length} · 账号 ${ctx.cache.accounts.length} · 服务器 ${ctx.cache.servers.length} · 任务 ${ctx.cache.tasks.length}`, "gray"],
          ]);
        },
      },
    ],
  }),

  cmd({
    name: "settings",
    group: "状态",
    desc: "查看设置与修订号",
    routes: [
      {
        desc: "显示主要设置项",
        run: async (ctx) => {
          const snapshot = await ctx.invoke("get_settings", {});
          const s = unwrap(snapshot) || {};
          ctx.print([[`设置  revision ${revisionOf(snapshot) ?? "?"}`, "gold"]]);
          const rows = [
            ["游戏目录", s.root],
            ["Java", s.java],
            ["内存", `${s.ram} MB${s.autoMemory ? "（自动）" : ""}`],
            ["窗口", `${s.width} × ${s.height}`],
            ["数据源", s.dataSourceMode],
            ["社区密钥", s.hasCommunityKey ? "已配置" : "未配置"],
            ["管理密钥", s.hasAdminKey ? "已配置" : "未配置"],
          ];
          for (const [key, value] of rows) {
            ctx.print([["  " + key, "dark_gray"], [`  ${value ?? "—"}`, "white"]]);
          }
          ctx.print([["修改：/set ram=8192 autoMemory=false", "dark_gray"]]);
        },
      },
    ],
  }),

  cmd({
    name: "set",
    group: "状态",
    desc: "按 key=value 写入设置",
    routes: [
      {
        desc: "写入设置补丁",
        args: [
          {
            key: "patch",
            hint: "键=值",
            rest: true,
            type: "array",
            complete: () =>
              ["ram", "width", "height", "autoMemory", "autoChinese", "java", "root"].map((v) => ({
                value: `${v}=`,
                hint: "设置项",
              })),
          },
        ],
        run: async (ctx, a) => {
          const tokens = Array.isArray(a.patch) ? a.patch : String(a.patch || "").split(/\s+/).filter(Boolean);
          if (!tokens.length) throw new UsageError("至少给一个 key=value", "/set ram=8192");
          const patch = {};
          for (const token of tokens) {
            const index = token.indexOf("=");
            if (index <= 0) throw new UsageError(`「${token}」不是 key=value`);
            const key = token.slice(0, index);
            patch[key] = castValue(token.slice(index + 1));
          }
          const snapshot = await ctx.invoke("get_settings", {});
          const revision = revisionOf(snapshot);
          if (revision === null) throw new UsageError("内核没有返回修订号，无法安全写入");
          const result = await ctx.invoke("save_settings", { patch, expectedRevision: revision });
          ctx.ok(result?.message || "设置已保存");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "sysinfo",
    group: "状态",
    desc: "系统与运行时信息",
    routes: [
      {
        desc: "显示系统信息",
        run: async (ctx) => {
          const s = unwrap(await ctx.invoke("get_system_info", {})) || {};
          const rows = {
            应用: s.app,
            "运行时 / 内核": s.dotnet,
            WebView: s.webview,
            系统: s.os,
            根目录: s.root,
            数据目录: s.data,
          };
          for (const [key, value] of Object.entries(rows)) {
            ctx.print([["  " + key, "dark_gray"], [`  ${value ?? "—"}`, "white"]]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "java",
    group: "状态",
    desc: "扫描已安装的 Java",
    routes: [
      {
        desc: "扫描 Java",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("scan_java", {})) || [];
          if (!list.length) {
            ctx.warn("没有找到 Java。启动器需要至少一个 Java 运行时。");
            return;
          }
          ctx.print([[`找到 ${list.length} 个 Java`, "gold"]]);
          for (const item of list) {
            if (item.error) {
              ctx.print([["  × ", "red"], [`${item.path}  ${item.error}`, "dark_gray"]]);
              continue;
            }
            ctx.print([["  · ", "dark_gray"], [`Java ${item.major}`, "green"], [`  ${item.vendor} ${item.arch}`, "gray"]]);
            ctx.print([["    ", "dark_gray"], [item.path, "dark_gray"]]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "log",
    group: "状态",
    desc: "读取启动器日志",
    routes: [
      {
        desc: "打印日志",
        run: async (ctx) => {
          const snapshot = await ctx.invoke("read_log", {});
          const text = typeof snapshot === "string" ? snapshot : unwrap(snapshot);
          ctx.printRaw(String(text ?? "").trim() || "（日志是空的）");
        },
      },
    ],
  }),

  cmd({
    name: "key",
    group: "状态",
    desc: "校验社区 / 管理密钥",
    routes: [
      {
        desc: "校验密钥",
        args: [
          {
            key: "role",
            hint: "角色",
            values: ["community", "admin"],
            complete: () => [
              { value: "community", hint: "社区数据密钥" },
              { value: "admin", hint: "管理密钥" },
            ],
          },
          { key: "value", hint: "密钥" },
        ],
        run: async (ctx, a) => {
          const result = await ctx.invoke("verify_key", { role: a.role, key: a.value });
          if (result?.ok) ctx.ok(result.message || "密钥有效");
          else ctx.error(result?.message || "密钥无效");
        },
      },
    ],
  }),

  cmd({
    name: "open",
    group: "状态",
    desc: "在文件管理器里打开目录",
    routes: [
      {
        desc: "打开目录",
        args: [
          {
            key: "kind",
            hint: "目录",
            values: ["game", "instance", "log"],
            complete: () => [
              { value: "game", hint: "游戏根目录" },
              { value: "instance", hint: "当前实例目录" },
              { value: "log", hint: "日志目录" },
            ],
          },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("open_folder", { kind: a.kind }))?.message || `已打开 ${a.kind}`);
        },
      },
    ],
  }),

  cmd({
    name: "resetwindow",
    group: "状态",
    desc: "重置窗口大小与位置",
    routes: [
      {
        desc: "重置窗口",
        run: async (ctx) => {
          ctx.ok((await ctx.invoke("reset_window", {}))?.message || "窗口已重置");
        },
      },
    ],
  }),

  cmd({
    name: "pick",
    group: "状态",
    desc: "打开系统文件 / 目录选择框",
    routes: [
      {
        desc: "选择文件或目录",
        args: [
          {
            key: "what",
            hint: "file|folder",
            values: ["file", "folder"],
            complete: () => [
              { value: "file", hint: "选择文件" },
              { value: "folder", hint: "选择目录" },
            ],
          },
        ],
        run: async (ctx, a) => {
          const method = a.what === "folder" ? "pick_folder" : "pick_file";
          const picked = unwrap(await ctx.invoke(method, { title: "MCUGL 命令终端" }));
          if (!picked) {
            ctx.warn("没有选择任何路径。");
            return;
          }
          ctx.print([["已选择 ", "gray"], [String(picked), "white"], ["  （点击复制）", "dark_gray", { click: String(picked), copy: true }]]);
        },
      },
    ],
  }),

  cmd({
    name: "avatar",
    group: "状态",
    desc: "读取账号头像",
    routes: [
      {
        desc: "读取头像",
        args: [{ key: "account", hint: "账号（默认当前）", optional: true, complete: accountCandidates }],
        run: async (ctx, a) => {
          const accountId = a.account || ctx.cache.activeAccountId;
          const info = await ctx.invoke("read_avatar", accountId ? { accountId } : {});
          if (info?.image) {
            ctx.print([["头像 ", "gray"], [info.label || "已加载", "white"], [`  ${info.player}`, "dark_gray"]]);
          } else {
            ctx.print([["头像 ", "gray"], [info?.label || info?.player?.[0] || "?", "gold"], [`  ${info?.player || "（无）"}  （内核没有返回图片时用首字母兜底）`, "dark_gray"]]);
          }
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 实例
  cmd({
    name: "instances",
    aliases: ["ls"],
    group: "实例",
    desc: "列出实例",
    routes: [
      {
        desc: "列出实例目录",
        run: async (ctx) => {
          await ctx.refresh();
          renderInstances(ctx, ctx.cache.instances, "实例目录");
        },
      },
      {
        path: ["all"],
        desc: "扫描磁盘上的全部实例",
        run: async (ctx) => {
          const catalog = unwrap(await ctx.invoke("list_all_instances", {})) || {};
          renderInstances(ctx, catalog.items || [], "磁盘扫描结果");
        },
      },
    ],
  }),

  cmd({
    name: "select",
    group: "实例",
    desc: "切换当前实例",
    routes: [
      {
        desc: "切换实例",
        args: [INSTANCE],
        run: async (ctx, a) => {
          const result = await ctx.invoke("select_instance", { instanceId: a.instance });
          ctx.ok(result?.message || `已切换到 ${a.instance}`);
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "mods",
    group: "实例",
    desc: "列出实例里的模组",
    routes: [
      {
        desc: "列出模组",
        args: [{ ...INSTANCE, optional: true }],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const list = unwrap(await ctx.invoke("list_instance_mods", { instanceId })) || [];
          ctx.cache.mods.set(instanceId, list);
          if (!list.length) {
            ctx.warn(`${instanceId} 没有模组。`);
            return;
          }
          ctx.print([[`${instanceId}  ${list.filter((m) => m.enabled).length}/${list.length} 启用`, "gold"]]);
          for (const mod of list) {
            ctx.print([
              [mod.enabled ? "  ✔ " : "  ✖ ", mod.enabled ? "green" : "dark_red"],
              [mod.name, mod.enabled ? "white" : "dark_gray"],
              [`  ${mod.version}  ${mod.file}`, "dark_gray"],
              ["  ", "gray"],
              [mod.enabled ? "禁用" : "启用", "aqua", { click: `/mod toggle ${mod.id} ${mod.enabled ? "off" : "on"} ${instanceId}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "launchopts",
    group: "实例",
    desc: "读取实例启动设置",
    routes: [
      {
        desc: "读取启动设置",
        args: [{ ...INSTANCE, optional: true }],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const info = await ctx.invoke("read_launch_options", { instanceId, requestId: "" });
          const settings = info?.settings || {};
          ctx.print([[`${instanceId} 启动设置`, "gold"], [info?.inherit ? "  （继承全局）" : "  （独立）", "dark_gray"]]);
          for (const [key, value] of Object.entries(settings)) {
            ctx.print([["  " + key, "dark_gray"], [`  ${String(value)}`, "white"]]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "clone",
    group: "实例",
    desc: "克隆实例",
    routes: [
      {
        desc: "克隆实例",
        args: [INSTANCE, { key: "name", hint: "新名称" }],
        run: async (ctx, a) => {
          const result = await ctx.invoke("clone_instance", {
            instanceId: a.instance,
            displayName: a.name,
            saves: false,
            servers: false,
          });
          ctx.ok(result?.message || "已克隆");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "export",
    group: "实例",
    desc: "把实例导出成整合包",
    routes: [
      {
        desc: "导出实例",
        args: [INSTANCE, { key: "path", hint: "目标路径" }],
        run: async (ctx, a) => {
          const result = await ctx.invoke("export_instance", {
            instanceId: a.instance,
            path: a.path,
            saves: false,
            servers: false,
          });
          ctx.ok(result?.message || "已导出");
        },
      },
    ],
  }),

  cmd({
    name: "uninstall",
    group: "实例",
    desc: "预览 / 执行实例卸载",
    routes: [
      {
        desc: "预览卸载影响",
        args: [{ ...INSTANCE, optional: true }],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const info = await ctx.invoke("preview_uninstall", { instanceId });
          ctx.print([["卸载预览：", "gold"], [info?.name || instanceId, "white"]]);
          ctx.print([[`  计划 ${info?.planId || "?"} · 修订 ${info?.targetRevision ?? "?"} · 过期 ${info?.expiresAt || "?"}`, "dark_gray"]]);
          if (info?.notice) ctx.print([["  " + info.notice, "yellow"]]);
          if (info?.paths?.length) ctx.print([["  涉及目录：", "dark_gray"], [info.paths.join("、"), "gray"]]);
          ctx.print([["  确认卸载：", "dark_gray"], [`/uninstall apply ${info?.planId || "<计划>"}`, "red", { click: `/uninstall apply ${info?.planId || ""}` }]]);
        },
      },
      {
        path: ["apply"],
        desc: "按预览令牌执行卸载",
        args: [{ key: "plan", hint: "计划标识" }],
        run: async (ctx, a) => {
          const result = await ctx.invoke("apply_uninstall", { planId: a.plan });
          ctx.ok(result?.message || "已卸载");
          await ctx.refresh();
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 账号
  cmd({
    name: "accounts",
    group: "账号",
    desc: "列出账号",
    routes: [
      {
        desc: "列出账号",
        run: async (ctx) => {
          await ctx.refresh();
          if (!ctx.cache.accounts.length) {
            ctx.warn("没有账号。用 /login 开始登录。");
            return;
          }
          ctx.print([[`账号 ${ctx.cache.accounts.length} 个`, "gold"]]);
          for (const account of ctx.cache.accounts) {
            const active = account.id === ctx.cache.activeAccountId;
            ctx.print([
              [active ? "  › " : "  · ", active ? "green" : "dark_gray"],
              [account.player, active ? "white" : "gray"],
              [`  ${account.kind}  ${account.status}  ${account.id}`, "dark_gray"],
              ["  ", "gray"],
              [active ? "" : "使用", "aqua", { click: active ? "" : `/account use ${account.id}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "account",
    group: "账号",
    desc: "切换 / 移除账号",
    routes: [
      {
        desc: "列出账号",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_accounts", {})) || [];
          ctx.print([[`账号 ${list.length} 个`, "gold"]]);
          for (const account of list) {
            ctx.print([["  · ", "dark_gray"], [`${account.player}  ${account.kind}  ${account.status}`, "white"]]);
            ctx.print([["    ", "dark_gray"], [`/account use ${account.id}`, "aqua", { click: `/account use ${account.id}` }]]);
          }
        },
      },
      {
        path: ["use"],
        desc: "切换当前账号",
        args: [ACCOUNT],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("select_account", { accountId: a.account }))?.message || "已切换账号");
          await ctx.refresh();
        },
      },
      {
        path: ["forget"],
        desc: "移除账号",
        args: [ACCOUNT],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("forget_account", { accountId: a.account }))?.message || "已移除账号");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "login",
    group: "账号",
    desc: "开始微软账号登录",
    routes: [
      {
        desc: "开始登录",
        args: [
          {
            key: "provider",
            hint: "登录方式",
            optional: true,
            values: ["microsoft"],
            complete: () => [{ value: "microsoft", hint: "微软正版登录" }],
          },
        ],
        run: async (ctx, a) => {
          const session = await ctx.invoke("start_login", { provider: a.provider || "microsoft" });
          const id = session?.authSessionId || session?.id || "?";
          ctx.print([["登录会话已创建：", "gold"], [String(id), "white"]]);
          ctx.print([["  下一步：", "dark_gray"], [`/loginstatus ${id}`, "aqua", { click: `/loginstatus ${id}` }]]);
          ctx.print([["  取消：", "dark_gray"], [`/logincancel ${id}`, "gray", { click: `/logincancel ${id}` }]]);
        },
      },
    ],
  }),

  cmd({
    name: "loginstatus",
    group: "账号",
    desc: "查询登录会话",
    routes: [
      {
        desc: "查询会话",
        args: [{ key: "session", hint: "会话标识" }],
        run: async (ctx, a) => {
          ctx.printJson(await ctx.invoke("get_login_session", { authSessionId: a.session }));
        },
      },
    ],
  }),

  cmd({
    name: "loginprofile",
    group: "账号",
    desc: "选择登录角色",
    routes: [
      {
        desc: "选择角色",
        args: [
          { key: "session", hint: "会话标识" },
          { key: "profile", hint: "角色标识" },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("select_login_profile", { authSessionId: a.session, profileId: a.profile }))?.message || "已选择角色");
        },
      },
    ],
  }),

  cmd({
    name: "logincancel",
    group: "账号",
    desc: "取消登录",
    routes: [
      {
        desc: "取消登录",
        args: [{ key: "session", hint: "会话标识" }],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("cancel_login", { authSessionId: a.session }))?.message || "已取消登录");
        },
      },
    ],
  }),

  cmd({
    name: "skin",
    group: "账号",
    desc: "设置离线皮肤",
    routes: [
      {
        desc: "设置皮肤文件",
        args: [{ key: "path", hint: "皮肤图片路径" }],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("set_offline_skin", { path: a.path }))?.message || "已设置皮肤");
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 启动
  cmd({
    name: "launch",
    aliases: ["play"],
    group: "启动",
    desc: "启动游戏",
    routes: [
      {
        desc: "启动当前实例",
        args: [
          { ...INSTANCE, optional: true },
          { ...ACCOUNT, optional: true },
        ],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const accountId = a.account || ctx.cache.activeAccountId;
          if (!accountId) throw new UsageError("没有可用账号，先 /accounts 看看", "/accounts");
          const result = await ctx.invoke("launch_game", { instanceId, accountId });
          ctx.ok(`已启动 ${instanceId}  会话 ${result?.sessionId || "?"}`);
          ctx.achievement("launch", "启动！", "第一次从命令行启动游戏");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "join",
    group: "启动",
    desc: "直连服务器启动",
    routes: [
      {
        desc: "直连服务器",
        args: [
          {
            key: "server",
            hint: "服务器或地址",
            complete: (ctx) => [
              ...serverCandidates(ctx),
              { value: "mc.hypixel.net", hint: "直接输入地址也可以" },
            ],
          },
          { ...INSTANCE, optional: true },
        ],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const accountId = ctx.cache.activeAccountId;
          if (!accountId) throw new UsageError("没有可用账号，先 /accounts 看看");
          const saved = (ctx.cache.servers || []).find((item) => eq(item.name, a.server));
          const address = saved ? saved.address : a.server;
          const result = await ctx.invoke("launch_to_server", { instanceId, accountId, serverAddress: address });
          ctx.ok(`正在直连 ${address}  会话 ${result?.sessionId || "?"}`);
          ctx.achievement("join", "出去看看", "第一次直连服务器");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "sessions",
    group: "启动",
    desc: "游戏运行会话",
    routes: [
      {
        desc: "列出会话",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_game_sessions", {})) || [];
          if (!list.length) {
            ctx.print([["没有正在运行的游戏。", "gray"]]);
            return;
          }
          for (const session of list) {
            ctx.print([
              [`  ${session.status === "running" ? "●" : "○"} `, session.status === "running" ? "green" : "dark_gray"],
              [`${session.sessionId}`, "white"],
              [`  ${session.instanceId} · pid ${session.pid ?? "—"} · ${session.status}`, "gray"],
              ["  ", "gray"],
              [session.status === "running" ? "结束" : "", "red", { click: session.status === "running" ? `/stop ${session.sessionId}` : "" }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "stop",
    group: "启动",
    desc: "结束游戏会话",
    routes: [
      {
        desc: "结束会话",
        args: [{ key: "session", hint: "会话标识" }],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("stop_game", { sessionId: a.session }))?.message || "已结束会话");
        },
      },
    ],
  }),

  cmd({
    name: "server",
    aliases: ["servers"],
    group: "启动",
    desc: "服务器收藏与延迟测试",
    routes: [
      {
        desc: "列出服务器",
        run: listServers,
      },
      {
        path: ["list"],
        desc: "列出服务器",
        run: listServers,
      },
      {
        path: ["add"],
        desc: "添加服务器收藏",
        args: [
          { key: "name", hint: "名称" },
          { key: "address", hint: "地址" },
        ],
        run: async (ctx, a) => {
          const result = await ctx.invoke("save_server", {
            name: a.name,
            address: a.address,
            id: "",
            instanceId: null,
          });
          ctx.ok(result?.message || "已添加服务器");
          await ctx.refresh();
        },
      },
      {
        path: ["remove"],
        desc: "删除服务器收藏",
        args: [
          {
            key: "id",
            hint: "服务器",
            complete: (ctx) =>
              (ctx.cache.servers || []).map((item) => ({
                value: item.id,
                hint: `${item.name} · ${item.address}`,
              })),
          },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("delete_server", { id: a.id }))?.message || "已删除服务器");
          await ctx.refresh();
        },
      },
      {
        path: ["ping"],
        desc: "测试服务器延迟",
        args: [
          {
            key: "address",
            hint: "地址",
            complete: (ctx) =>
              (ctx.cache.servers || []).map((item) => ({ value: item.address, hint: item.name })),
          },
        ],
        run: async (ctx, a) => {
          const info = await ctx.invoke("ping_server", { address: a.address });
          if (info?.online) {
            ctx.print([
              ["● ", "green"],
              [info.motd || a.address, "white"],
              [`  ${info.players}/${info.max} 人 · ${info.ping} ms · ${info.version}`, "gray"],
            ]);
          } else {
            ctx.print([["○ ", "red"], [`${a.address} 离线 ${info?.error || ""}`, "red"]]);
          }
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 内容
  cmd({
    name: "search",
    group: "内容",
    desc: "搜索模组 / 插件 / 光影",
    routes: [
      {
        desc: "搜索内容",
        args: [
          { key: "query", hint: "关键词" },
          {
            key: "category",
            hint: "类别",
            optional: true,
            values: ["mod", "plugin", "shader"],
            complete: () => [
              { value: "mod", hint: "模组" },
              { value: "plugin", hint: "插件" },
              { value: "shader", hint: "光影" },
            ],
          },
        ],
        run: async (ctx, a) => {
          const result = unwrap(
            await ctx.invoke("search_content", {
              category: a.category || "mod",
              query: a.query,
            }),
          );
          const items = result?.items || result || [];
          if (!Array.isArray(items) || !items.length) {
            ctx.warn(`没有找到「${a.query}」。`);
            return;
          }
          ctx.print([[`「${a.query}」  ${items.length} 个结果`, "gold"]]);
          for (const item of items.slice(0, 12)) {
            ctx.print([
              ["  · ", "dark_gray"],
              [item.name || item.id, "white"],
              [`  ${item.author || ""}`, "gray"],
              [`  ${formatCount(item.downloads)}`, "dark_gray"],
            ]);
            if (item.description) ctx.print([["    ", "dark_gray"], [item.description, "gray"]]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "versions",
    group: "内容",
    desc: "列出某个项目可安装的版本",
    routes: [
      {
        desc: "列出可用版本",
        args: [{ key: "id", hint: "项目标识" }],
        run: async (ctx, a) => {
          const list = unwrap(
            await ctx.invoke("list_content_versions", { id: a.id, requestId: "" }),
          ) || [];
          const items = Array.isArray(list) ? list : list.items || [];
          if (!items.length) {
            ctx.warn(`没有拿到 ${a.id} 的版本列表。`);
            return;
          }
          ctx.print([[`${a.id}  ${items.length} 个版本`, "gold"]]);
          for (const item of items.slice(0, 15)) {
            ctx.print([
              ["  · ", "dark_gray"],
              [`${item.name || a.id} ${item.version || ""}`, "white"],
              [`  ${item.game || ""} ${item.loader || ""}  ${formatCount(item.downloads)}`, "gray"],
              ["  ", "gray"],
              ["下载", "aqua", { click: `/queue ${item.id} ${item.id}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "vanilla",
    group: "内容",
    desc: "可安装的原版版本",
    routes: [
      {
        desc: "列出原版版本",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_vanilla_versions", {})) || [];
          const items = Array.isArray(list) ? list : list.items || [];
          ctx.print([[`原版版本 ${items.length} 个`, "gold"]]);
          for (const item of items.slice(0, 20)) {
            const id = item.id || item.version;
            ctx.print([
              ["  · ", "dark_gray"],
              [id, "white"],
              [`  ${item.type || ""} ${item.releaseTime || ""}`, "gray"],
              ["  ", "gray"],
              ["安装", "aqua", { click: `/install ${id}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "install",
    group: "内容",
    desc: "安装原版实例",
    routes: [
      {
        desc: "安装原版",
        args: [
          {
            key: "version",
            hint: "游戏版本",
            complete: (ctx) =>
              (ctx.cache.vanilla || []).map((item) => ({ value: item.id || item.version, hint: item.type || "" })),
          },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("install_vanilla", { minecraftVersion: a.version }))?.message || `已排队安装 ${a.version}`);
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "loaders",
    group: "内容",
    desc: "列出某版本可用的加载器与版本",
    routes: [
      {
        desc: "列出加载器",
        args: [
          {
            key: "version",
            hint: "游戏版本",
            complete: (ctx) =>
              (ctx.cache.vanilla || []).map((item) => ({ value: item.id || item.version, hint: item.type || "" })),
          },
          {
            key: "loader",
            hint: "加载器",
            optional: true,
            values: ["fabric", "forge", "neoforge", "quilt"],
            complete: () => [
              { value: "fabric", hint: "Fabric" },
              { value: "forge", hint: "Forge" },
              { value: "neoforge", hint: "NeoForge" },
              { value: "quilt", hint: "Quilt" },
            ],
          },
        ],
        run: async (ctx, a) => {
          const info = unwrap(
            await ctx.invoke("list_loaders", { minecraftVersion: a.version, loader: a.loader || "fabric" }),
          );
          const versions = info?.versions || info || [];
          ctx.print([[`${a.loader || "fabric"} · MC ${a.version}`, "gold"]]);
          for (const item of (Array.isArray(versions) ? versions : []).slice(0, 12)) {
            const value = item.version || item;
            ctx.print([
              ["  · ", "dark_gray"],
              [String(value), "white"],
              [item.recommended ? "  推荐" : "", "green"],
              ["  ", "gray"],
              ["安装", "aqua", { click: `/loader ${a.version} ${a.loader || "fabric"} ${value}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "loader",
    group: "内容",
    desc: "安装加载器",
    routes: [
      {
        desc: "安装加载器",
        args: [
          { key: "version", hint: "游戏版本" },
          {
            key: "loader",
            hint: "加载器",
            values: ["fabric", "forge", "neoforge", "quilt"],
            complete: () => [
              { value: "fabric", hint: "Fabric" },
              { value: "forge", hint: "Forge" },
              { value: "neoforge", hint: "NeoForge" },
              { value: "quilt", hint: "Quilt" },
            ],
          },
          { key: "loaderVersion", hint: "加载器版本" },
        ],
        run: async (ctx, a) => {
          ctx.ok(
            (await ctx.invoke("install_loader", {
              minecraftVersion: a.version,
              loader: a.loader,
              loaderVersion: a.loaderVersion,
            }))?.message || "已排队安装加载器",
          );
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "updates",
    group: "内容",
    desc: "检查 / 应用内容更新",
    routes: [
      {
        desc: "检查更新",
        args: [{ ...INSTANCE, optional: true }],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const info = unwrap(await ctx.invoke("check_updates", { instanceId })) || {};
          const items = info.items || [];
          if (!items.length) {
            ctx.ok("没有可用的内容更新。");
            return;
          }
          ctx.print([[`${instanceId}  ${items.length} 个更新 · 检查 ${info.checkId || "?"}`, "gold"]]);
          for (const item of items) {
            ctx.print([
              ["  · ", "dark_gray"],
              [item.name || item.id, "white"],
              [`  ${item.before} → ${item.after}`, "green"],
            ]);
          }
          ctx.print([["  预览更新：", "dark_gray"], [`/updates preview ${info.checkId}`, "aqua", { click: `/updates preview ${info.checkId}` }]]);
        },
      },
      {
        path: ["preview"],
        desc: "生成更新预览",
        args: [
          { key: "check", hint: "检查标识" },
          { key: "projects", hint: "项目", rest: true, optional: true, type: "array" },
        ],
        run: async (ctx, a) => {
          const preview = await ctx.invoke("preview_updates", {
            checkId: a.check,
            projects: Array.isArray(a.projects) ? a.projects : [],
          });
          ctx.print([["更新预览计划：", "gold"], [preview?.planId || "?", "white"]]);
          for (const change of preview?.changes || []) {
            ctx.print([["  · ", "dark_gray"], [change.project, "white"], [`  ${change.before} → ${change.after}  ${formatBytes(change.bytes || 0)}`, "gray"]]);
          }
          ctx.print([["  应用：", "dark_gray"], [`/updates apply ${preview?.planId || "<计划>"}`, "aqua", { click: `/updates apply ${preview?.planId || ""}` }]]);
        },
      },
      {
        path: ["apply"],
        desc: "应用更新计划",
        args: [{ key: "plan", hint: "计划标识" }],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("apply_updates", { planId: a.plan }))?.message || "已应用更新");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "pack",
    group: "内容",
    desc: "预览 / 导入整合包",
    routes: [
      {
        desc: "预览整合包",
        args: [{ key: "path", hint: "整合包路径" }],
        run: async (ctx, a) => {
          const preview = await ctx.invoke("preview_pack", { path: a.path });
          ctx.print([["整合包预览：", "gold"], [preview?.name || a.path, "white"]]);
          ctx.print([[`  ${preview?.game || "?"} · ${preview?.loader || "?"} · 计划 ${preview?.planId || "?"}`, "gray"]]);
          ctx.print([["  导入：", "dark_gray"], [`/pack apply ${preview?.planId || "<计划>"} "${preview?.name || "整合包"}" "${preview?.root || ""}"`, "aqua", { click: `/pack apply ${preview?.planId || ""} "${preview?.name || ""}" "${preview?.root || ""}"` }]]);
        },
      },
      {
        path: ["apply"],
        desc: "确认导入整合包",
        args: [
          { key: "plan", hint: "计划标识" },
          { key: "name", hint: "名称" },
          { key: "directory", hint: "目录" },
        ],
        run: async (ctx, a) => {
          ctx.ok(
            (await ctx.invoke("confirm_pack", {
              planId: a.plan,
              name: a.name,
              directory: a.directory,
            }))?.message || "已导入整合包",
          );
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "mod",
    group: "内容",
    desc: "启用 / 禁用 / 删除模组",
    routes: [
      {
        path: ["toggle"],
        desc: "启用或禁用模组",
        args: [
          { key: "mod", hint: "模组", complete: modCandidates },
          {
            key: "enabled",
            hint: "on|off",
            values: ["on", "off"],
            complete: onOff,
          },
          { ...INSTANCE, optional: true },
        ],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          const result = await ctx.invoke("toggle_mod", {
            instanceId,
            modId: a.mod,
            enabled: a.enabled === "on",
          });
          ctx.ok(result?.message || "已更新模组状态");
        },
      },
      {
        path: ["delete"],
        desc: "删除模组文件",
        args: [
          { key: "mod", hint: "模组", complete: modCandidates },
          { ...INSTANCE, optional: true },
        ],
        run: async (ctx, a) => {
          const instanceId = resolveInstance(ctx, a.instance);
          ctx.ok(
            (await ctx.invoke("delete_mod", { instanceId, modId: a.mod }))?.message || "已删除模组",
          );
        },
      },
    ],
  }),

  cmd({
    name: "bookmarks",
    group: "内容",
    desc: "收藏的内容",
    routes: [
      {
        desc: "列出收藏",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_bookmarks", {})) || [];
          if (!list.length) {
            ctx.print([["还没有收藏。", "gray"]]);
            return;
          }
          for (const item of list) {
            ctx.print([
              ["  ★ ", "yellow"],
              [item.name, "white"],
              [`  ${item.kind} · ${item.author || ""}`, "gray"],
              ["  ", "gray"],
              ["取消", "dark_gray", { click: `/bookmark ${item.id} "${item.name}"` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "bookmark",
    group: "内容",
    desc: "收藏 / 取消收藏内容",
    routes: [
      {
        desc: "切换收藏状态",
        args: [
          { key: "id", hint: "项目标识" },
          { key: "name", hint: "名称" },
          { key: "description", hint: "描述", optional: true, rest: true },
        ],
        run: async (ctx, a) => {
          const result = await ctx.invoke("toggle_bookmark", {
            id: a.id,
            name: a.name,
            description: a.description || "",
            kind: "mod",
            author: "",
          });
          ctx.ok(result?.message || "已更新收藏");
        },
      },
    ],
  }),

  cmd({
    name: "community",
    group: "内容",
    desc: "社区公告与推荐",
    routes: [
      {
        desc: "读取社区数据",
        run: async (ctx) => {
          const data = unwrap(await ctx.invoke("get_community", {})) || {};
          ctx.print([[`社区数据`, "gold"]]);
          for (const item of data.announcements || []) {
            ctx.print([["  · ", "dark_gray"], [item.title || "公告", "white"]]);
            if (item.body) ctx.print([["    ", "dark_gray"], [item.body, "gray"]]);
          }
          for (const item of data.recommendations || []) {
            ctx.print([["  ◆ ", "aqua"], [item.name || "", "white"], [`  ${item.description || ""}`, "gray"]]);
          }
        },
      },
      {
        path: ["refresh"],
        desc: "刷新社区数据",
        run: async (ctx) => {
          ctx.ok((await ctx.invoke("refresh_community", {}))?.message || "已刷新社区数据");
        },
      },
    ],
  }),

  cmd({
    name: "recommend",
    group: "内容",
    desc: "保存推荐位（JSON）",
    routes: [
      {
        desc: "保存推荐位",
        args: [{ key: "items", hint: "JSON 数组", type: "json", rest: true }],
        run: async (ctx, a) => {
          const parsed = parseJsonArg(a.items, "items");
          if (!Array.isArray(parsed)) throw new UsageError("items 必须是 JSON 数组", '/recommend [{"name":"Sodium"}]');
          ctx.ok((await ctx.invoke("save_recommendations", { items: parsed }))?.message || "已保存推荐位");
        },
      },
    ],
  }),

  cmd({
    name: "queue",
    group: "内容",
    desc: "把内容版本加入安装队列",
    routes: [
      {
        desc: "加入队列",
        args: [
          { key: "token", hint: "计划令牌" },
          { key: "version", hint: "版本标识" },
          { key: "mode", hint: "安装模式", optional: true },
          { key: "path", hint: "目标路径", optional: true },
        ],
        run: async (ctx, a) => {
          ctx.ok(
            (await ctx.invoke("queue_content_version", {
              token: a.token,
              versionId: a.version,
              mode: a.mode || "",
              path: a.path || "",
            }))?.message || "已加入安装队列",
          );
          await ctx.refresh();
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 任务
  cmd({
    name: "tasks",
    group: "任务",
    desc: "任务列表与进度",
    routes: [
      {
        desc: "列出任务",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_tasks", {})) || [];
          if (!list.length) {
            ctx.print([["没有任务。", "gray"]]);
            return;
          }
          for (const task of list) {
            const progress = task.progress
              ? `  ${task.progress.completed}/${task.progress.total ?? "?"} ${task.progress.unit || ""}`
              : "";
            ctx.print([
              [`  ${statusDot(task.status)} `, statusColor(task.status)],
              [task.name, "white"],
              [`  ${task.status} · ${task.phase}${progress}`, "gray"],
            ]);
            for (const action of task.allowedActions || []) {
              const label = { cancel: "取消", pause: "暂停", resume: "继续" }[action] || action;
              ctx.print([["      ", "dark_gray"], [label, "aqua", { click: `/task ${task.id} ${action}` }]]);
            }
          }
        },
      },
    ],
  }),

  cmd({
    name: "task",
    group: "任务",
    desc: "暂停 / 继续 / 取消任务",
    routes: [
      {
        desc: "操作任务",
        args: [
          { key: "id", hint: "任务标识" },
          {
            key: "action",
            hint: "操作",
            values: ["cancel", "pause", "resume"],
            complete: () => [
              { value: "pause", hint: "暂停" },
              { value: "resume", hint: "继续" },
              { value: "cancel", hint: "取消" },
            ],
          },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("task_action", { id: a.id, action: a.action }))?.message || "已操作任务");
          await ctx.refresh();
        },
      },
    ],
  }),

  cmd({
    name: "backups",
    group: "任务",
    desc: "存档备份列表",
    routes: [
      {
        desc: "列出备份",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_save_backups", {})) || [];
          if (!list.length) {
            ctx.print([["还没有存档备份。用 /backup 创建一个。", "gray"]]);
            return;
          }
          for (const item of list) {
            ctx.print([
              ["  · ", "dark_gray"],
              [item.created, "white"],
              [`  ${item.worlds?.join("、") || ""}`, "gray"],
              ["  ", "gray"],
              [item.worlds?.[0] ? "还原首个世界" : "", "aqua", { click: item.worlds?.[0] ? `/restore ${item.id} ${item.worlds[0]}` : "" }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "backup",
    group: "任务",
    desc: "备份所有存档",
    routes: [
      {
        desc: "备份存档",
        run: async (ctx) => {
          ctx.ok((await ctx.invoke("backup_saves", {}))?.message || "已备份存档");
          ctx.achievement("backup", "备份癖", "第一次备份存档");
        },
      },
    ],
  }),

  cmd({
    name: "restore",
    group: "任务",
    desc: "从备份还原世界",
    routes: [
      {
        desc: "还原世界",
        args: [
          {
            key: "id",
            hint: "备份",
            complete: (ctx) =>
              (ctx.cache.backups || []).map((item) => ({ value: item.id, hint: item.created })),
          },
          { key: "world", hint: "世界名" },
        ],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("restore_save", { id: a.id, world: a.world }))?.message || "已还原世界");
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 设置
  cmd({
    name: "datasource",
    group: "设置",
    desc: "数据源模式与连通性测试",
    routes: [
      {
        desc: "切换数据源模式",
        args: [
          {
            key: "mode",
            hint: "default|custom",
            values: ["default", "custom"],
            complete: () => [
              { value: "default", hint: "官方数据源" },
              { value: "custom", hint: "自定义数据源" },
            ],
          },
        ],
        run: async (ctx, a) => {
          const snapshot = await ctx.invoke("get_settings", {});
          const revision = revisionOf(snapshot);
          ctx.ok(
            (await ctx.invoke("use_data_sources", { mode: a.mode, expectedRevision: revision }))?.message ||
              "已切换数据源",
          );
        },
      },
      {
        path: ["test"],
        desc: "测试一个数据源地址",
        args: [
          { key: "name", hint: "名称" },
          { key: "url", hint: "地址" },
        ],
        run: async (ctx, a) => {
          const result = await ctx.invoke("test_data_source", { name: a.name, url: a.url });
          if (result?.ok) ctx.ok(`${result.name} 连通 · ${result.ms} ms`);
          else ctx.error(`${a.name} 不通：${result?.message || "未知原因"}`);
        },
      },
    ],
  }),

  cmd({
    name: "root",
    group: "设置",
    desc: "移除游戏目录",
    routes: [
      {
        path: ["remove"],
        desc: "从设置里移除一个游戏目录",
        args: [{ key: "path", hint: "目录" }],
        run: async (ctx, a) => {
          const snapshot = await ctx.invoke("get_settings", {});
          const revision = revisionOf(snapshot);
          ctx.ok(
            (await ctx.invoke("remove_game_root", { root: a.path, expectedRevision: revision }))?.message ||
              "已移除目录",
          );
        },
      },
    ],
  }),

  cmd({
    name: "frontends",
    group: "前端",
    desc: "已安装的前端包",
    routes: [
      {
        desc: "列出前端包",
        run: async (ctx) => {
          const list = unwrap(await ctx.invoke("list_frontends", {})) || [];
          for (const item of list) {
            ctx.print([
              [item.active ? "  › " : "  · ", item.active ? "green" : "dark_gray"],
              [item.name || item.identifier, "white"],
              [`  ${item.identifier} ${item.version}`, "gray"],
              item.active ? ["  当前", "green"] : ["  ", "gray"],
              [item.active ? "" : "使用", "aqua", { click: item.active ? "" : `/frontend use ${item.identifier}` }],
            ]);
          }
        },
      },
    ],
  }),

  cmd({
    name: "frontend",
    group: "前端",
    desc: "导入 / 切换 / 移除前端包",
    routes: [
      {
        path: ["install"],
        desc: "导入 .mcuglf 前端包",
        args: [{ key: "path", hint: "包路径" }],
        run: async (ctx, a) => {
          ctx.ok((await ctx.invoke("install_frontend", { path: a.path }))?.message || "已导入前端包");
        },
      },
      {
        path: ["use"],
        desc: "切换前端（official 为官方）",
        args: [
          {
            key: "identifier",
            hint: "标识",
            complete: (ctx) =>
              (ctx.cache.frontends || []).map((item) => ({ value: item.identifier, hint: item.name })),
          },
        ],
        run: async (ctx, a) => {
          const identifier = a.identifier === "official" ? null : a.identifier;
          const snapshot = await ctx.invoke("get_settings", {});
          const result = await ctx.invoke("use_frontend", {
            identifier,
            expectedRevision: revisionOf(snapshot),
          });
          ctx.ok(result?.message || "已切换前端（重启前端后生效）");
        },
      },
      {
        path: ["remove"],
        desc: "移除前端包",
        args: [
          {
            key: "identifier",
            hint: "标识",
            complete: (ctx) =>
              (ctx.cache.frontends || []).map((item) => ({ value: item.identifier, hint: item.name })),
          },
          { key: "version", hint: "版本", optional: true },
        ],
        run: async (ctx, a) => {
          const snapshot = await ctx.invoke("get_settings", {});
          ctx.ok(
            (await ctx.invoke("remove_frontend", {
              identifier: a.identifier,
              version: a.version || "",
              expectedRevision: revisionOf(snapshot),
            }))?.message || "已移除前端",
          );
        },
      },
    ],
  }),

  // ------------------------------------------------------------------ 整活
  cmd({
    name: "say",
    group: "整活",
    desc: "在聊天里说一句话",
    routes: [
      {
        desc: "发送聊天消息",
        args: [{ key: "text", hint: "文本", rest: true }],
        run: async (ctx, a) => ctx.chat(a.text),
      },
    ],
  }),

  cmd({
    name: "me",
    group: "整活",
    desc: "第三人称动作",
    routes: [
      {
        desc: "发送动作",
        args: [{ key: "text", hint: "动作", rest: true }],
        run: async (ctx, a) => {
          ctx.print([["* ", "light_purple"], [ctx.playerName, "light_purple"], [` ${a.text}`, "light_purple"]]);
        },
      },
    ],
  }),

  cmd({
    name: "tellraw",
    group: "整活",
    desc: "渲染 Minecraft 文本组件 JSON",
    routes: [
      {
        desc: "渲染文本组件",
        args: [{ key: "component", hint: "JSON", type: "json", rest: true }],
        run: async (ctx, a) => {
          const component = parseJsonArg(a.component, "component");
          ctx.print(mcTextToSegments(component));
        },
      },
    ],
  }),

  cmd({
    name: "title",
    group: "整活",
    desc: "屏幕中央的大标题",
    routes: [
      {
        desc: "显示标题",
        args: [{ key: "text", hint: "文本", rest: true }],
        run: async (ctx, a) => {
          ctx.ui.title(a.text);
          ctx.achievement("title", "标题党", "第一次给自己发 title");
        },
      },
    ],
  }),

  cmd({
    name: "weather",
    group: "整活",
    desc: "设置天气",
    routes: [
      {
        desc: "设置天气",
        args: [
          {
            key: "value",
            hint: "天气",
            values: ["clear", "rain", "thunder"],
            complete: () => [
              { value: "clear", hint: "晴朗" },
              { value: "rain", hint: "下雨" },
              { value: "thunder", hint: "雷暴" },
            ],
          },
        ],
        run: async (ctx, a) => {
          ctx.state.weather = a.value;
          ctx.ui.setWeather(a.value);
          ctx.ok(`天气设置为 ${a.value}`);
        },
      },
    ],
  }),

  cmd({
    name: "gamemode",
    group: "整活",
    desc: "切换游戏模式（只是显示）",
    routes: [
      {
        desc: "切换模式",
        args: [
          {
            key: "value",
            hint: "模式",
            values: ["survival", "creative", "adventure", "spectator"],
            complete: () => [
              { value: "survival", hint: "生存模式" },
              { value: "creative", hint: "创造模式" },
              { value: "adventure", hint: "冒险模式" },
              { value: "spectator", hint: "旁观模式" },
            ],
          },
        ],
        run: async (ctx, a) => {
          ctx.state.gamemode = a.value;
          ctx.ui.setGamemode(a.value);
          ctx.print([["游戏模式已更新为 ", "gray"], [a.value, "green"]]);
        },
      },
    ],
  }),

  cmd({
    name: "seed",
    group: "整活",
    desc: "显示世界种子",
    routes: [
      {
        desc: "显示种子",
        run: async (ctx) => {
          if (!ctx.state.seed) ctx.state.seed = String(Math.floor(Math.random() * 2 ** 32));
          ctx.print([["种子：", "dark_gray"], [ctx.state.seed, "white"], [`  （种子 ${ctx.state.seed} 是编的）`, "dark_gray"]]);
        },
      },
    ],
  }),

  cmd({
    name: "explode",
    group: "整活",
    desc: "被苦力怕炸死",
    routes: [
      {
        desc: "轰",
        run: async (ctx) => {
          ctx.ui.shake();
          ctx.ui.sound("boom");
          ctx.ui.die("被苦力怕炸死了");
        },
      },
    ],
  }),

];

// ---------------------------------------------------------------------------
// 解析 / 补全 / 执行
// ---------------------------------------------------------------------------

const BY_NAME = new Map();
for (const command of COMMANDS) {
  BY_NAME.set(command.name, command);
  for (const alias of command.aliases) BY_NAME.set(alias, command);
}

export function findCommand(name) {
  return BY_NAME.get(String(name).toLowerCase());
}

function camelKeyOf(name) {
  return name.replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());
}

export function usageOf(command, route) {
  const parts = [`/${command.name}`, ...route.path];
  for (const spec of route.args || []) parts.push(usageArg(spec));
  return parts.join(" ");
}

function usageArg(spec) {
  const label = spec.hint || spec.key;
  if (spec.optional) return `[${label}]`;
  if (spec.values) return `<${spec.values.join("|")}>`;
  return spec.rest ? `<${label}...>` : `<${label}>`;
}

function castValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d*\.\d+$/.test(raw)) return Number(raw);
  return raw;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(`JSON 解析失败：${error.message}`);
  }
}

function parseJsonArg(text, label) {
  if (text && typeof text === "object") return text;
  return parseJson(String(text ?? ""));
}

function matchesPrefix(value, typed) {
  return hasPrefix(value, typed);
}

/**
 * 计算补全候选。
 * @param {string} text 输入框里的完整文本（光标视作在末尾）
 * @param {object} ctx
 * @returns {{items: object[], tokenStart: number, tokenEnd: number, base: string, typed: string, hint: string}}
 */
export function complete(text, ctx) {
  const empty = { items: [], tokenStart: text.length, tokenEnd: text.length, base: text, typed: "", hint: "" };
  if (!text.startsWith("/")) return empty;

  const tokens = tokenize(text);
  if (!tokens.length) return empty;
  const terminatesWithSpace = /\s$/.test(text);

  // 光标所在的 token：结尾是空格时是一个新的空 token
  let current;
  let completed;
  if (terminatesWithSpace) {
    current = { value: "", start: text.length, end: text.length };
    completed = tokens.slice(1).map((token) => token.value);
  } else {
    current = tokens[tokens.length - 1];
    completed = tokens.slice(1, -1).map((token) => token.value);
  }

  // 正在输入命令名
  if (current === tokens[0]) {
    const typed = tokens[0].value;
    if (!typed.startsWith("/")) return empty;
    const namePrefix = typed.slice(1);
    const items = commandCandidates()
      .filter((item) => matchesPrefix(item.value.slice(1), namePrefix))
      .map((item) => ({ ...item, space: true, hint: item.hint || "" }));
    return {
      items,
      tokenStart: tokens[0].start,
      tokenEnd: tokens[0].end,
      base: "",
      typed,
      hint: items.length ? "" : "",
    };
  }

  const command = findCommand(tokens[0].value.slice(1));
  if (!command) return { ...empty, tokenStart: current.start, tokenEnd: current.end, base: text.slice(0, current.start) };

  const typed = current.value;
  const items = [];
  const seen = new Set();
  for (const route of command.routes) {
    for (const candidate of routeCandidates(command, route, completed, typed, ctx)) {
      const dedupeKey = candidate.value.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      items.push(candidate);
    }
  }

  // 字面量子命令按字母序，参数保持来源顺序（实例列表通常已有意义）
  const literals = items.filter((item) => item.kind === "literal").sort((a, b) => a.value.localeCompare(b.value));
  const others = items.filter((item) => item.kind !== "literal");
  const ordered = [...literals, ...others];

  return {
    items: ordered,
    tokenStart: current.start,
    tokenEnd: current.end,
    base: text.slice(0, current.start),
    typed,
    hint: usageHint(command, completed, typed),
  };
}

function routeCandidates(command, route, completed, typed, ctx) {
  let pathIndex = 0;
  let argIndex = 0;

  for (const value of completed) {
    if (pathIndex < route.path.length) {
      if (!eq(value, route.path[pathIndex])) return [];
      pathIndex += 1;
    } else if (argIndex < (route.args || []).length) {
      const spec = route.args[argIndex];
      if (spec.values && !spec.values.some((item) => eq(item, value))) return [];
      argIndex += 1;
    } else {
      return [];
    }
  }

  const out = [];
  if (pathIndex < route.path.length) {
    const literal = route.path[pathIndex];
    if (!matchesPrefix(literal, typed)) return [];
    out.push({ value: literal, hint: route.desc, kind: "literal", space: true });
    return out;
  }

  const specs = route.args || [];
  if (argIndex >= specs.length) return out;
  const spec = specs[argIndex];
  const moreAfter = argIndex < specs.length - 1;
  const space = spec.rest ? false : moreAfter;

  if (spec.values) {
    for (const value of spec.values) {
      if (!matchesPrefix(value, typed)) continue;
      out.push({ value, hint: spec.hint || "", kind: "arg", space });
    }
    return out;
  }

  if (spec.complete) {
    for (const candidate of spec.complete(ctx) || []) {
      if (!matchesPrefix(candidate.value, typed)) continue;
      out.push({ ...candidate, kind: "arg", space: candidate.space ?? space });
    }
  }
  return out;
}

function usageHint(command, completed, typed) {
  const route = command.routes.find((item) => {
    if (completed.length < item.path.length) return false;
    for (let i = 0; i < item.path.length; i += 1) {
      if (!eq(completed[i], item.path[i])) return false;
    }
    return true;
  });
  return route ? usageOf(command, route) : usageOf(command, command.routes[0]);
}

function resolveInstance(ctx, value) {
  if (value) return value;
  const selected = ctx.cache.selectedInstanceId;
  if (!selected) throw new UsageError("没有选中的实例，用 /select <实例> 选一个", "/instances");
  return selected;
}

/**
 * 执行一行输入。返回值仅用于测试断言。
 * @param {string} raw
 * @param {object} ctx
 */
export async function execute(raw, ctx) {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "empty" };
  if (!text.startsWith("/")) {
    ctx.chat(text);
    return { kind: "chat" };
  }

  const tokens = tokenize(text);
  const head = tokens[0].value.slice(1);
  const command = findCommand(head);
  if (!command) {
    throw new UsageError(`未知的命令：/${head}`, "输入 /help 查看全部命令");
  }

  const args = tokens.slice(1).map((token) => token.value);
  let matched = null;
  for (const route of command.routes) {
    if (args.length < route.path.length) continue;
    let ok = true;
    for (let i = 0; i < route.path.length; i += 1) {
      if (!eq(args[i], route.path[i])) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const rest = args.slice(route.path.length);
    const specs = route.args || [];
    const required = specs.filter((spec) => !spec.optional).length;
    const acceptsRest = specs.some((spec) => spec.rest);
    const max = acceptsRest ? Infinity : specs.length;
    if (rest.length >= required && rest.length <= max) {
      matched = route;
      break;
    }
  }

  if (!matched) {
    const best = command.routes.find((route) => args.length <= route.path.length) || command.routes[0];
    throw new UsageError(`/${head} 的参数不对`, usageOf(command, best));
  }

  const values = bindArgs(command, matched, args.slice(matched.path.length));
  try {
    await matched.run(ctx, values);
  } catch (error) {
    if (error instanceof UsageError && !error.usage) error.usage = usageOf(command, matched);
    throw error;
  }
  return { kind: "command", command: command.name, route: matched };
}

function bindArgs(command, route, rawTokens) {
  const values = {};
  let index = 0;
  for (const spec of route.args || []) {
    if (spec.rest) {
      const rest = rawTokens.slice(index);
      if (!rest.length) {
        if (spec.optional) {
          values[spec.key] = spec.type === "array" ? [] : "";
          continue;
        }
        throw new UsageError(`缺少参数 [${spec.hint || spec.key}]`, usageOf(command, route));
      }
      values[spec.key] = spec.type === "array" ? rest : rest.join(" ");
      index = rawTokens.length;
      continue;
    }
    if (index >= rawTokens.length) {
      if (spec.optional) {
        values[spec.key] = undefined;
        continue;
      }
      throw new UsageError(`缺少参数 <${spec.hint || spec.key}>`, usageOf(command, route));
    }
    values[spec.key] = coerce(spec, rawTokens[index], command, route);
    index += 1;
  }
  return values;
}

function coerce(spec, raw, command, route) {
  if (spec.values) {
    const hit = spec.values.find((value) => eq(value, raw));
    if (!hit) {
      throw new UsageError(
        `「${raw}」不是可选值，只能是 ${spec.values.join(" / ")}`,
        usageOf(command, route),
      );
    }
    return hit;
  }
  if (spec.type === "int") {
    const value = Number(raw);
    if (!Number.isInteger(value)) throw new UsageError(`「${raw}」不是整数`, usageOf(command, route));
    return value;
  }
  if (spec.type === "bool") {
    if (/^(true|on|yes|1)$/i.test(raw)) return true;
    if (/^(false|off|no|0)$/i.test(raw)) return false;
    throw new UsageError(`「${raw}」不是布尔值（true/false）`, usageOf(command, route));
  }
  if (spec.type === "json") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new UsageError(`JSON 解析失败：${error.message}`, usageOf(command, route));
    }
  }
  return raw;
}

// ---------------------------------------------------------------------------
// 渲染辅助
// ---------------------------------------------------------------------------

function renderInstances(ctx, list, title) {
  if (!list || !list.length) {
    ctx.warn("没有实例。用 /vanilla + /install 装一个。");
    return;
  }
  ctx.print([[`${title}  ${list.length} 个`, "gold"]]);
  for (const instance of list) {
    const selected = instance.id === ctx.cache.selectedInstanceId;
    ctx.print([
      [selected ? "  › " : "  · ", selected ? "green" : "dark_gray"],
      [instance.name || instance.id, selected ? "white" : "gray"],
      [`  ${instance.loader || "?"} · ${instance.minecraft || "?"} · ${instance.mods ?? 0} 模组`, "dark_gray"],
      instance.updates ? [`  ${instance.updates} 更新`, "yellow"] : ["", "dark_gray"],
      ["  ", "gray"],
      [selected ? "" : "选择", "aqua", { click: selected ? "" : `/select ${instance.id}` }],
    ]);
  }
}

function statusDot(status) {
  if (status === "running") return "●";
  if (status === "paused") return "❙❙";
  if (status === "failed" || status === "cancelled") return "✖";
  return "○";
}

function statusColor(status) {
  if (status === "running") return "green";
  if (status === "paused") return "yellow";
  if (status === "failed" || status === "cancelled") return "red";
  return "dark_gray";
}

function formatCount(value) {
  if (!value) return "";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M 次下载`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k 次下载`;
  return `${value} 次下载`;
}

function formatBytes(value) {
  if (!value) return "";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${value} B`;
}

/** 把 Minecraft 文本组件 JSON 转成我们的 segment 数组。 */
export function mcTextToSegments(component) {
  const segments = [];
  const walk = (node, inherited = {}) => {
    if (node === null || node === undefined) return;
    if (typeof node === "string") {
      segments.push([node, inherited.color || "white", inherited]);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child, inherited);
      return;
    }
    const style = {
      ...inherited,
      color: node.color || inherited.color,
      bold: Boolean(node.bold ?? inherited.bold),
      click: node.clickEvent?.value || inherited.click,
    };
    if (node.text !== undefined) segments.push([String(node.text), style.color || "white", style]);
    if (node.translate) segments.push([String(node.translate), style.color || "white", style]);
    for (const key of ["extra", "with"]) if (node[key]) walk(node[key], style);
    if (Array.isArray(node)) walk(node, style);
  };
  walk(component);
  return segments.length ? segments : [["（空文本组件）", "dark_gray"]];
}

export { ALL_METHODS, CATALOG, argHints };
