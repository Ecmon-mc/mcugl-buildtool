// 启动与输入控制：把命令层（commands.js）、界面层（ui.js）和内核桥接接起来。
//
// 这里的核心是“Minecraft 式”的输入行为：
// - 输入 "/" 立刻在输入框上方列出候选
// - Tab / Shift+Tab 在候选之间循环，每按一次把候选填进输入框
// - 回车执行，↑↓ 翻历史，Esc 关闭候选或打开暂停菜单

import { complete, execute, UsageError } from "./commands.js";
import { Console } from "./ui.js";
import { jsonLines } from "./jsonview.js";
import { KERNEL_AVAILABLE, MODE, invoke, manifest as kernelManifest, unwrap } from "./kernel.js";

const VERSION = "0.2.1";
const HISTORY_LIMIT = 120;
const DEBUG_INTERVAL = 400;

const ui = new Console();
const input = document.getElementById("cmd");
const debugBox = document.getElementById("debug");

let frontendVersion = VERSION;

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
  commands: 0,
  chats: 0,
};

// ---------------------------------------------------------------------------
// ctx：命令层唯一拿到的“世界”
// ---------------------------------------------------------------------------

const ctx = {
  mode: MODE,
  cache,
  state,
  ui,
  version: { frontend: frontendVersion },

  async invoke(method, args = {}, options = {}) {
    const result = await invoke(method, args);
    if (state.raw && !options.silentRaw) {
      ui.append([[`↳ ${method}`, "dark_gray"]]);
      this.printJson(result);
    }
    return result;
  },

  async manifest() {
    if (!cache.manifest) cache.manifest = await kernelManifest();
    return cache.manifest;
  },

  refresh,

  print(segments) {
    ui.append(segments);
  },

  printRaw(text) {
    ui.printRaw(text);
  },

  printJson(value, options = {}) {
    for (const segments of jsonLines(value, options)) ui.append(segments);
  },

  ok(message) {
    ui.ok(message);
  },

  warn(message) {
    ui.warn(message);
  },

  error(message, hint = "") {
    ui.error(message, hint);
  },

  chat(text) {
    state.chats += 1;
    ui.playerChat(ctx.playerName, text);
    ui.sound("click");
  },

  clear() {
    ui.clear();
  },

  achievement(id, title, subtitle) {
    return ui.achievement(id, title, subtitle);
  },
};

Object.defineProperty(ctx, "playerName", {
  enumerable: true,
  get() {
    const account =
      cache.accounts.find((item) => item.id === cache.activeAccountId) || cache.accounts[0];
    return (account && (account.player || account.name)) || "Steve";
  },
});

ui.attach(ctx);
ui.getScore = () => state.commands;

// ---------------------------------------------------------------------------
// cache 刷新
// ---------------------------------------------------------------------------

const LIST_METHODS = {
  instances: "list_all_instances",
  accounts: "list_accounts",
  servers: "list_servers",
  tasks: "list_tasks",
  backups: "list_save_backups",
  frontends: "list_frontends",
};

async function refresh() {
  const keys = Object.keys(LIST_METHODS);
  const settled = await Promise.allSettled([
    invoke("get_overview", {}),
    ...keys.map((key) => invoke(LIST_METHODS[key], {})),
  ]);

  const overview = settled[0];
  if (overview.status === "fulfilled") {
    const data = unwrap(overview.value) || {};
    if ("selectedInstanceId" in data) cache.selectedInstanceId = data.selectedInstanceId ?? null;
    if ("activeAccountId" in data) cache.activeAccountId = data.activeAccountId ?? null;
    if (data.appVersion) {
      cache.manifest = { ...(cache.manifest || {}), appVersion: data.appVersion };
    }
  }

  keys.forEach((key, index) => {
    const result = settled[index + 1];
    if (result.status !== "fulfilled") return;
    const data = unwrap(result.value);
    if (Array.isArray(data)) cache[key] = data;
    else if (data && Array.isArray(data.items)) cache[key] = data.items;
  });

  if (!cache.accounts.length) {
    // 演示数据或极端情况下没有账号列表，名字回退到设置里的 player 字段
    const settings = cache.manifest && cache.manifest.player;
    if (settings) cache.accounts = [{ id: "local", player: settings, kind: "offline" }];
  }
}

