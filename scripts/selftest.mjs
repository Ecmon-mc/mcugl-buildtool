// 纯 Node 自测：不需要浏览器、不需要启动器。
//
// 思路是把 app.js 里的 ctx 用演示后端重新拼一份（只是没有 DOM），
// 然后直接驱动命令层：解析、补全、执行、错误处理。
//
// 运行：node scripts/selftest.mjs

import {
  COMMANDS,
  COMMAND_GROUPS,
  UsageError,
  complete,
  execute,
  findCommand,
  tokenize,
} from "../frontend/commands.js";
import { demoInvoke, demoManifest, demoState, resetDemo } from "../frontend/demo.js";
import {
  ALL_METHODS,
  CATALOG,
  GROUP_ORDER,
  HOST_METHODS,
  KERNEL_METHODS,
  camelKey,
  camelizeDeep,
  catalogEntry,
  exampleArgs,
} from "../frontend/methods.js";
import { unwrap } from "../frontend/kernel.js";
import { jsonText } from "../frontend/jsonview.js";

const results = [];
let failed = 0;

function check(name, fn) {
  results.push([name, fn]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "断言失败");
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message || "值不相等"}\n  实际：${a}\n  期望：${b}`);
}

function flatten(segments) {
  if (typeof segments === "string") return segments;
  if (!Array.isArray(segments)) return String(segments);
  return segments
    .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? "") : String(segment ?? "")))
    .join("");
}

function makeWorld() {
  resetDemo();
  const cache = {
    manifest: null,
    instances: [],
    accounts: [],
    servers: [],
    tasks: [],
    mods: new Map(),
    backups: [],
    frontends: [],
    vanilla: [],
    selectedInstanceId: null,
    activeAccountId: null,
  };
  const state = {
    raw: false,
    sound: true,
    gui: 2,
    unicode: false,
    time: "day",
    weather: "clear",
    gamemode: "survival",
    seed: "",
  };
  const lines = [];
  const segments = [];
  const uiCalls = [];
  const achievements = [];
  const chats = [];

  const ui = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        return (...args) => {
          uiCalls.push([String(prop), ...args]);
        };
      },
    },
  );

  const ctx = {
    mode: "demo",
    cache,
    state,
    ui,
    version: { frontend: "0.1.0" },

    async invoke(method, args = {}, options = {}) {
      const result = await demoInvoke(method, args);
      if (state.raw && !options.silentRaw) {
        lines.push(`↳ ${method}`);
        lines.push(jsonText(result));
      }
      return result;
    },

    async manifest() {
      if (!cache.manifest) cache.manifest = await demoManifest();
      return cache.manifest;
    },

    refresh: () => refreshWorld(cache),

    print(value) {
      segments.push(value);
      lines.push(flatten(value));
    },

    printRaw(text) {
      lines.push(String(text));
    },

    printJson(value, options = {}) {
      lines.push(jsonText(value, options));
    },

    ok(message) {
      lines.push(`[ok] ${message}`);
    },

    warn(message) {
      lines.push(`[warn] ${message}`);
    },

    error(message, hint = "") {
      lines.push(`[error] ${message}${hint ? ` ${hint}` : ""}`);
    },

    chat(text) {
      chats.push(text);
    },

    clear() {
      lines.length = 0;
    },

    achievement(id, title) {
      achievements.push([id, title]);
      return true;
    },
  };

  Object.defineProperty(ctx, "playerName", {
    get() {
      const account =
        cache.accounts.find((item) => item.id === cache.activeAccountId) || cache.accounts[0];
      return (account && account.player) || "Steve";
    },
  });

  return { ctx, cache, state, lines, segments, uiCalls, achievements, chats };
}

const LIST_METHODS = {
  instances: "list_all_instances",
  accounts: "list_accounts",
  servers: "list_servers",
  tasks: "list_tasks",
  backups: "list_save_backups",
  frontends: "list_frontends",
};

async function refreshWorld(cache) {
  const keys = Object.keys(LIST_METHODS);
  const settled = await Promise.allSettled([
    demoInvoke("get_overview", {}),
    ...keys.map((key) => demoInvoke(LIST_METHODS[key], {})),
  ]);
  const overview = settled[0];
  if (overview.status === "fulfilled") {
    const data = unwrap(overview.value) || {};
    if ("selectedInstanceId" in data) cache.selectedInstanceId = data.selectedInstanceId ?? null;
    if ("activeAccountId" in data) cache.activeAccountId = data.activeAccountId ?? null;
  }
  keys.forEach((key, index) => {
    const result = settled[index + 1];
    if (result.status !== "fulfilled") return;
    const data = unwrap(result.value);
    if (Array.isArray(data)) cache[key] = data;
    else if (data && Array.isArray(data.items)) cache[key] = data.items;
  });
}

function joined(lines) {
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 目录与参数转换
// ---------------------------------------------------------------------------

check("方法目录：66 个内核方法 + 4 个宿主方法，全部有目录条目", () => {
  assertEqual(KERNEL_METHODS.length, 66, "内核方法数量应为 66");
  assertEqual(HOST_METHODS.length, 4, "宿主方法数量应为 4");
  assertEqual(ALL_METHODS.length, 70, "方法总数应为 70");
  assertEqual(CATALOG.length, 70, "CATALOG 应覆盖全部 70 个方法");
  assertEqual(CATALOG.filter((entry) => entry.host).length, 4, "宿主方法应标记 host");
  for (const method of ALL_METHODS) {
    const entry = catalogEntry(method);
    assert(entry, `缺少目录条目：${method}`);
    assert(entry.h, `${method} 缺少说明`);
    assert(entry.g, `${method} 缺少分组`);
    for (const spec of entry.a || []) {
      assert(spec.n, `${method} 的参数缺少名字`);
      assert(spec.h, `${method} 的参数缺少提示`);
    }
  }
  for (const group of GROUP_ORDER) {
    assert(CATALOG.some((entry) => entry.g === group), `分组 ${group} 没有任何方法`);
  }
});

check("camelKey / camelizeDeep 把 snake_case 转成内核接受的 camelCase", () => {
  assertEqual(camelKey("instance_id"), "instanceId");
  assertEqual(camelKey("expected_revision"), "expectedRevision");
  assertEqual(camelKey("display_name"), "displayName");
  assertEqual(camelKey("plain"), "plain");
  assertEqual(
    camelizeDeep({ instance_id: "a", plan: { target_revision: 3 }, list: [{ mod_id: 1 }] }),
    { instanceId: "a", plan: { targetRevision: 3 }, list: [{ modId: 1 }] },
  );
});

check("exampleArgs 用 camelCase 展示参数名", () => {
  const entry = catalogEntry("toggle_mod");
  assertEqual(exampleArgs(entry), "<instanceId> <modId> <enabled>");
});

check("manifest 报告协议与能力表", async () => {
  const m = await demoManifest();
  assertEqual(m.protocol, "mcugl.kernel/v1");
  assertEqual(m.apiVersion, "1.0.0");
  assertEqual(m.methods.length, 66);
  assert(m.capabilities && typeof m.capabilities === "object", "manifest 缺少 capabilities");
});

// ---------------------------------------------------------------------------
// 分词
// ---------------------------------------------------------------------------

check("tokenize：普通参数", () => {
  const tokens = tokenize("/select create-1.20.1");
  assertEqual(tokens.map((token) => token.value), ["/select", "create-1.20.1"]);
});

check("tokenize：引号与转义", () => {
  const tokens = tokenize('/server add "My Server" 1.2.3.4:25565');
  assertEqual(tokens.map((token) => token.value), ["/server", "add", "My Server", "1.2.3.4:25565"]);
  assert(tokens[2].quoted, "带空格的参数应标记 quoted");

  const escaped = tokenize('/say "he said \\"hi\\" to me"');
  assertEqual(escaped[1].value, 'he said "hi" to me');
});

check("tokenize：多余空白不会产生空 token", () => {
  assertEqual(tokenize("   /help    ").map((token) => token.value), ["/help"]);
  assertEqual(tokenize("").length, 0);
});

// ---------------------------------------------------------------------------
// 补全
// ---------------------------------------------------------------------------

check("补全：输入 / 列出全部命令", async () => {
  const { ctx } = makeWorld();
  const result = complete("/", ctx);
  assertEqual(result.items.length, COMMANDS.length);
  assertEqual(result.base, "");
  assertEqual(result.typed, "/");
  for (const item of result.items) {
    assert(item.value.startsWith("/"), `命令候选应带斜杠：${item.value}`);
    assertEqual(item.space, true);
  }
});

check("补全：/ 的候选无重复且一条不缺（候选栏靠滚动看全）", async () => {
  const { ctx } = makeWorld();
  const values = complete("/", ctx).items.map((item) => item.value);
  assertEqual(new Set(values).size, values.length, "候选不应重复");
  for (const command of COMMANDS) {
    assert(values.includes(`/${command.name}`), `缺少命令候选：/${command.name}`);
  }
});

check("补全：命令名过滤且大小写不敏感", async () => {
  const { ctx } = makeWorld();
  const result = complete("/St", ctx);
  assert(result.items.some((item) => item.value === "/status"), "应包含 /status");
  assertEqual(result.base, "");
  for (const item of result.items) {
    assert(item.value.toLowerCase().startsWith("/st"), `候选不符合前缀：${item.value}`);
  }
});

check("补全：子命令按字母序", async () => {
  const { ctx } = makeWorld();
  const result = complete("/server ", ctx);
  assertEqual(result.items.map((item) => item.value), ["add", "list", "ping", "remove"]);
  assertEqual(result.base, "/server ");
  assertEqual(result.hint.includes("/server"), true);
});

check("补全：实例 id 来自刷新后的缓存", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  const result = complete("/select ", ctx);
  assert(result.items.length >= 6, "应列出全部实例");
  assert(result.items.some((item) => item.value === "survival-1.21.1"));
  const typed = complete("/select survival", ctx);
  assertEqual(typed.typed, "survival");
  assertEqual(typed.base, "/select ");
  assert(typed.items.every((item) => item.value.startsWith("survival")));
});

check("补全：服务器名与地址", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  const names = complete("/join ", ctx);
  assert(names.items.some((item) => item.value === "Hypixel" && item.hint === "mc.hypixel.net"));
  const addresses = complete("/server ping ", ctx);
  assert(addresses.items.some((item) => item.value === "2b2t.org"));
});

check("补全：模组需要先 /mods 填缓存", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  cache.selectedInstanceId = "survival-1.21.1";
  assertEqual(complete("/mod toggle ", ctx).items.length, 0);
  await execute("/mods", ctx);
  const result = complete("/mod toggle ", ctx);
  assert(result.items.some((item) => item.value === "sodium"));
  assert(result.items.some((item) => item.hint.includes("Jade")));
});

check("补全：内核方法名可用于 /kernel", async () => {
  const { ctx } = makeWorld();
  const result = complete("/kernel get_o", ctx);
  assert(result.items.some((item) => item.value === "get_overview"));
  assert(result.items.every((item) => item.value.startsWith("get_o")));
});

check("补全：/help 后补命令名", async () => {
  const { ctx } = makeWorld();
  const result = complete("/help sel", ctx);
  assert(result.items.some((item) => item.value === "select"));
});

check("补全：不以 / 开头时不打扰", async () => {
  const { ctx } = makeWorld();
  assertEqual(complete("hello", ctx).items.length, 0);
  assertEqual(complete("", ctx).items.length, 0);
});

check("补全的应用结果可以直接执行（拼出合法命令行）", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  const result = complete("/select ", ctx);
  const item = result.items.find((candidate) => candidate.value === "pvp-1.8.9");
  assert(item, "没有找到 pvp-1.8.9");
  const text = result.base + item.value + (item.space ? " " : "");
  assertEqual(text, "/select pvp-1.8.9");
  await execute(text, ctx);
  assertEqual(demoState.selectedInstanceId, "pvp-1.8.9");
});

// ---------------------------------------------------------------------------
// 执行与错误
// ---------------------------------------------------------------------------

check("未知命令抛 UsageError 并提示 /help", async () => {
  const { ctx } = makeWorld();
  let error = null;
  try {
    await execute("/nope", ctx);
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof UsageError, "应抛 UsageError");
  assert(error.message.includes("/nope"), "错误信息应包含命令名");
  assert(error.usage.includes("/help"), "应提示 /help");
});

check("缺参数 / 参数不合法都抛 UsageError", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  for (const line of ["/select", "/server add only-name", "/gui 9", "/unicode maybe"]) {
    let error = null;
    try {
      await execute(line, ctx);
    } catch (caught) {
      error = caught;
    }
    assert(error instanceof UsageError, `${line} 应抛 UsageError`);
    assert(error.usage && error.usage.startsWith("/"), `${line} 的错误应带用法`);
  }
});

check("执行 /status 输出概览", async () => {
  const { ctx, lines } = makeWorld();
  await execute("/status", ctx);
  const text = joined(lines);
  assert(text.includes("MCUGL"), "应显示 MCUGL");
  assert(text.includes("当前实例"), "应显示当前实例");
  assert(text.includes("当前账号"), "应显示当前账号");
});

check("执行 /help 输出全部分组与命令", async () => {
  const { ctx, lines } = makeWorld();
  await execute("/help", ctx);
  const text = joined(lines);
  assertEqual(COMMAND_GROUPS.length, 10, "命令分组应为内核 8 组 + 界面 + 整活");
  for (const group of COMMAND_GROUPS) {
    assert(text.includes(`— ${group} —`), `帮助缺少分组：${group}`);
  }
  for (const name of ["select", "launch", "server", "gamemode", "frontend", "help"]) {
    assert(text.includes(`/${name}`), `帮助缺少命令：/${name}`);
  }
});

check("执行 /select 真的切换演示实例", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  await execute("/select skyblock-1.20.4", ctx);
  assertEqual(demoState.selectedInstanceId, "skyblock-1.20.4");
  assertEqual(cache.selectedInstanceId, "skyblock-1.20.4");
});

check("执行 /server add 写入演示服务器", async () => {
  const { ctx, cache, lines } = makeWorld();
  await refreshWorld(cache);
  await execute('/server add "自测服务器" 127.0.0.1:25599', ctx);
  assert(demoState.servers.some((item) => item.name === "自测服务器"), "服务器没有写进演示后端");
  assert(cache.servers.some((item) => item.name === "自测服务器"), "缓存没有刷新");
  assert(joined(lines).includes("[ok]"), "应输出成功信息");
});

check("执行 /launch 走 select_instance 之后的实例与账号", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  const before = demoState.sessions.length;
  await execute("/launch", ctx);
  assertEqual(demoState.sessions.length, before + 1, "应创建一个会话");
  const session = demoState.sessions[demoState.sessions.length - 1];
  assert(session.instanceId, "会话缺少实例");
  assert(session.accountId, "会话缺少账号");
});

check("执行 /join 名称时解析成地址并直连", async () => {
  const { ctx, cache, achievements } = makeWorld();
  await refreshWorld(cache);
  await execute("/join Hypixel", ctx);
  const task = demoState.tasks[0];
  assert(task.name.includes("mc.hypixel.net"), `任务名应带服务器地址：${task.name}`);
  assertEqual(cache.activeAccountId, demoState.activeAccountId);
  assert(
    achievements.some(([id]) => id === "join"),
    "第一次直连应解锁成就",
  );
});

check("执行 /mod toggle 改演示模组状态", async () => {
  const { ctx, cache } = makeWorld();
  await refreshWorld(cache);
  await execute("/mods", ctx);
  await execute("/mod toggle sodium off", ctx);
  const mod = demoState.mods["survival-1.21.1"].find((item) => item.id === "sodium");
  assertEqual(mod.enabled, false, "sodium 应被禁用");
});

check("执行 /raw on 后自动附加 JSON 结构", async () => {
  const { ctx, state, lines } = makeWorld();
  await refreshWorld(ctx.cache);
  await execute("/raw on", ctx);
  assertEqual(state.raw, true);
  await execute("/mods", ctx);
  const text = joined(lines);
  assert(text.includes("↳ list_instance_mods"), "应标明调用了哪个方法");
  assert(text.includes("epoch:"), "应输出解析后的 JSON 字段");
  assert(text.includes("revision:"), "应输出解析后的 JSON 字段");
  assert(!text.includes("{\n  "), "不应再输出原始 JSON 文本");
  await execute("/raw off", ctx);
  assertEqual(state.raw, false);
});

check("执行 /kernel 手工调用并计时", async () => {
  const { ctx, lines } = makeWorld();
  await execute('/kernel get_overview {"instance_id":"x"}', ctx);
  const text = joined(lines);
  assert(text.includes("get_overview"), "应显示方法名");
  assert(text.includes("ms"), "应显示耗时");
  assert(
    text.includes("selectedInstanceId:") || text.includes("activeAccountId:"),
    "应把结果 JSON 展开成字段",
  );
  assert(!text.includes('"selectedInstanceId"'), "不应还是原始 JSON 文本");
  assert(text.includes('"instanceId":"x"'), "snake_case 参数应被转成 camelCase");
});

check("执行 /api 列出 70 个方法并标记宿主命令", async () => {
  const { ctx, lines } = makeWorld();
  await execute("/api", ctx);
  const text = joined(lines);
  assert(text.includes("get_overview"));
  assert(text.includes("remove_frontend"));
  assert(text.includes("宿主命令"), "应区分宿主方法");
  assert(text.includes("共 70 个方法"), "应统计全部方法");
});

check("执行 /sound、/weather、/gamemode 驱动界面", async () => {
  const { ctx, state, uiCalls } = makeWorld();
  await execute("/sound off", ctx);
  assertEqual(state.sound, false);
  await execute("/weather rain", ctx);
  assertEqual(state.weather, "rain");
  assert(uiCalls.some(([name, value]) => name === "setWeather" && value === "rain"));
  await execute("/gamemode creative", ctx);
  assertEqual(state.gamemode, "creative");
  assert(uiCalls.some(([name, value]) => name === "setGamemode" && value === "creative"));
});

check("执行 /unicode true|false 切换字体优先级", async () => {
  const { ctx, state, uiCalls } = makeWorld();
  await execute("/unicode true", ctx);
  assertEqual(state.unicode, true);
  assert(uiCalls.some(([name, value]) => name === "setUnicode" && value === true));
  await execute("/unicode false", ctx);
  assertEqual(state.unicode, false);
  assert(uiCalls.some(([name, value]) => name === "setUnicode" && value === false));
});

check("补全：/unicode 只给 true / false", async () => {
  const { ctx } = makeWorld();
  const values = complete("/unicode ", ctx).items.map((item) => item.value);
  assertEqual(values, ["false", "true"]);
  assertEqual(complete("/unicode t", ctx).items.map((item) => item.value), ["true"]);
});

check("执行 /explode 触发震屏、音效与死亡界面", async () => {
  const { ctx, uiCalls } = makeWorld();
  await execute("/explode", ctx);
  const names = uiCalls.map(([name]) => name);
  assert(names.includes("shake"), "应震屏");
  assert(names.includes("die"), "应打开死亡界面");
  assert(uiCalls.some(([name, value]) => name === "sound" && value === "boom"));
});

check("执行 /say 交给聊天渲染（app.js 负责加名字）", async () => {
  const { ctx, chats, lines } = makeWorld();
  await refreshWorld(ctx.cache);
  await execute("/say 你好，世界", ctx);
  assertEqual(chats, ["你好，世界"]);
  assertEqual(lines.length, 0, "/say 不该额外打印");

  await execute("/me 打了个哈欠", ctx);
  assert(joined(lines).includes("Steve"), "第三人称动作应带当前账号名");
  assert(joined(lines).includes("打了个哈欠"));
});

check("非命令输入走聊天", async () => {
  const { ctx, chats, lines } = makeWorld();
  await execute("just chatting", ctx);
  assertEqual(chats, ["just chatting"]);
  assertEqual(lines.length, 0, "聊天不该产生命令输出");
});

check("执行器忽略纯空白", async () => {
  const { ctx } = makeWorld();
  const result = await execute("   ", ctx);
  assertEqual(result.kind, "empty");
});

check("每条命令都有说明、分组和至少一条路由", () => {
  const names = new Set();
  for (const command of COMMANDS) {
    assert(!names.has(command.name), `命令重名：${command.name}`);
    names.add(command.name);
    assert(command.desc, `${command.name} 缺少说明`);
    assert(COMMAND_GROUPS.includes(command.group), `${command.name} 的分组未知：${command.group}`);
    assert(command.routes.length > 0, `${command.name} 没有路由`);
    for (const route of command.routes) {
      for (const literal of route.path || []) {
        assertEqual(literal, literal.toLowerCase(), `子命令应小写：${command.name} ${literal}`);
        assert(!literal.includes("/"), `子命令不应带斜杠：${literal}`);
      }
    }
    assert(findCommand(command.name) === command, `findCommand 找不到 ${command.name}`);
  }
  assert(names.size === COMMANDS.length);
});

// ---------------------------------------------------------------------------
// JSON 树
// ---------------------------------------------------------------------------

check("JSON 树：对象换行、字符串带引号、数字/布尔上色", () => {
  const see = jsonText({ name: "生存", mods: 12, ok: true, empty: null });
  assert(see.includes("对象 · 4 字段"), "应有对象标题");
  assert(see.includes('name: "生存"'), "字符串应带引号");
  assert(see.includes("mods: 12"), "数字应原样显示");
  assert(see.includes("ok: true"), "布尔应原样显示");
  assert(see.includes("empty: null"), "null 应原样显示");
});

check("JSON 树：短基本类型数组合并成一行", () => {
  const see = jsonText([1, 2, 3]);
  assert(see.includes("[1, 2, 3]"), "短数组应压成一行");
});

check("JSON 树：长数组折叠并给出剩余数量", () => {
  const see = jsonText(Array.from({ length: 30 }, (_, i) => ({ id: i })));
  assert(see.includes("数组 · 30 项"), "应显示总项数");
  assert(see.includes("… 还有 6 项"), "超出 24 项后应折叠");
});

check("JSON 树：嵌套数组/对象与超长字符串不抛错", () => {
  const value = {
    list: [
      { id: "a", tags: ["x", "y"] },
      { id: "b", tags: [] },
    ],
    text: "长".repeat(400),
  };
  const see = jsonText(value);
  assert(see.includes("[2 项]"), "数组应换行展开");
  assert(see.includes('id: "a"'), "数组内的对象字段应显示");
  assert(see.includes("…"), "超长字符串应截断");
});

check("补全：/kernel 后的 base 以空格结尾（候选不会粘连）", () => {
  const { ctx } = makeWorld();
  const result = complete("/kernel ", ctx);
  assertEqual(result.base, "/kernel ", "base 应保留命令后的空格");
  assert(result.items.some((item) => item.value === "get_overview"));
});

// ---------------------------------------------------------------------------
// 跑
// ---------------------------------------------------------------------------

console.log("MCUGL 命令终端 · 自测\n");

for (const [name, fn] of results) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    const detail = (error && error.stack) || String(error);
    console.error(
      detail
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n"),
    );
  }
}

console.log(`\n${results.length - failed} / ${results.length} 通过`);
if (failed) {
  console.error(`\n${failed} 项失败`);
  process.exitCode = 1;
} else {
  console.log("全部通过。");
}
