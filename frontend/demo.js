// 浏览器里的演示后端。
//
// 这个前端包的目标是「在启动器里真的能操作」，但作者（和玩家）第一次打开时
// 很可能只是想看看效果。没有内核时，这里用一份内存数据顶替 IPC：
// 只读方法返回正经形状的 DTO，写入方法真的改内存状态，做到「/select 完了
// /launch 用的是新实例」这种连贯感。
//
// 真正需要操作系统能力的方法（打开目录、文件选择框、改窗口大小）会抛
// UNSUPPORTED，界面会红字告诉你「这是演示模式」。

import { KERNEL_METHODS } from "./methods.js";

const LATENCY = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function unsupported(method) {
  const error = new Error(`演示后端不支持 ${method}（需要启动器内核）`);
  error.code = "UNSUPPORTED";
  error.method = method;
  return error;
}

const now = () => new Date().toISOString().replace("T", " ").slice(0, 16);

const state = {
  revision: 12,
  selectedInstanceId: "survival-1.21.1",
  activeAccountId: "acc_steve",
  activeFrontend: "mcugl.cmdfront",
  instances: [
    {
      id: "survival-1.21.1",
      name: "生存 · 1.21.1",
      displayName: "生存",
      loader: "fabric",
      minecraft: "1.21.1",
      mods: 42,
      updates: 2,
      isPlaceholder: false,
    },
    {
      id: "create-1.20.1",
      name: "机械动力 · 1.20.1",
      displayName: "Create 整合包",
      loader: "forge",
      minecraft: "1.20.1",
      mods: 118,
      updates: 0,
      isPlaceholder: false,
    },
    {
      id: "pvp-1.8.9",
      name: "PVP · 1.8.9",
      displayName: "PVP 竞技",
      loader: "vanilla",
      minecraft: "1.8.9",
      mods: 0,
      updates: 0,
      isPlaceholder: false,
    },
    {
      id: "skyblock-1.20.4",
      name: "空岛生存 · 1.20.4",
      displayName: "空岛",
      loader: "neoforge",
      minecraft: "1.20.4",
      mods: 63,
      updates: 5,
      isPlaceholder: false,
    },
    {
      id: "rtx-1.21.4",
      name: "光追演示 · 1.21.4",
      displayName: "光追演示",
      loader: "fabric",
      minecraft: "1.21.4",
      mods: 12,
      updates: 0,
      isPlaceholder: false,
    },
    {
      id: "uninstalled-1.21.1",
      name: "未安装 · 1.21.1",
      displayName: "空实例",
      loader: "vanilla",
      minecraft: "1.21.1",
      mods: 0,
      updates: 0,
      isPlaceholder: true,
    },
  ],
  accounts: [
    { id: "acc_steve", kind: "microsoft", player: "Steve", status: "active" },
    { id: "acc_alex", kind: "offline", player: "Alex", status: "ok" },
  ],
  servers: [
    { id: "srv_hypixel", name: "Hypixel", address: "mc.hypixel.net", instanceId: "pvp-1.8.9" },
    { id: "srv_2b2t", name: "2b2t", address: "2b2t.org", instanceId: null },
    { id: "srv_local", name: "本机测试", address: "127.0.0.1:25565", instanceId: "survival-1.21.1" },
  ],
  mods: {
    "survival-1.21.1": [
      { id: "sodium", name: "Sodium", file: "sodium-fabric-0.6.9.jar", version: "0.6.9", enabled: true, path: "mods/sodium-fabric-0.6.9.jar", size: 912034 },
      { id: "iris", name: "Iris Shaders", file: "iris-fabric-1.8.1.jar", version: "1.8.1", enabled: true, path: "mods/iris-fabric-1.8.1.jar", size: 1288342 },
      { id: "lithium", name: "Lithium", file: "lithium-fabric-0.14.3.jar", version: "0.14.3", enabled: true, path: "mods/lithium-fabric-0.14.3.jar", size: 612034 },
      { id: "fabric-api", name: "Fabric API", file: "fabric-api-0.115.1.jar", version: "0.115.1", enabled: true, path: "mods/fabric-api-0.115.1.jar", size: 2109342 },
      { id: "old-jade", name: "Jade", file: "jade-11.13.1.jar", version: "11.13.1", enabled: false, path: "mods/jade-11.13.1.jar", size: 402034 },
    ],
    "create-1.20.1": [
      { id: "create", name: "Create", file: "create-1.20.1-6.0.4.jar", version: "6.0.4", enabled: true, path: "mods/create-1.20.1-6.0.4.jar", size: 4200342 },
      { id: "jei", name: "Just Enough Items", file: "jei-1.20.1-forge-15.20.0.106.jar", version: "15.20.0.106", enabled: true, path: "mods/jei-1.20.1-forge-15.20.0.106.jar", size: 1200342 },
      { id: "flywheel", name: "Flywheel", file: "flywheel-forge-1.20.1-1.0.4.jar", version: "1.0.4", enabled: true, path: "mods/flywheel-forge-1.20.1-1.0.4.jar", size: 820342 },
    ],
  },
  tasks: [
    {
      id: "task_sodium",
      name: "更新 Sodium 0.6.9 → 0.6.13",
      kind: "content",
      instanceId: "survival-1.21.1",
      status: "running",
      phase: "下载中",
      progress: { completed: 3, total: 5, unit: "个" },
      allowedActions: ["cancel"],
      error: null,
      result: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "task_loader",
      name: "安装 NeoForge 21.1.80",
      kind: "install",
      instanceId: "skyblock-1.20.4",
      status: "paused",
      phase: "等待中",
      progress: { completed: 1, total: 4, unit: "步" },
      allowedActions: ["pause", "cancel"],
      error: null,
      result: null,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  sessions: [
    {
      sessionId: "sess_42",
      instanceId: "survival-1.21.1",
      accountId: "acc_steve",
      status: "running",
      pid: 18932,
      exitCode: null,
      error: null,
    },
  ],
  backups: [
    { id: "bk_20261120", created: "2026-11-20 21:04", worlds: ["world", "world_nether", "world_the_end"] },
    { id: "bk_20261112", created: "2026-11-12 19:31", worlds: ["world"] },
  ],
  bookmarks: [
    { id: "modrinth:sodium", kind: "mod", name: "Sodium", description: "渲染优化，帧数起飞", author: "jellysquid3" },
    { id: "curseforge:create", kind: "mod", name: "Create", description: "机械动力", author: "simibubi" },
  ],
  frontends: [
    { identifier: "mcugl.official", name: "官方界面", version: "0.22.3", active: false },
    { identifier: "mcugl.cmdfront", name: "MCUGL 命令终端", version: "0.1.0", active: true },
  ],
  settings: {
    root: "D:\\Games\\MCUGL",
    gameRoots: ["D:\\Games\\MCUGL", "E:\\MC\\instances"],
    java: "C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\javaw.exe",
    width: 1280,
    height: 720,
    ram: 8192,
    autoMemory: true,
    anonymous: false,
    hasCommunityKey: true,
    hasAdminKey: false,
    skinStation: "https://example.invalid/skin",
    cape: "",
    dataSources: {
      announcements: "https://example.invalid/announcements.json",
      servers: "https://example.invalid/servers.json",
      recommendations: "https://example.invalid/recommendations.json",
      quotes: "https://example.invalid/quotes.json",
    },
    defaultDataSources: {
      announcements: "https://example.invalid/announcements.json",
      servers: "https://example.invalid/servers.json",
      recommendations: "https://example.invalid/recommendations.json",
      quotes: "https://example.invalid/quotes.json",
    },
    customDataSources: {
      announcements: "",
      servers: "",
      recommendations: "",
      quotes: "",
    },
    dataSourceMode: "default",
    autoChinese: true,
  },
  vanilla: [
    { id: "1.21.4", version: "1.21.4", type: "release", releaseTime: "2024-12-03" },
    { id: "1.21.1", version: "1.21.1", type: "release", releaseTime: "2024-08-08" },
    { id: "1.20.4", version: "1.20.4", type: "release", releaseTime: "2023-12-07" },
    { id: "1.20.1", version: "1.20.1", type: "release", releaseTime: "2023-06-12" },
    { id: "1.8.9", version: "1.8.9", type: "release", releaseTime: "2015-12-09" },
    { id: "1.7.10", version: "1.7.10", type: "release", releaseTime: "2014-05-15" },
  ],
  loaders: {
    fabric: ["0.16.9", "0.16.5", "0.15.11"],
    forge: ["47.2.0", "47.1.3", "43.3.5"],
    neoforge: ["21.1.80", "21.1.72", "20.4.237"],
    quilt: ["0.27.0", "0.26.4"],
  },
  searchIndex: [
    { id: "sodium", name: "Sodium", kind: "mod", author: "jellysquid3", description: "现代渲染优化，显著提升帧数", downloads: 42_100_000 },
    { id: "iris", name: "Iris Shaders", kind: "mod", author: "coderbot", description: "光影加载器，兼容 OptiFine 光影包", downloads: 18_400_000 },
    { id: "lithium", name: "Lithium", kind: "mod", author: "jellysquid3", description: "服务端与客户端逻辑优化", downloads: 9_800_000 },
    { id: "create", name: "Create", kind: "mod", author: "simibubi", description: "机械动力：齿轮、传送带与自动化", downloads: 31_200_000 },
    { id: "jei", name: "Just Enough Items", kind: "mod", author: "mezz", description: "物品配方查询", downloads: 58_900_000 },
    { id: "complementary", name: "Complementary Reimagined", kind: "shader", author: "EminGT", description: "风格化光影", downloads: 6_100_000 },
    { id: "essentialsx", name: "EssentialsX", kind: "plugin", author: "EssentialsX", description: "服务端基础指令插件", downloads: 3_400_000 },
  ],
  log: [
    "[19:00:01] [INFO] MCUGL 0.22.3 启动",
    "[19:00:01] [INFO] 内核协议 mcugl.kernel/v1 (api 1.0.0)",
    "[19:00:02] [INFO] 加载前端 mcugl.cmdfront 0.1.0",
    "[19:00:02] [DEMO] 演示后端：写入只存在于内存里",
    "[19:00:03] [INFO] 已扫描到 6 个实例、2 个账号",
  ].join("\n"),
};

/** 演示后端自己也要自增修订号，让写入看起来像真的。 */
function bump() {
  state.revision += 1;
  return state.revision;
}

/**
 * 初始状态的深拷贝。自测里每个用例都调 resetDemo()，
 * 免得「上一条测试切过实例」影响下一条。
 */
const PRISTINE = structuredClone(state);

/** 把演示数据恢复成刚加载时的样子（只给自测与「重开」用）。 */
export function resetDemo() {
  const fresh = structuredClone(PRISTINE);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return state;
}

function snapshot(data) {
  return { epoch: "demo-epoch-1", revision: state.revision, data };
}

function saved(message, entityIds = []) {
  bump();
  return { message, changed: [], entityIds };
}

const findInstance = (id) => state.instances.find((item) => item.id === id);
const findAccount = (id) => state.accounts.find((item) => item.id === id);
const findServer = (id) => state.servers.find((item) => item.id === id);
const modList = (instanceId) => {
  if (!state.mods[instanceId]) state.mods[instanceId] = [];
  return state.mods[instanceId];
};

const handlers = {
  kernel_manifest: () => demoManifest(),

  get_overview: () =>
    snapshot({
      appVersion: "0.22.3-demo",
      selectedInstanceId: state.selectedInstanceId,
      activeAccountId: state.activeAccountId,
    }),

  get_settings: () => snapshot({ ...state.settings }),

  list_accounts: () => snapshot(state.accounts.map((item) => ({ ...item }))),

  list_instances: () => snapshot({ items: state.instances.map((item) => ({ ...item })), versionGroups: versionGroups() }),

  list_all_instances: () =>
    snapshot({
      items: state.instances.map((item) => ({ ...item })),
      versionGroups: versionGroups(),
    }),

  list_instance_mods: ({ instanceId }) => {
    if (!findInstance(instanceId)) throw notFound("实例", instanceId);
    return snapshot(modList(instanceId).map((item) => ({ ...item })));
  },

  list_servers: () => snapshot(state.servers.map((item) => ({ ...item }))),

  list_bookmarks: () => snapshot(state.bookmarks.map((item) => ({ ...item }))),

  select_instance: ({ instanceId }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    state.selectedInstanceId = instance.id;
    return saved(`已切换到实例「${instance.name}」`, [instance.id]);
  },

  launch_game: ({ instanceId, accountId }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    const account = findAccount(accountId);
    if (!account) throw notFound("账号", accountId);
    return startSession(instance, account, "");
  },

  launch_to_server: ({ instanceId, accountId, serverAddress }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    const account = findAccount(accountId);
    if (!account) throw notFound("账号", accountId);
    return startSession(instance, account, serverAddress);
  },

  save_server: ({ name, address, id, instanceId }) => {
    if (!name || !address) throw validation("名称和地址都不能为空");
    if (id) {
      const existing = findServer(id);
      if (!existing) throw notFound("服务器", id);
      Object.assign(existing, { name, address, instanceId: instanceId ?? existing.instanceId });
      return saved(`已更新服务器「${name}」`, [id]);
    }
    const nextId = `srv_${state.servers.length + 1}_${Date.now().toString(36)}`;
    state.servers.push({ id: nextId, name, address, instanceId: instanceId ?? null });
    return saved(`已添加服务器「${name}」`, [nextId]);
  },

  delete_server: ({ id }) => {
    const index = state.servers.findIndex((item) => item.id === id);
    if (index < 0) throw notFound("服务器", id);
    const [removed] = state.servers.splice(index, 1);
    return saved(`已删除服务器「${removed.name}」`, [id]);
  },

  ping_server: ({ address }) => ({
    id: address,
    online: true,
    players: 137 + (address.length % 17) * 41,
    max: 2024,
    ping: 28 + (address.length % 9) * 7,
    motd: "演示服务器 · 其实是内存里的随机数",
    version: "1.21.1",
    error: "",
  }),

  read_avatar: ({ accountId } = {}) => {
    const account = findAccount(accountId || state.activeAccountId) || state.accounts[0];
    return {
      image: "",
      label: account ? account.player.slice(0, 1).toUpperCase() : "?",
      fallback: true,
      account: account ? account.id : "",
      player: account ? account.player : "",
    };
  },

  start_login: ({ provider }) => ({
    authSessionId: "demo-auth-1",
    provider: provider || "microsoft",
    status: "pending",
    message: "演示模式不会真的打开浏览器登录",
  }),

  get_login_session: ({ authSessionId }) => ({
    authSessionId,
    status: "pending",
    profiles: [],
    message: "演示模式：等待一个永远不会到来的授权",
  }),

  select_login_profile: () => saved("演示模式：已选择登录角色（没有真的登录）"),

  cancel_login: () => saved("已取消登录会话"),

  select_account: ({ accountId }) => {
    const account = findAccount(accountId);
    if (!account) throw notFound("账号", accountId);
    state.activeAccountId = account.id;
    return saved(`已切换到账号「${account.player}」`, [account.id]);
  },

  forget_account: ({ accountId }) => {
    const index = state.accounts.findIndex((item) => item.id === accountId);
    if (index < 0) throw notFound("账号", accountId);
    const [removed] = state.accounts.splice(index, 1);
    if (state.activeAccountId === removed.id) {
      state.activeAccountId = state.accounts[0] ? state.accounts[0].id : "";
    }
    return saved(`已移除账号「${removed.player}」`, [accountId]);
  },

  save_settings: ({ patch }) => {
    if (!patch || typeof patch !== "object") throw validation("patch 必须是对象");
    let touched = 0;
    for (const [key, value] of Object.entries(patch)) {
      if (key in state.settings) {
        state.settings[key] = value;
        touched += 1;
      }
    }
    if (!touched) throw validation(`没有可写入的设置项：${Object.keys(patch).join(", ")}`);
    return saved(`已写入 ${touched} 项设置`);
  },

  scan_java: () =>
    snapshot([
      { path: "C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\javaw.exe", major: 21, arch: "x64", vendor: "Adoptium", error: "" },
      { path: "C:\\Program Files\\Java\\jre1.8.0_411\\bin\\javaw.exe", major: 8, arch: "x64", vendor: "Oracle", error: "" },
      { path: "C:\\Program Files\\Zulu\\zulu-17\\bin\\javaw.exe", major: 17, arch: "x64", vendor: "Azul", error: "" },
    ]),

  get_system_info: () =>
    snapshot({
      app: "0.22.3-demo",
      dotnet: "Rust 1.90 / 演示数据",
      webview: navigator.userAgent.includes("Edg/") ? "Edge WebView2" : "浏览器",
      os: navigator.platform || "Windows",
      root: state.settings.root,
      data: "D:\\Games\\MCUGL\\data",
    }),

  read_log: () => snapshot(state.log),

  verify_key: ({ role }) => ({
    role: role || "community",
    ok: role === "community" ? state.settings.hasCommunityKey : state.settings.hasAdminKey,
    message: "演示模式：只报告本地开关状态，不联网校验",
  }),

  list_save_backups: () => snapshot(state.backups.map((item) => ({ ...item }))),

  backup_saves: () => {
    const worlds = ["world", "world_nether", "world_the_end"];
    const id = `bk_${Date.now().toString(36)}`;
    state.backups.unshift({ id, created: now(), worlds: [...worlds] });
    return saved(`已备份 ${worlds.length} 个世界：${worlds.join(", ")}`, [id]);
  },

  restore_save: ({ id, world }) => {
    const backup = state.backups.find((item) => item.id === id);
    if (!backup) throw notFound("备份", id);
    if (!backup.worlds.includes(world)) throw notFound("备份里的世界", world);
    return saved(`已从 ${backup.created} 的备份还原「${world}」`, [id]);
  },

  list_tasks: () => snapshot(state.tasks.map((item) => ({ ...item }))),

  task_action: ({ id, action }) => {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) throw notFound("任务", id);
    if (!["cancel", "pause", "resume"].includes(action)) throw validation(`未知操作：${action}`);
    if (task.allowedActions && !task.allowedActions.includes(action)) {
      throw validation(`任务「${task.name}」当前不允许 ${action}`);
    }
    if (action === "pause") task.status = "paused";
    if (action === "resume") task.status = "running";
    if (action === "cancel") task.status = "cancelled";
    task.updatedAt = now();
    const label = { cancel: "取消", pause: "暂停", resume: "继续" }[action];
    return saved(`已${label}任务「${task.name}」`, [id]);
  },

  list_game_sessions: () => snapshot(state.sessions.map((item) => ({ ...item }))),

  stop_game: ({ sessionId }) => {
    const session = state.sessions.find((item) => item.sessionId === sessionId);
    if (!session) throw notFound("游戏会话", sessionId);
    session.status = "stopped";
    return saved(`已结束会话 ${sessionId}`, [sessionId]);
  },

  search_content: ({ query, category }) => {
    const q = String(query || "").toLowerCase();
    const kind = category === "shader" ? "shader" : category === "plugin" ? "plugin" : "mod";
    const items = state.searchIndex
      .filter((item) => item.kind === kind)
      .filter((item) => !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    return snapshot({ items, total: items.length, query, category: kind });
  },

  list_content_versions: ({ id }) => {
    const seed = state.searchIndex.find((item) => item.id === id);
    const versions = ["1.21.4", "1.21.1", "1.20.4"].map((game, index) => ({
      id: `${id}-${game}`,
      name: seed ? seed.name : id,
      version: `${1 + index}.0.${index}`,
      game,
      loader: "fabric",
      downloads: 120000 - index * 21000,
      published: `2025-0${index + 1}-1${index}`,
    }));
    return snapshot(versions);
  },

  queue_content_version: ({ versionId }) => saved(`已把 ${versionId} 加入安装队列（演示：不会真的下载）`),

  toggle_bookmark: ({ id, name, kind, author, description }) => {
    const index = state.bookmarks.findIndex((item) => item.id === id);
    if (index >= 0) {
      state.bookmarks.splice(index, 1);
      return saved(`已取消收藏「${name || id}」`, [id]);
    }
    state.bookmarks.unshift({ id, kind: kind || "mod", name: name || id, description: description || "", author: author || "" });
    return saved(`已收藏「${name || id}」`, [id]);
  },

  list_vanilla_versions: () => snapshot(state.vanilla.map((item) => ({ ...item }))),

  install_vanilla: ({ minecraftVersion }) => {
    const exists = state.instances.find((item) => item.minecraft === minecraftVersion && item.loader === "vanilla");
    if (!exists) {
      state.instances.push({
        id: `vanilla-${minecraftVersion}`,
        name: `原版 ${minecraftVersion}`,
        displayName: `原版 ${minecraftVersion}`,
        loader: "vanilla",
        minecraft: minecraftVersion,
        mods: 0,
        updates: 0,
        isPlaceholder: false,
      });
    }
    return saved(`已排队安装原版 ${minecraftVersion}（演示：任务不会完成）`);
  },

  list_loaders: ({ minecraftVersion, loader }) => {
    const wanted = loader || "fabric";
    const versions = state.loaders[wanted] || [];
    return snapshot({ minecraftVersion, loader: wanted, versions: versions.map((value) => ({ version: value, recommended: value === versions[0] })) });
  },

  install_loader: ({ minecraftVersion, loader, loaderVersion }) => {
    const known = state.loaders[loader] || [];
    if (!known.includes(loaderVersion)) throw validation(`${loader} 没有版本 ${loaderVersion}`);
    const id = `${loader}-${minecraftVersion}`;
    if (!state.instances.find((item) => item.id === id)) {
      state.instances.push({
        id,
        name: `${loader} ${minecraftVersion}`,
        displayName: `${loader} ${minecraftVersion}`,
        loader,
        minecraft: minecraftVersion,
        mods: 0,
        updates: 0,
        isPlaceholder: false,
      });
    }
    return saved(`已排队安装 ${loader} ${loaderVersion}（MC ${minecraftVersion}）`);
  },

  preview_pack: ({ path }) => ({
    planId: "plan-pack-1",
    targetId: "pack-preview",
    targetRevision: state.revision,
    expiresAt: now(),
    name: String(path || "").split(/[\\/]/).pop() || "整合包",
    root: path || "",
    game: "1.20.1",
    loader: "forge",
  }),

  confirm_pack: ({ planId }) => saved(`已导入整合包（计划 ${planId}，演示：不落盘）`),

  preview_uninstall: ({ instanceId }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    return {
      planId: "plan-uninstall-1",
      targetId: instance.id,
      targetRevision: state.revision,
      expiresAt: now(),
      name: instance.name,
      notice: "演示模式：不会删除任何文件，只展示卸载预览的形状。",
      paths: ["mods", "config", "saves", "实例目录"],
      shared: false,
    };
  },

  apply_uninstall: ({ planId }) => {
    if (planId !== "plan-uninstall-1") throw validation("计划已过期，请重新执行预览");
    return saved("已按计划卸载（演示：文件还在）");
  },

  clone_instance: ({ instanceId, displayName }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    const id = `${instance.id}-copy-${state.instances.length}`;
    state.instances.push({ ...instance, id, name: displayName || `${instance.name} 副本`, displayName: displayName || `${instance.displayName} 副本`, isPlaceholder: false });
    return saved(`已克隆为「${displayName}」`, [id]);
  },

  export_instance: ({ instanceId, path }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    return saved(`已导出「${instance.name}」到 ${path || "(未指定路径)"}（演示：没有文件产生）`);
  },

  check_updates: ({ instanceId }) => {
    const instance = findInstance(instanceId);
    if (!instance) throw notFound("实例", instanceId);
    const items = modList(instanceId)
      .slice(0, instance.updates || 0)
      .map((mod) => ({
        id: mod.id,
        name: mod.name,
        before: mod.version,
        after: `${mod.version}+1`,
        available: true,
        error: "",
      }));
    return snapshot({ checkId: `check-${instanceId}`, minecraftVersion: instance.minecraft, items });
  },

  preview_updates: ({ checkId, projects }) => ({
    planId: `plan-upd-${checkId}`,
    targetId: checkId,
    targetRevision: state.revision,
    expiresAt: now(),
    minecraftVersion: "1.21.1",
    bytes: 12_582_912,
    changes: (projects && projects.length ? projects : ["sodium"]).map((project) => ({
      project,
      before: "0.6.5",
      after: "0.6.9",
      path: `mods/${project}.jar`,
      oldPath: `mods/${project}.jar`,
    })),
  }),

  apply_updates: ({ planId }) => saved(`已应用更新计划 ${planId}（演示）`),

  toggle_mod: ({ instanceId, modId, enabled }) => {
    if (!findInstance(instanceId)) throw notFound("实例", instanceId);
    const mod = modList(instanceId).find((item) => item.id === modId || item.name === modId);
    if (!mod) throw notFound("模组", modId);
    mod.enabled = Boolean(enabled);
    return saved(`${mod.enabled ? "已启用" : "已禁用"}模组「${mod.name}」`, [mod.id]);
  },

  delete_mod: ({ instanceId, modId }) => {
    if (!findInstance(instanceId)) throw notFound("实例", instanceId);
    const list = modList(instanceId);
    const index = list.findIndex((item) => item.id === modId || item.name === modId);
    if (index < 0) throw notFound("模组", modId);
    const [removed] = list.splice(index, 1);
    return saved(`已删除「${removed.name}」的文件（演示：删的是内存）`, [modId]);
  },

  read_launch_options: ({ instanceId }) => {
    if (!findInstance(instanceId)) throw notFound("实例", instanceId);
    return {
      token: `launch-token-${instanceId}`,
      settings: { width: 1280, height: 720, ram: 8192, extraJvm: "", extraGame: "" },
      inherit: true,
      displayName: findInstance(instanceId).displayName,
    };
  },

  save_launch_options: () => saved("已保存实例启动设置（演示）"),

  get_community: () =>
    snapshot({
      announcements: [
        { title: "MCUGL 0.22.3 已发布", body: "内核协议 mcugl.kernel/v1 冻结，第三方前端可以直接调用。" },
        { title: "命令终端前端", body: "你现在看到的就是它：一个只会用斜杠和 Tab 的世界。" },
      ],
      recommendations: state.searchIndex.slice(0, 3).map((item) => ({ name: item.name, description: item.description, kind: item.kind })),
    }),

  refresh_community: () => saved("已刷新社区数据（演示：还是那两条公告）"),

  save_recommendations: ({ items }) => saved(`已保存 ${Array.isArray(items) ? items.length : 0} 个推荐位（演示）`),

  remove_game_root: () => {
    throw unsupported("remove_game_root");
  },

  save_custom_sources: () => {
    throw unsupported("save_custom_sources");
  },

  use_data_sources: ({ mode }) => {
    if (!["default", "custom"].includes(mode)) throw validation(`未知数据源模式：${mode}`);
    state.settings.dataSourceMode = mode;
    return saved(`数据源模式已切换为 ${mode === "custom" ? "自定义" : "默认"}`);
  },

  test_data_source: ({ name, url }) => ({
    name: name || "自定义源",
    url,
    ok: true,
    message: "演示模式：假装连通",
    ms: 24 + (String(url).length % 30),
  }),

  reset_window: () => {
    throw unsupported("reset_window");
  },

  open_folder: () => {
    throw unsupported("open_folder");
  },

  pick_file: () => {
    throw unsupported("pick_file");
  },

  pick_folder: () => {
    throw unsupported("pick_folder");
  },

  set_offline_skin: () => {
    throw unsupported("set_offline_skin");
  },

  list_frontends: () => snapshot(state.frontends.map((item) => ({ ...item, active: item.identifier === state.activeFrontend }))),

  install_frontend: ({ path }) => {
    const file = String(path || "").split(/[\\/]/).pop() || "frontend.mcuglf";
    const identifier = `local.${file.replace(/\.mcuglf$/i, "").replace(/[^A-Za-z0-9._-]/g, "-")}`;
    if (!state.frontends.find((item) => item.identifier === identifier)) {
      state.frontends.push({ identifier, name: file, version: "0.0.0", active: false });
    }
    return saved(`已导入前端包 ${file}（演示：没有真的安装）`, [identifier]);
  },

  use_frontend: ({ identifier }) => {
    if (identifier && !state.frontends.find((item) => item.identifier === identifier)) {
      throw notFound("前端", identifier);
    }
    state.activeFrontend = identifier || "mcugl.official";
    return saved(`已切换前端为 ${identifier || "官方界面"}（重启前端后生效）`);
  },

  remove_frontend: ({ identifier }) => {
    const index = state.frontends.findIndex((item) => item.identifier === identifier);
    if (index < 0) throw notFound("前端", identifier);
    state.frontends.splice(index, 1);
    return saved(`已移除前端 ${identifier}`, [identifier]);
  },
};

function versionGroups() {
  const groups = new Map();
  for (const instance of state.instances) {
    const key = instance.minecraft;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name: instance.name, meta: instance.loader });
  }
  return [...groups.entries()].map(([label, versions]) => ({ label, count: versions.length, versions }));
}

