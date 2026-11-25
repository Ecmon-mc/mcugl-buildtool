// 内核方法清单与参数目录。
//
// 这份数据有三个用途：
//   1. `/api` 打印完整方法表（前端跑在浏览器里也能看到内核提供了什么）；
//   2. `/kernel <方法>` 的 Tab 补全与参数提示；
//   3. 打包时的“功能对等门”：pack.mjs 要求前端文本里出现全部方法名，
//      这个数组就是那个静态来源（见 scripts/kernel-methods.json）。
//
// 参数名沿用内核的 snake_case，真正调用时由 camelKey() 转成 camelCase。

export const KERNEL_METHODS = [
  "get_overview",
  "get_settings",
  "list_accounts",
  "list_instances",
  "list_all_instances",
  "list_instance_mods",
  "list_servers",
  "list_bookmarks",
  "select_instance",
  "launch_game",
  "launch_to_server",
  "save_server",
  "delete_server",
  "ping_server",
  "read_avatar",
  "start_login",
  "get_login_session",
  "select_login_profile",
  "cancel_login",
  "select_account",
  "forget_account",
  "set_offline_skin",
  "save_settings",
  "remove_game_root",
  "scan_java",
  "save_custom_sources",
  "use_data_sources",
  "test_data_source",
  "reset_window",
  "open_folder",
  "read_log",
  "get_system_info",
  "verify_key",
  "pick_file",
  "pick_folder",
  "list_save_backups",
  "backup_saves",
  "restore_save",
  "list_tasks",
  "task_action",
  "list_game_sessions",
  "stop_game",
  "search_content",
  "list_content_versions",
  "queue_content_version",
  "toggle_bookmark",
  "list_vanilla_versions",
  "install_vanilla",
  "list_loaders",
  "install_loader",
  "preview_pack",
  "confirm_pack",
  "preview_uninstall",
  "apply_uninstall",
  "clone_instance",
  "export_instance",
  "check_updates",
  "preview_updates",
  "apply_updates",
  "toggle_mod",
  "delete_mod",
  "read_launch_options",
  "save_launch_options",
  "get_community",
  "refresh_community",
  "save_recommendations",
];

// 宿主命令和内核方法走同一条 invoke 通道，但不在 kernel_manifest.methods 里。
export const HOST_METHODS = [
  "list_frontends",
  "install_frontend",
  "use_frontend",
  "remove_frontend",
];

/** 参数的四种形状。 */
const str = (n, h = "") => ({ n, h, t: "str" });
const int = (n, h = "") => ({ n, h, t: "int" });
const bool = (n, h = "") => ({ n, h, t: "bool" });
const json = (n, h = "") => ({ n, h, t: "json" });
const enm = (n, h, values) => ({ n, h, t: "enum", values });
const opt = (spec) => ({ ...spec, opt: true });