async function loadVanillaVersions() {
  try {
    const list = unwrap(await invoke("list_vanilla_versions", {})) || [];
    cache.vanilla = Array.isArray(list) ? list : list.items || [];
  } catch {
    cache.vanilla = [];
  }
}

// ---------------------------------------------------------------------------
// 提交与错误
// ---------------------------------------------------------------------------

function reportError(error) {
  if (error instanceof UsageError) {
    ui.error(error.message, error.usage || "");
    return;
  }
  if (error && error.code) {
    const retry = error.retryable ? "（可重试）" : "";
    ui.error(`${error.code}${retry}：${error.message || ""}`);
    return;
  }
  ui.error((error && error.message) || String(error));
}

let busy = false;

async function submit() {
  if (busy) return;
  const raw = input.value;
  const text = raw.trim();
  if (!text) {
    ui.sound("error");
    ui.shakeInput();
    return;
  }

  session = null;
  lastResult = null;
  ui.hideSuggest();
  ui.setHint("");
  ui.setInput("");
  pushHistory(raw);

  const isCommand = text.startsWith("/");
  if (isCommand) {
    state.commands += 1;
    ui.echo(text);
  }

  busy = true;
  try {
    await execute(text, ctx);
    if (isCommand && state.commands === 1) {
      ui.achievement("terminal", "命令行的第一缕阳光", "第一次输入命令");
    }
  } catch (error) {
    reportError(error);
  } finally {
    busy = false;
    ui.focus();
  }
}

function runFromUi(text) {
  ui.setInput(text);
  return submit();
}

// ---------------------------------------------------------------------------
// 补全
// ---------------------------------------------------------------------------

let history = [];
let historyIndex = 0;
let draft = "";
let session = null;
let lastResult = null;

function liveSuggest() {
  session = null;
  if (input.selectionStart !== input.selectionEnd || input.selectionStart !== input.value.length) {
    ui.hideSuggest();
    ui.setHint("");
    lastResult = null;
    return;
  }
  const result = complete(input.value, ctx);
  lastResult = result;
  if (result.items.length) {
    ui.renderSuggest(result, 0);
  } else {
    ui.hideSuggest();
  }
  ui.setHint(result.hint || "");
}

function applySession() {
  if (!session) return;
  const item = session.items[session.index];
  if (!item) return;
  const text = session.base + item.value + (item.space ? " " : "");
  ui.setInput(text);
  ui.sound("tab");

  if (item.space) {
    // 候选自带尾随空格，说明这一段已经补完：立刻换成下一个参数的候选，Tab 可以继续往下补。
    const next = complete(text, ctx);
    lastResult = next;
    if (next.items.length) {
      session = { base: next.base, typed: next.typed, items: next.items, hint: next.hint, index: 0 };
      ui.renderSuggest(next, 0);
    } else {
      session = null;
      ui.hideSuggest();
    }
    ui.setHint(next.hint || "");
    return;
  }

  // 非「补完一段」的候选（实例名、模组名之类）：填进去以后，当前词已经等于整条候选，
  // 预候选必须随之清空——这里要传 item.value，不能沿用上一次的 typed，否则会把刚补上的
  // 词再当成「剩余未输入」画到光标后面（/help debug 会变成 /help debugdebug）。
  ui.renderSuggest(
    { base: session.base, typed: item.value, items: session.items, hint: session.hint },
    session.index,
  );
  ui.setHint(session.hint || "");
  // 只有一个候选时，填完就结束这一轮循环，下次 Tab 直接补下一个参数
  if (session.items.length === 1) {
    session = null;
    lastResult = null;
  }
}

