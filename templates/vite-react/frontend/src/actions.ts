// Data-driven catalog of every kernel method (mcugl.kernel/v1) plus the four
// host-side frontend commands. The reference UI renders one card per entry, so
// this file doubles as the checklist a third-party frontend has to cover.

export type SharedKey =
  | "instanceId"
  | "accountId"
  | "serverId"
  | "taskId"
  | "sessionId"
  | "planId"
  | "revision";

export type FieldKind = "text" | "number" | "boolean" | "json";

export interface ActionField {
  /** Argument name sent to the kernel. */
  key: string;
  label: string;
  kind?: FieldKind;
  /** Reuses the value of the shared input bar instead of a local input. */
  bind?: SharedKey;
  placeholder?: string;
  hint?: string;
}

export type GroupId =
  | "status"
  | "instances"
  | "accounts"
  | "launch"
  | "content"
  | "tasks"
  | "settings"
  | "frontends";

export interface Action {
  id: string;
  command: string;
  group: GroupId;
  title: string;
  note?: string;
  /** Host management command: not part of the 66 kernel methods. */
  host?: boolean;
  fields: ActionField[];
}

export const GROUPS: { id: GroupId; label: string; hint: string }[] = [
  { id: "status", label: "概览", hint: "快照、设置、系统信息与通用能力" },
  { id: "instances", label: "实例", hint: "实例、整合包与启动参数" },
  { id: "accounts", label: "账号", hint: "账号目录与登录会话" },
  { id: "launch", label: "启动", hint: "启动游戏、服务器与进程" },
  { id: "content", label: "内容", hint: "搜索、安装、更新与社区" },
  { id: "tasks", label: "任务", hint: "任务队列与存档备份" },
  { id: "settings", label: "设置", hint: "写入配置、数据源与游戏目录" },
  {
    id: "frontends",
    label: "前端",
    hint: "宿主管理接口，不属于 66 个内核方法",
  },
];

const text = (
  key: string,
  label: string,
  placeholder?: string,
  hint?: string,
): ActionField => ({ key, label, placeholder, hint });

const num = (key: string, label: string, placeholder?: string): ActionField => ({
  key,
  label,
  kind: "number",
  placeholder,
});

const json = (key: string, label: string, placeholder?: string): ActionField => ({
  key,
  label,
  kind: "json",
  placeholder,
});

const flag = (key: string, label: string, hint?: string): ActionField => ({
  key,
  label,
  kind: "boolean",
  hint,
});

const bind = (
  bindKey: SharedKey,
  key: string,
  label: string,
  kind: FieldKind = "text",
): ActionField => ({ key, label, kind, bind: bindKey });

const instanceId = (): ActionField =>
  bind("instanceId", "instance_id", "instance_id");
const accountId = (): ActionField => bind("accountId", "account_id", "account_id");
const serverId = (): ActionField => bind("serverId", "id", "id");
const taskId = (): ActionField => bind("taskId", "id", "id");
const sessionId = (): ActionField => bind("sessionId", "session_id", "session_id");
const planId = (): ActionField => bind("planId", "plan_id", "plan_id");
const revision = (): ActionField =>
  bind("revision", "expected_revision", "expected_revision", "number");