/** 方法目录，顺序与 kernel.rs 的 METHODS 一致。 */
export const CATALOG = [
  { m: "get_overview", g: "状态", h: "应用版本、当前实例与账号" },
  { m: "get_settings", g: "状态", h: "读取设置与修订号" },
  {
    m: "list_accounts",
    g: "账号",
    h: "账号列表",
  },
  { m: "list_instances", g: "实例", h: "实例目录（含版本分组）" },
  { m: "list_all_instances", g: "实例", h: "扫描磁盘上的全部实例" },
  {
    m: "list_instance_mods",
    g: "实例",
    h: "实例的模组列表",
    a: [str("instance_id", "实例标识")],
  },
  { m: "list_servers", g: "启动", h: "收藏的服务器" },
  { m: "list_bookmarks", g: "内容", h: "收藏的内容" },
  {
    m: "select_instance",
    g: "实例",
    h: "切换当前实例",
    a: [str("instance_id", "实例标识")],
  },
  {
    m: "launch_game",
    g: "启动",
    h: "启动游戏",
    a: [str("instance_id", "实例标识"), str("account_id", "账号标识")],
  },
  {
    m: "launch_to_server",
    g: "启动",
    h: "直连服务器启动",
    a: [
      str("instance_id", "实例标识"),
      str("account_id", "账号标识"),
      str("server_address", "服务器地址"),
    ],
  },
  {
    m: "save_server",
    g: "启动",
    h: "新增或修改服务器收藏",
    a: [
      str("name", "名称"),
      str("address", "地址"),
      opt(str("id", "标识，留空为新建")),
      opt(str("instance_id", "绑定实例")),
    ],
  },
  { m: "delete_server", g: "启动", h: "删除服务器收藏", a: [str("id", "标识")] },
  { m: "ping_server", g: "启动", h: "测试服务器延迟", a: [str("address", "地址")] },
  { m: "read_avatar", g: "账号", h: "读取头像", a: [opt(str("account_id", "账号标识"))] },
  {
    m: "start_login",
    g: "账号",
    h: "开始登录",
    a: [
      enm("provider", "登录方式", ["microsoft"]),
      opt(str("account", "账号")),
      opt(str("password", "密码")),
    ],
  },
  {
    m: "get_login_session",
    g: "账号",
    h: "查询登录会话",
    a: [str("auth_session_id", "会话标识")],
  },
  {
    m: "select_login_profile",
    g: "账号",
    h: "选择登录角色",
    a: [str("auth_session_id", "会话标识"), str("profile_id", "角色标识")],
  },
  {
    m: "cancel_login",
    g: "账号",
    h: "取消登录",
    a: [str("auth_session_id", "会话标识")],
  },
  { m: "select_account", g: "账号", h: "切换当前账号", a: [str("account_id", "账号标识")] },
  { m: "forget_account", g: "账号", h: "移除账号", a: [str("account_id", "账号标识")] },
  { m: "set_offline_skin", g: "账号", h: "设置离线皮肤", a: [str("path", "皮肤文件路径")] },
  {
    m: "save_settings",
    g: "设置",
    h: "保存设置补丁",
    a: [json("patch", "设置补丁"), int("expected_revision", "期望修订号")],
  },
  {
    m: "remove_game_root",
    g: "设置",
    h: "移除游戏目录",
    a: [str("root", "目录"), int("expected_revision", "期望修订号")],
  },
  { m: "scan_java", g: "实例", h: "扫描已安装的 Java" },
  {
    m: "save_custom_sources",
    g: "设置",
    h: "保存自定义数据源",
    a: [
      json("sources", "数据源集合"),
      bool("activate", "保存后启用"),
      int("expected_revision", "期望修订号"),
    ],
  },
  {
    m: "use_data_sources",
    g: "设置",
    h: "切换数据源模式",
    a: [enm("mode", "模式", ["default", "custom"]), int("expected_revision", "期望修订号")],
  },
  {
    m: "test_data_source",
    g: "设置",
    h: "测试数据源连通性",
    a: [str("name", "名称"), str("url", "地址")],
  },
  { m: "reset_window", g: "状态", h: "重置窗口大小与位置" },
  {
    m: "open_folder",
    g: "状态",
    h: "在文件管理器里打开目录",
    a: [enm("kind", "目录", ["game", "instance", "log"])],
  },
  { m: "read_log", g: "状态", h: "读取启动器日志" },
  { m: "get_system_info", g: "状态", h: "系统与运行时信息" },
  {
    m: "verify_key",
    g: "状态",
    h: "校验社区 / 管理密钥",
    a: [str("role", "角色"), str("key", "密钥")],
  },
  {
    m: "pick_file",
    g: "状态",
    h: "打开文件选择框",
    a: [opt(str("title", "标题")), opt(str("default_directory", "起始目录"))],
  },
  {
    m: "pick_folder",
    g: "状态",
    h: "打开目录选择框",
    a: [opt(str("title", "标题")), opt(str("default_directory", "起始目录"))],
  },
  { m: "list_save_backups", g: "任务", h: "存档备份列表" },
  { m: "backup_saves", g: "任务", h: "备份所有存档" },
  {
    m: "restore_save",
    g: "任务",
    h: "还原存档",
    a: [str("id", "备份标识"), str("world", "世界名")],
  },
  { m: "list_tasks", g: "任务", h: "任务列表" },
  {
    m: "task_action",
    g: "任务",
    h: "暂停 / 继续 / 取消任务",
    a: [str("id", "任务标识"), enm("action", "操作", ["cancel", "pause", "resume"])],
  },
  { m: "list_game_sessions", g: "任务", h: "游戏运行会话" },
  { m: "stop_game", g: "任务", h: "结束游戏会话", a: [str("session_id", "会话标识")] },
  {
    m: "search_content",
    g: "内容",
    h: "搜索模组 / 插件 / 光影",
    a: [
      enm("category", "类别", ["mod", "plugin", "shader"]),
      str("query", "关键词"),
      opt(str("game", "游戏版本")),
      opt(str("loader", "加载器")),
    ],
  },
  {
    m: "list_content_versions",
    g: "内容",
    h: "列出内容可安装版本",
    a: [
      str("id", "项目标识"),
      opt(str("request_id", "请求标识")),
      opt(str("game", "游戏版本")),
      opt(str("loader", "加载器")),
      opt(enm("category", "类别", ["mod", "plugin", "shader"])),
      opt(str("instance_id", "实例标识")),
    ],
  },
  {
    m: "queue_content_version",
    g: "内容",
    h: "把某个版本加入安装队列",
    a: [
      str("token", "计划令牌"),
      str("version_id", "版本标识"),
      opt(str("mode", "安装模式")),
      opt(str("path", "目标路径")),
    ],
  },
  {
    m: "toggle_bookmark",
    g: "内容",
    h: "收藏 / 取消收藏内容",
    a: [
      str("id", "项目标识"),
      str("name", "名称"),
      opt(str("description", "描述")),
      opt(str("kind", "类别")),
      opt(str("author", "作者")),
    ],
  },
  { m: "list_vanilla_versions", g: "内容", h: "可安装的原版版本" },
  {
    m: "install_vanilla",
    g: "内容",
    h: "安装原版实例",
    a: [str("minecraft_version", "游戏版本")],
  },
  {
    m: "list_loaders",
    g: "内容",
    h: "列出可用加载器",
    a: [str("minecraft_version", "游戏版本"), opt(str("loader", "加载器"))],
  },
  {
    m: "install_loader",
    g: "内容",
    h: "安装加载器",
    a: [
      str("minecraft_version", "游戏版本"),
      enm("loader", "加载器", ["fabric", "forge", "neoforge", "quilt"]),
      str("loader_version", "加载器版本"),
    ],
  },
  { m: "preview_pack", g: "内容", h: "预览整合包", a: [str("path", "整合包路径")] },
  {
    m: "confirm_pack",
    g: "内容",
    h: "确认导入整合包",
    a: [str("plan_id", "计划标识"), str("name", "名称"), str("directory", "目录")],
  },
  {
    m: "preview_uninstall",
    g: "实例",
    h: "预览卸载实例影响",
    a: [str("instance_id", "实例标识")],
  },
  { m: "apply_uninstall", g: "实例", h: "执行卸载", a: [str("plan_id", "计划标识")] },
  {
    m: "clone_instance",
    g: "实例",
    h: "克隆实例",
    a: [
      str("instance_id", "实例标识"),
      str("display_name", "新名称"),
      opt(bool("saves", "包含存档")),
      opt(bool("servers", "包含服务器")),
    ],
  },
  {
    m: "export_instance",
    g: "实例",
    h: "导出实例为整合包",
    a: [
      str("instance_id", "实例标识"),
      str("path", "目标路径"),
      opt(bool("servers", "包含服务器")),
      opt(bool("saves", "包含存档")),
    ],
  },
  { m: "check_updates", g: "内容", h: "检查内容更新", a: [str("instance_id", "实例标识")] },
  {
    m: "preview_updates",
    g: "内容",
    h: "生成更新预览",
    a: [str("check_id", "检查标识"), opt(json("projects", "项目标识数组"))],
  },
  { m: "apply_updates", g: "内容", h: "执行更新", a: [str("plan_id", "计划标识")] },
  {
    m: "toggle_mod",
    g: "内容",
    h: "启用 / 禁用模组",
    a: [
      str("instance_id", "实例标识"),
      str("mod_id", "模组标识"),
      bool("enabled", "是否启用"),
    ],
  },
  {
    m: "delete_mod",
    g: "内容",
    h: "删除模组文件",
    a: [str("instance_id", "实例标识"), str("mod_id", "模组标识")],
  },
  {
    m: "read_launch_options",
    g: "实例",
    h: "读取实例启动设置",
    a: [str("instance_id", "实例标识"), opt(str("request_id", "请求标识"))],
  },
  {
    m: "save_launch_options",
    g: "实例",
    h: "保存实例启动设置",
    a: [
      str("token", "令牌"),
      str("instance_id", "实例标识"),
      str("display_name", "显示名"),
      json("settings", "启动设置"),
      bool("inherit", "恢复继承"),
    ],
  },
  { m: "get_community", g: "内容", h: "社区页数据" },
  { m: "refresh_community", g: "内容", h: "刷新社区数据" },
  {
    m: "save_recommendations",
    g: "内容",
    h: "保存推荐位",
    a: [json("items", "推荐项数组")],
  },
  // 宿主命令（同一个 invoke 通道）
  { m: "list_frontends", g: "前端", h: "已安装的前端包", host: true },
  {
    m: "install_frontend",
    g: "前端",
    h: "导入前端包",
    host: true,
    a: [str("path", "包路径")],
  },
  {
    m: "use_frontend",
    g: "前端",
    h: "切换前端（null 为官方）",
    host: true,
    a: [opt(str("identifier", "标识")), int("expected_revision", "期望修订号")],
  },
  {
    m: "remove_frontend",
    g: "前端",
    h: "移除前端包",
    host: true,
    a: [str("identifier", "标识"), opt(str("version", "版本")), int("expected_revision", "期望修订号")],
  },
];