function cycleSuggest(direction) {
  if (session) {
    session.index = (session.index + direction + session.items.length) % session.items.length;
    applySession();
    return;
  }
  const result = complete(input.value, ctx);
  lastResult = result;
  ui.setHint(result.hint || "");
  if (!result.items.length) {
    ui.sound("error");
    ui.shakeInput();
    return;
  }
  session = {
    base: result.base,
    typed: result.typed,
    items: result.items,
    hint: result.hint,
    index: direction > 0 ? 0 : result.items.length - 1,
  };
  applySession();
}

// ---------------------------------------------------------------------------
// 历史
// ---------------------------------------------------------------------------

function pushHistory(raw) {
  if (!raw.trim()) return;
  if (history[history.length - 1] !== raw) history.push(raw);
  while (history.length > HISTORY_LIMIT) history.shift();
  historyIndex = history.length;
  draft = "";
}

function recall(direction) {
  if (!history.length) {
    ui.sound("error");
    return;
  }
  if (historyIndex === history.length && direction < 0) draft = input.value;
  historyIndex = Math.max(0, Math.min(history.length, historyIndex + direction));
  const text = historyIndex >= history.length ? draft : history[historyIndex];
  ui.setInput(text);
  ui.hideSuggest();
  ui.setHint("");
  session = null;
  lastResult = null;
}

// ---------------------------------------------------------------------------
// 键盘
// ---------------------------------------------------------------------------

input.addEventListener("keydown", (event) => {
  if (event.isComposing || event.keyCode === 229) return;

  switch (event.key) {
    case "Enter":
      event.preventDefault();
      submit();
      return;
    case "Tab":
      event.preventDefault();
      cycleSuggest(event.shiftKey ? -1 : 1);
      return;
    case "ArrowUp":
      event.preventDefault();
      if (ui.suggestVisible) cycleSuggest(-1);
      else recall(-1);
      return;
    case "ArrowDown":
      event.preventDefault();
      if (ui.suggestVisible) cycleSuggest(1);
      else recall(1);
      return;
    case "Escape":
      event.preventDefault();
      handleEscape();
      return;
    default:
      break;
  }
});

input.addEventListener("input", () => {
  // 输入法组字过程中不改候选，等 compositionend
  if (input._composing) return;
  liveSuggest();
});

input.addEventListener("compositionstart", () => {
  input._composing = true;
});

input.addEventListener("compositionend", () => {
  input._composing = false;
  liveSuggest();
});

input.addEventListener("blur", () => {
  // 点候选列表时不要立刻消失，交给 click 处理
});

function handleEscape() {
  if (ui.pauseOpen) {
    ui.closePause();
    ui.focus();
    return;
  }
  if (session || ui.suggestVisible) {
    session = null;
    lastResult = null;
    ui.hideSuggest();
    ui.focus();
    return;
  }
  if (!document.getElementById("death").hidden) {
    ui.respawn();
    ui.focus();
    return;
  }
  if (input.value) {
    ui.setInput("");
    ui.hideSuggest();
    ui.setHint("");
    return;
  }
  ui.openPause();
}

window.addEventListener("keydown", (event) => {
  if (event.key === "F3") {
    event.preventDefault();
    ui.toggleDebug();
    updateDebug();
    return;
  }
  if (event.key === "Escape" && ui.pauseOpen) {
    ui.closePause();
    ui.focus();
  }
});

// ---------------------------------------------------------------------------
// 界面回调
// ---------------------------------------------------------------------------

ui.onPickSuggestion = (index) => {
  if (!lastResult || !lastResult.items[index]) return;
  session = {
    base: lastResult.base,
    typed: lastResult.typed,
    items: lastResult.items,
    hint: lastResult.hint,
    index,
  };
  applySession();
  ui.focus();
};

ui.onPickCommand = (value) => {
  if (!value) return;
  ui.setInput(value);
  ui.focus();
  liveSuggest();
  ui.sound("click");
};

ui.onDeathAction = (action) => {
  ui.respawn();
  if (action === "clearlog") ui.clear();
  ui.focus();
};

document.getElementById("pause").addEventListener("click", (event) => {
  const button = event.target.closest("[data-act]");
  if (!button) return;
  const action = button.dataset.act;
  ui.closePause();
  if (action === "resume") {
    ui.focus();
  } else if (action === "help") {
    runFromUi("/help");
  } else if (action === "about") {
    runFromUi("/about");
  }
});