function startSession(instance, account, serverAddress) {
  const sessionId = `sess_${state.sessions.length + 43}`;
  const taskId = `task_${Date.now().toString(36)}`;
  state.sessions.push({
    sessionId,
    instanceId: instance.id,
    accountId: account.id,
    status: "starting",
    pid: null,
    exitCode: null,
    error: null,
  });
  state.tasks.unshift({
    id: taskId,
    name: `启动 ${instance.name}${serverAddress ? ` → ${serverAddress}` : ""}`,
    kind: "launch",
    instanceId: instance.id,
    status: "running",
    phase: "启动中",
    progress: { completed: 0, total: 3, unit: "步" },
    allowedActions: ["cancel"],
    error: null,
    result: null,
    createdAt: now(),
    updatedAt: now(),
  });
  return { sessionId, taskId };
}

function notFound(kind, id) {
  const error = new Error(`${kind}不存在：${id}`);
  error.code = "NOT_FOUND";
  return error;
}

function validation(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}

/** `/about` 和 `/api` 用的内核自描述。 */
export function demoManifest() {
  const capabilities = {};
  for (const method of KERNEL_METHODS) capabilities[method] = Object.prototype.hasOwnProperty.call(handlers, method);
  return {
    protocol: "mcugl.kernel/v1",
    apiVersion: "1.0.0",
    appVersion: "0.22.3-demo",
    backend: { kind: "demo", writable: false, notice: "浏览器演示数据，不会改动任何文件" },
    methods: [...KERNEL_METHODS],
    capabilities,
    frontend: { mode: "demo", entry: "index.html", directory: "(browser preview)" },
    transport: "demo",
  };
}

/** 供界面显示“演示模式”用。 */
export { state as demoState };

/**
 * 演示版 invoke。
 * @param {string} method
 * @param {Record<string, unknown>} args
 */
export async function demoInvoke(method, args = {}) {
  await sleep(LATENCY);
  const handler = handlers[method];
  if (!handler) throw unsupported(method);
  return handler(args || {});
}