/** 分组顺序（用于 /help 与 /api 的标题）。 */
export const GROUP_ORDER = ["状态", "实例", "账号", "启动", "内容", "任务", "设置", "前端"];

const BY_METHOD = new Map(CATALOG.map((entry) => [entry.m, entry]));

/** 查目录条目；未知方法返回 undefined。 */
export function catalogEntry(method) {
  return BY_METHOD.get(method);
}

/** snake_case → camelCase（内核参数对象的字段名）。 */
export function camelKey(name) {
  return name.replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());
}

/** 把参数目录转成补全 / 提示用的形状。 */
export function argHints(entry) {
  if (!entry || !entry.a) return [];
  return entry.a.map((spec) => ({
    key: camelKey(spec.n),
    snake: spec.n,
    hint: spec.h,
    type: spec.t,
    values: spec.values,
    optional: Boolean(spec.opt),
  }));
}

/** 目录条目的用法字符串，例如 `/kernel toggle_mod instanceId modId enabled`。 */
export function exampleArgs(entry) {
  if (!entry || !entry.a) return "";
  return entry.a
    .map((spec) => `<${camelKey(spec.n)}>`)
    .join(" ");
}

/** 递归把对象的 snake_case 键转成 camelCase（`/kernel` 手工输入时容错）。 */
export function camelizeDeep(value) {
  if (Array.isArray(value)) return value.map(camelizeDeep);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) out[camelKey(key)] = camelizeDeep(val);
  return out;
}

/** 全部可调用方法名（内核 + 宿主）。 */
export const ALL_METHODS = [...KERNEL_METHODS, ...HOST_METHODS];