// ---------------------------------------------------------------------------
// F3 调试面板
// ---------------------------------------------------------------------------

function updateDebug() {
  if (!ui.debugVisible) return;
  const lines = [
    `MCUGL 命令终端 v${frontendVersion}  ·  ${MODE === "kernel" ? "内核模式" : "演示模式"}`,
    `实例 ${cache.instances.length} · 账号 ${cache.accounts.length} · 服务器 ${cache.servers.length} · 任务 ${cache.tasks.length}`,
    `已执行命令 ${state.commands} · 聊天 ${state.chats} · 历史 ${history.length}`,
    `时间 ${state.time} · 天气 ${state.weather} · 模式 ${state.gamemode} · GUI ${state.gui}`,
    `候选 ${ui.suggestVisible ? document.querySelectorAll("#suggest .suggest-row").length : 0} · 原始 JSON ${state.raw ? "开" : "关"} · 音效 ${state.sound ? "开" : "关"} · Unicode ${state.unicode ? "优先" : "关"}`,
  ];
  ui.updateDebug(lines.join("\n"));
}

setInterval(updateDebug, DEBUG_INTERVAL);

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

async function readVersion() {
  try {
    const response = await fetch("./frontend.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (data && typeof data.version === "string") frontendVersion = data.version;
  } catch {
    // file:// 直接打开时 fetch 会被拒绝，用内置版本号
  }
}

function printBanner() {
  const app = (cache.manifest && cache.manifest.appVersion) || "?";
  ui.append([
    ["MCUGL ", "gold"],
    ["命令终端", "white"],
    [` v${frontendVersion}`, "gray"],
    ["   ·   ", "dark_gray"],
    [MODE === "kernel" ? "内核模式" : "演示模式", MODE === "kernel" ? "green" : "yellow"],
    [`   ·   启动器 ${app}`, "dark_gray"],
  ]);
}

async function boot() {
  ui.setGamemode(state.gamemode);
  ui.setTime(state.time);
  ui.setWeather(state.weather);
  ui.setGui(state.gui);
  ui.setUnicode(state.unicode);
  ui.focus();

  await readVersion();
  ctx.version.frontend = frontendVersion;

  try {
    await ctx.manifest();
  } catch (error) {
    ui.warn(`读取内核清单失败：${(error && error.message) || error}`);
  }

  await refresh();

  printBanner();
  if (!KERNEL_AVAILABLE) {
    ui.warn("没有检测到 MCUGL 内核，正在使用演示数据（所有写操作只改内存）。");
  }
  ui.printHelpHint();

  try {
    await execute("/status", ctx);
  } catch (error) {
    reportError(error);
  }
  ui.focus();

  // 原版版本列表只用于 /install 的补全，后台悄悄取一次
  loadVanillaVersions();

  applyDevParams();
}

/** 开发辅助：?run=/help&run=/status&type=/ins —— 便于不敲键盘时截图检查。 */
async function applyDevParams() {
  const params = new URLSearchParams(window.location.search);
  for (const line of params.getAll("run")) {
    try {
      ui.echo(line);
      await execute(line, ctx);
    } catch (error) {
      reportError(error);
    }
  }
  const prefill = params.get("type");
  if (prefill) {
    ui.setInput(prefill);
    ui.focus();
    liveSuggest();
  }
  // ?tab=12：连续按 12 次 Tab，方便截图检查「选中行滚进视野 + 上下黑白边」。
  const tabs = Number(params.get("tab"));
  if (Number.isFinite(tabs) && tabs > 0) {
    const input = document.getElementById("cmd");
    for (let index = 0; index < tabs; index += 1) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  // ?scrollSuggest=40：把候选栏预先滚一段，方便截图检查上下「还有内容」的黑白边。
  const scroll = Number(params.get("scrollSuggest"));
  if (Number.isFinite(scroll) && scroll > 0) {
    const panel = document.getElementById("suggest");
    panel.scrollTop = scroll;
    ui.updateSuggestEdges();
  }
}

boot();