export const ACTIONS: Action[] = [
  // ---- status -------------------------------------------------------------
  {
    id: "get_overview",
    command: "get_overview",
    group: "status",
    title: "读取概览",
    fields: [],
  },
  {
    id: "get_settings",
    command: "get_settings",
    group: "status",
    title: "读取设置",
    note: "快照的 revision 就是写入类命令需要的 expected_revision。",
    fields: [],
  },
  {
    id: "read_avatar",
    command: "read_avatar",
    group: "status",
    title: "读取头像",
    fields: [],
  },
  {
    id: "get_system_info",
    command: "get_system_info",
    group: "status",
    title: "读取系统信息",
    note: "数据目录、Java 与平台信息也会出现在这里。",
    fields: [],
  },
  {
    id: "read_log",
    command: "read_log",
    group: "status",
    title: "读取运行日志",
    fields: [],
  },
  {
    id: "verify_key",
    command: "verify_key",
    group: "status",
    title: "校验许可密钥",
    fields: [text("role", "role", "admin"), text("key", "key", "XXXX-XXXX")],
  },
  {
    id: "reset_window",
    command: "reset_window",
    group: "status",
    title: "重置窗口",
    fields: [],
  },
  {
    id: "open_folder",
    command: "open_folder",
    group: "status",
    title: "打开目录",
    fields: [text("kind", "kind", "game / instance / log")],
  },
  {
    id: "pick_file",
    command: "pick_file",
    group: "status",
    title: "选择文件",
    note: "返回绝对路径或 null；路径会出现在结果面板里。",
    fields: [text("title", "title", "选择一个文件"), text("default_directory", "default_directory")],
  },
  {
    id: "pick_folder",
    command: "pick_folder",
    group: "status",
    title: "选择目录",
    fields: [text("title", "title", "选择一个目录"), text("default_directory", "default_directory")],
  },

  // ---- instances ----------------------------------------------------------
  {
    id: "list_instances",
    command: "list_instances",
    group: "instances",
    title: "列出实例",
    fields: [],
  },
  {
    id: "list_all_instances",
    command: "list_all_instances",
    group: "instances",
    title: "列出全部实例（含扫描）",
    fields: [],
  },
  {
    id: "list_instance_mods",
    command: "list_instance_mods",
    group: "instances",
    title: "列出实例模组",
    fields: [instanceId()],
  },
  {
    id: "select_instance",
    command: "select_instance",
    group: "instances",
    title: "选择当前实例",
    fields: [instanceId()],
  },
  {
    id: "scan_java",
    command: "scan_java",
    group: "instances",
    title: "扫描 Java",
    fields: [],
  },
  {
    id: "read_launch_options",
    command: "read_launch_options",
    group: "instances",
    title: "读取启动参数",
    fields: [instanceId(), text("request_id", "request_id")],
  },
  {
    id: "save_launch_options",
    command: "save_launch_options",
    group: "instances",
    title: "保存启动参数",
    note: "settings 是 LaunchSettings 的 JSON；token 来自 read_launch_options。",
    fields: [
      text("token", "token"),
      instanceId(),
      text("display_name", "display_name"),
      json("settings", "settings", '{"memoryMb": 4096}'),
      flag("inherit", "inherit"),
    ],
  },
  {
    id: "clone_instance",
    command: "clone_instance",
    group: "instances",
    title: "克隆实例",
    fields: [instanceId(), text("display_name", "display_name"), flag("saves", "saves"), flag("servers", "servers")],
  },
  {
    id: "export_instance",
    command: "export_instance",
    group: "instances",
    title: "导出实例",
    fields: [instanceId(), text("path", "path", "D:\\exports\\my-instance.zip"), flag("servers", "servers"), flag("saves", "saves")],
  },
  {
    id: "preview_uninstall",
    command: "preview_uninstall",
    group: "instances",
    title: "预览卸载",
    fields: [instanceId()],
  },
  {
    id: "apply_uninstall",
    command: "apply_uninstall",
    group: "instances",
    title: "执行卸载",
    fields: [planId()],
  },

  // ---- accounts -----------------------------------------------------------
  {
    id: "list_accounts",
    command: "list_accounts",
    group: "accounts",
    title: "列出账号",
    fields: [],
  },
  {
    id: "select_account",
    command: "select_account",
    group: "accounts",
    title: "选择当前账号",
    fields: [accountId()],
  },
  {
    id: "forget_account",
    command: "forget_account",
    group: "accounts",
    title: "移除账号",
    fields: [accountId()],
  },
  {
    id: "set_offline_skin",
    command: "set_offline_skin",
    group: "accounts",
    title: "设置离线皮肤",
    note: "先用 pick_file 选一个皮肤文件，再把路径粘到这里。",
    fields: [text("path", "path", "D:\\skins\\steve.png")],
  },
  {
    id: "start_login",
    command: "start_login",
    group: "accounts",
    title: "开始登录",
    fields: [text("provider", "provider", "microsoft"), text("account", "account（可选）"), text("password", "password（可选）")],
  },
  {
    id: "get_login_session",
    command: "get_login_session",
    group: "accounts",
    title: "查询登录会话",
    fields: [text("auth_session_id", "auth_session_id")],
  },
  {
    id: "select_login_profile",
    command: "select_login_profile",
    group: "accounts",
    title: "选择登录档案",
    fields: [text("auth_session_id", "auth_session_id"), text("profile_id", "profile_id")],
  },
  {
    id: "cancel_login",
    command: "cancel_login",
    group: "accounts",
    title: "取消登录",
    fields: [text("auth_session_id", "auth_session_id")],
  },

  // ---- launch -------------------------------------------------------------
  {
    id: "launch_game",
    command: "launch_game",
    group: "launch",
    title: "启动游戏",
    note: "实例与账号要分别填在顶部共享栏。演示后端会返回 UNSUPPORTED。",
    fields: [instanceId(), accountId()],
  },
  {
    id: "launch_to_server",
    command: "launch_to_server",
    group: "launch",
    title: "启动到服务器",
    fields: [instanceId(), accountId(), text("server_address", "server_address", "mc.example.com:25565")],
  },
  {
    id: "list_servers",
    command: "list_servers",
    group: "launch",
    title: "列出服务器",
    fields: [],
  },
  {
    id: "save_server",
    command: "save_server",
    group: "launch",
    title: "保存服务器",
    fields: [
      text("name", "name", "朋友服"),
      text("address", "address", "mc.example.com:25565"),
      text("id", "id（可选，编辑时填）"),
      instanceId(),
    ],
  },
  {
    id: "delete_server",
    command: "delete_server",
    group: "launch",
    title: "删除服务器",
    fields: [serverId()],
  },
  {
    id: "ping_server",
    command: "ping_server",
    group: "launch",
    title: "Ping 服务器",
    fields: [text("address", "address", "mc.example.com:25565")],
  },
  {
    id: "list_game_sessions",
    command: "list_game_sessions",
    group: "launch",
    title: "列出游戏进程",
    fields: [],
  },
  {
    id: "stop_game",
    command: "stop_game",
    group: "launch",
    title: "结束游戏进程",
    fields: [sessionId()],
  },

  // ---- content ------------------------------------------------------------
  {
    id: "search_content",
    command: "search_content",
    group: "content",
    title: "搜索内容",
    fields: [text("category", "category", "mod / plugin / shader"), text("query", "query"), text("game", "game"), text("loader", "loader")],
  },
  {
    id: "list_content_versions",
    command: "list_content_versions",
    group: "content",
    title: "列出可用版本",
    fields: [
      text("id", "id（项目 ID 或搜索 token）"),
      text("request_id", "request_id"),
      text("game", "game"),
      text("loader", "loader"),
      text("category", "category"),
      instanceId(),
    ],
  },
  {
    id: "queue_content_version",
    command: "queue_content_version",
    group: "content",
    title: "加入安装队列",
    fields: [text("token", "token"), text("version_id", "version_id"), text("mode", "mode"), text("path", "path")],
  },
  {
    id: "toggle_bookmark",
    command: "toggle_bookmark",
    group: "content",
    title: "切换收藏",
    fields: [text("id", "id", "project-id"), text("name", "name"), text("description", "description"), text("kind", "kind", "mod"), text("author", "author")],
  },
  {
    id: "list_bookmarks",
    command: "list_bookmarks",
    group: "content",
    title: "列出收藏",
    fields: [],
  },
  {
    id: "list_vanilla_versions",
    command: "list_vanilla_versions",
    group: "content",
    title: "列出原版版本",
    fields: [],
  },
  {
    id: "install_vanilla",
    command: "install_vanilla",
    group: "content",
    title: "安装原版",
    fields: [text("minecraft_version", "minecraft_version", "1.21.1")],
  },
  {
    id: "list_loaders",
    command: "list_loaders",
    group: "content",
    title: "列出加载器版本",
    fields: [text("minecraft_version", "minecraft_version", "1.21.1"), text("loader", "loader", "fabric")],
  },
  {
    id: "install_loader",
    command: "install_loader",
    group: "content",
    title: "安装加载器",
    fields: [text("minecraft_version", "minecraft_version", "1.21.1"), text("loader", "loader", "fabric"), text("loader_version", "loader_version", "0.16.0")],
  },
  {
    id: "preview_pack",
    command: "preview_pack",
    group: "content",
    title: "预览整合包",
    note: "先用 pick_file 选中整合包文件，再把路径粘过来。",
    fields: [text("path", "path", "D:\\packs\\modpack.zip")],
  },
  {
    id: "confirm_pack",
    command: "confirm_pack",
    group: "content",
    title: "确认安装整合包",
    fields: [planId(), text("name", "name"), text("directory", "directory")],
  },
  {
    id: "check_updates",
    command: "check_updates",
    group: "content",
    title: "检查更新",
    fields: [instanceId()],
  },
  {
    id: "preview_updates",
    command: "preview_updates",
    group: "content",
    title: "预览更新",
    fields: [text("check_id", "check_id"), json("projects", "projects", '["project-id"]')],
  },
  {
    id: "apply_updates",
    command: "apply_updates",
    group: "content",
    title: "应用更新",
    fields: [planId()],
  },
  {
    id: "toggle_mod",
    command: "toggle_mod",
    group: "content",
    title: "启用 / 停用模组",
    fields: [instanceId(), text("mod_id", "mod_id", "sodium"), flag("enabled", "enabled")],
  },
  {
    id: "delete_mod",
    command: "delete_mod",
    group: "content",
    title: "删除模组",
    fields: [instanceId(), text("mod_id", "mod_id", "sodium")],
  },
  {
    id: "get_community",
    command: "get_community",
    group: "content",
    title: "读取社区内容",
    fields: [],
  },
  {
    id: "refresh_community",
    command: "refresh_community",
    group: "content",
    title: "刷新社区内容",
    fields: [],
  },
  {
    id: "save_recommendations",
    command: "save_recommendations",
    group: "content",
    title: "保存推荐",
    fields: [json("items", "items", '[{"id": "sodium", "title": "Sodium"}]')],
  },

  // ---- tasks --------------------------------------------------------------
  {
    id: "list_tasks",
    command: "list_tasks",
    group: "tasks",
    title: "列出任务",
    fields: [],
  },
  {
    id: "task_action",
    command: "task_action",
    group: "tasks",
    title: "操作任务",
    fields: [taskId(), text("action", "action", "cancel / pause / resume")],
  },
  {
    id: "list_save_backups",
    command: "list_save_backups",
    group: "tasks",
    title: "列出存档备份",
    fields: [],
  },
  {
    id: "backup_saves",
    command: "backup_saves",
    group: "tasks",
    title: "备份存档",
    fields: [],
  },
  {
    id: "restore_save",
    command: "restore_save",
    group: "tasks",
    title: "恢复存档",
    fields: [text("id", "id"), text("world", "world")],
  },

  // ---- settings -----------------------------------------------------------
  {
    id: "save_settings",
    command: "save_settings",
    group: "settings",
    title: "保存设置",
    note: "patch 是 AppSettingsPatch 的 JSON；revision 用顶部共享栏。",
    fields: [json("patch", "patch", '{"ram": 4096}'), revision()],
  },
  {
    id: "remove_game_root",
    command: "remove_game_root",
    group: "settings",
    title: "移除游戏目录",
    fields: [text("root", "root", "C:\\Users\\me\\AppData\\Roaming\\.minecraft"), revision()],
  },
  {
    id: "save_custom_sources",
    command: "save_custom_sources",
    group: "settings",
    title: "保存自定义数据源",
    fields: [json("sources", "sources", '{"mirrors": []}'), flag("activate", "activate"), revision()],
  },
  {
    id: "use_data_sources",
    command: "use_data_sources",
    group: "settings",
    title: "切换数据源",
    fields: [text("mode", "mode", "default / custom"), revision()],
  },
  {
    id: "test_data_source",
    command: "test_data_source",
    group: "settings",
    title: "测试数据源",
    fields: [text("name", "name", "mirror"), text("url", "url", "https://example.com/api")],
  },

  // ---- frontends (host management) ---------------------------------------
  {
    id: "list_frontends",
    command: "list_frontends",
    group: "frontends",
    title: "列出已安装前端",
    host: true,
    fields: [],
  },
  {
    id: "install_frontend",
    command: "install_frontend",
    group: "frontends",
    title: "安装前端包",
    host: true,
    fields: [text("path", "path", "D:\\frontends\\my-frontend.mcuglf")],
  },
  {
    id: "use_frontend",
    command: "use_frontend",
    group: "frontends",
    title: "切换前端",
    host: true,
    note: "传 null 可切回官方前端（此表单留空即 null）。切换后需要重启启动器。",
    fields: [text("identifier", "identifier", "com.example.frontend"), revision()],
  },
  {
    id: "remove_frontend",
    command: "remove_frontend",
    group: "frontends",
    title: "卸载前端",
    host: true,
    fields: [text("identifier", "identifier", "com.example.frontend"), text("version", "version（可选）"), revision()],
  },
];
