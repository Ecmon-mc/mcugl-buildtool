/**
 * Convenience wrappers for the 66 kernel methods.
 *
 * `kernel.call(...)` remains the single implementation path: these functions do
 * nothing but forward to it, so behavior, validation and error shapes cannot
 * drift. Use whichever reads better at the call site:
 *
 * ```ts
 * await getOverview(kernel);
 * await launchGame(kernel, { instanceId, accountId });
 *
 * // identical to
 * await kernel.call("get_overview");
 * await kernel.call("launch_game", { instanceId, accountId });
 * ```
 */
import type { Kernel } from "./client.js";
import { KERNEL_METHODS, type CommandArgs, type CommandName, type CommandResult } from "./commands.js";

export type KernelCommand = (typeof KERNEL_METHODS)[number];

// --- State / settings -------------------------------------------------------

export const getOverview = (kernel: Kernel) => kernel.call("get_overview");

export const getSettings = (kernel: Kernel) => kernel.call("get_settings");

export const saveSettings = (kernel: Kernel, args: CommandArgs<"save_settings">) =>
  kernel.call("save_settings", args);

export const removeGameRoot = (kernel: Kernel, args: CommandArgs<"remove_game_root">) =>
  kernel.call("remove_game_root", args);

// --- Accounts ---------------------------------------------------------------

export const listAccounts = (kernel: Kernel) => kernel.call("list_accounts");

export const selectAccount = (kernel: Kernel, args: CommandArgs<"select_account">) =>
  kernel.call("select_account", args);

export const forgetAccount = (kernel: Kernel, args: CommandArgs<"forget_account">) =>
  kernel.call("forget_account", args);

export const readAvatar = (kernel: Kernel) => kernel.call("read_avatar");

export const setOfflineSkin = (kernel: Kernel, args: CommandArgs<"set_offline_skin">) =>
  kernel.call("set_offline_skin", args);

export const startLogin = (kernel: Kernel, args: CommandArgs<"start_login">) =>
  kernel.call("start_login", args);

export const getLoginSession = (kernel: Kernel, args: CommandArgs<"get_login_session">) =>
  kernel.call("get_login_session", args);

export const selectLoginProfile = (
  kernel: Kernel,
  args: CommandArgs<"select_login_profile">,
) => kernel.call("select_login_profile", args);

export const cancelLogin = (kernel: Kernel, args: CommandArgs<"cancel_login">) =>
  kernel.call("cancel_login", args);

// --- Instances --------------------------------------------------------------

export const listInstances = (kernel: Kernel) => kernel.call("list_instances");

export const listAllInstances = (kernel: Kernel) => kernel.call("list_all_instances");

export const listInstanceMods = (kernel: Kernel, args: CommandArgs<"list_instance_mods">) =>
  kernel.call("list_instance_mods", args);

export const selectInstance = (kernel: Kernel, args: CommandArgs<"select_instance">) =>
  kernel.call("select_instance", args);

export const cloneInstance = (kernel: Kernel, args: CommandArgs<"clone_instance">) =>
  kernel.call("clone_instance", args);

export const exportInstance = (kernel: Kernel, args: CommandArgs<"export_instance">) =>
  kernel.call("export_instance", args);

// --- Launch -----------------------------------------------------------------

export const launchGame = (kernel: Kernel, args: CommandArgs<"launch_game">) =>
  kernel.call("launch_game", args);

export const launchToServer = (kernel: Kernel, args: CommandArgs<"launch_to_server">) =>
  kernel.call("launch_to_server", args);

export const openFolder = (kernel: Kernel, args: CommandArgs<"open_folder">) =>
  kernel.call("open_folder", args);

export const readLaunchOptions = (kernel: Kernel, args: CommandArgs<"read_launch_options">) =>
  kernel.call("read_launch_options", args);

export const saveLaunchOptions = (
  kernel: Kernel,
  args: CommandArgs<"save_launch_options">,
) => kernel.call("save_launch_options", args);

// --- Servers / bookmarks ----------------------------------------------------

export const listServers = (kernel: Kernel) => kernel.call("list_servers");

export const saveServer = (kernel: Kernel, args: CommandArgs<"save_server">) =>
  kernel.call("save_server", args);

export const deleteServer = (kernel: Kernel, args: CommandArgs<"delete_server">) =>
  kernel.call("delete_server", args);

export const pingServer = (kernel: Kernel, args: CommandArgs<"ping_server">) =>
  kernel.call("ping_server", args);

export const listBookmarks = (kernel: Kernel) => kernel.call("list_bookmarks");

export const toggleBookmark = (kernel: Kernel, args: CommandArgs<"toggle_bookmark">) =>
  kernel.call("toggle_bookmark", args);

// --- Tasks / sessions -------------------------------------------------------

export const listTasks = (kernel: Kernel) => kernel.call("list_tasks");

export const taskAction = (kernel: Kernel, args: CommandArgs<"task_action">) =>
  kernel.call("task_action", args);

export const listGameSessions = (kernel: Kernel) => kernel.call("list_game_sessions");

export const stopGame = (kernel: Kernel, args: CommandArgs<"stop_game">) =>
  kernel.call("stop_game", args);

// --- Content ----------------------------------------------------------------

export const searchContent = (kernel: Kernel, args: CommandArgs<"search_content">) =>
  kernel.call("search_content", args);

export const listContentVersions = (
  kernel: Kernel,
  args: CommandArgs<"list_content_versions">,
) => kernel.call("list_content_versions", args);

export const queueContentVersion = (
  kernel: Kernel,
  args: CommandArgs<"queue_content_version">,
) => kernel.call("queue_content_version", args);

export const listVanillaVersions = (kernel: Kernel) => kernel.call("list_vanilla_versions");

export const installVanilla = (kernel: Kernel, args: CommandArgs<"install_vanilla">) =>
  kernel.call("install_vanilla", args);

export const listLoaders = (kernel: Kernel, args: CommandArgs<"list_loaders">) =>
  kernel.call("list_loaders", args);

export const installLoader = (kernel: Kernel, args: CommandArgs<"install_loader">) =>
  kernel.call("install_loader", args);

export const checkUpdates = (kernel: Kernel, args: CommandArgs<"check_updates">) =>
  kernel.call("check_updates", args);

export const previewUpdates = (kernel: Kernel, args: CommandArgs<"preview_updates">) =>
  kernel.call("preview_updates", args);

export const applyUpdates = (kernel: Kernel, args: CommandArgs<"apply_updates">) =>
  kernel.call("apply_updates", args);

export const toggleMod = (kernel: Kernel, args: CommandArgs<"toggle_mod">) =>
  kernel.call("toggle_mod", args);

export const deleteMod = (kernel: Kernel, args: CommandArgs<"delete_mod">) =>
  kernel.call("delete_mod", args);

// --- Packaging / uninstall --------------------------------------------------

export const previewPack = (kernel: Kernel, args: CommandArgs<"preview_pack">) =>
  kernel.call("preview_pack", args);

export const confirmPack = (kernel: Kernel, args: CommandArgs<"confirm_pack">) =>
  kernel.call("confirm_pack", args);

export const previewUninstall = (kernel: Kernel, args: CommandArgs<"preview_uninstall">) =>
  kernel.call("preview_uninstall", args);

export const applyUninstall = (kernel: Kernel, args: CommandArgs<"apply_uninstall">) =>
  kernel.call("apply_uninstall", args);

// --- Saves / system ---------------------------------------------------------

export const listSaveBackups = (kernel: Kernel) => kernel.call("list_save_backups");

export const backupSaves = (kernel: Kernel) => kernel.call("backup_saves");

export const restoreSave = (kernel: Kernel, args: CommandArgs<"restore_save">) =>
  kernel.call("restore_save", args);

export const readLog = (kernel: Kernel) => kernel.call("read_log");

export const getSystemInfo = (kernel: Kernel) => kernel.call("get_system_info");

export const scanJava = (kernel: Kernel) => kernel.call("scan_java");

export const verifyKey = (kernel: Kernel, args: CommandArgs<"verify_key">) =>
  kernel.call("verify_key", args);

export const resetWindow = (kernel: Kernel) => kernel.call("reset_window");

export const pickFile = (kernel: Kernel, args?: CommandArgs<"pick_file">) =>
  kernel.call("pick_file", args);

export const pickFolder = (kernel: Kernel, args?: CommandArgs<"pick_folder">) =>
  kernel.call("pick_folder", args);

// --- Data sources -----------------------------------------------------------

export const saveCustomSources = (
  kernel: Kernel,
  args: CommandArgs<"save_custom_sources">,
) => kernel.call("save_custom_sources", args);

export const useDataSources = (kernel: Kernel, args: CommandArgs<"use_data_sources">) =>
  kernel.call("use_data_sources", args);

export const testDataSource = (kernel: Kernel, args: CommandArgs<"test_data_source">) =>
  kernel.call("test_data_source", args);

// --- Community --------------------------------------------------------------

export const getCommunity = (kernel: Kernel) => kernel.call("get_community");

export const refreshCommunity = (kernel: Kernel) => kernel.call("refresh_community");

export const saveRecommendations = (kernel: Kernel, args: CommandArgs<"save_recommendations">) =>
  kernel.call("save_recommendations", args);

/**
 * Wire command name → method name on `Kernel`.
 *
 * Kept explicit (not derived from `Function.name`) so minifiers and bundlers
 * cannot change what `kernel.getOverview()` is called.
 */
export const METHOD_NAMES = {
  get_overview: "getOverview",
  get_settings: "getSettings",
  list_accounts: "listAccounts",
  list_instances: "listInstances",
  list_all_instances: "listAllInstances",
  list_instance_mods: "listInstanceMods",
  list_servers: "listServers",
  list_bookmarks: "listBookmarks",
  select_instance: "selectInstance",
  launch_game: "launchGame",
  launch_to_server: "launchToServer",
  save_server: "saveServer",
  delete_server: "deleteServer",
  ping_server: "pingServer",
  read_avatar: "readAvatar",
  start_login: "startLogin",
  get_login_session: "getLoginSession",
  select_login_profile: "selectLoginProfile",
  cancel_login: "cancelLogin",
  select_account: "selectAccount",
  forget_account: "forgetAccount",
  set_offline_skin: "setOfflineSkin",
  save_settings: "saveSettings",
  remove_game_root: "removeGameRoot",
  scan_java: "scanJava",
  save_custom_sources: "saveCustomSources",
  use_data_sources: "useDataSources",
  test_data_source: "testDataSource",
  reset_window: "resetWindow",
  open_folder: "openFolder",
  read_log: "readLog",
  get_system_info: "getSystemInfo",
  verify_key: "verifyKey",
  pick_file: "pickFile",
  pick_folder: "pickFolder",
  list_save_backups: "listSaveBackups",
  backup_saves: "backupSaves",
  restore_save: "restoreSave",
  list_tasks: "listTasks",
  task_action: "taskAction",
  list_game_sessions: "listGameSessions",
  stop_game: "stopGame",
  search_content: "searchContent",
  list_content_versions: "listContentVersions",
  queue_content_version: "queueContentVersion",
  toggle_bookmark: "toggleBookmark",
  list_vanilla_versions: "listVanillaVersions",
  install_vanilla: "installVanilla",
  list_loaders: "listLoaders",
  install_loader: "installLoader",
  preview_pack: "previewPack",
  confirm_pack: "confirmPack",
  preview_uninstall: "previewUninstall",
  apply_uninstall: "applyUninstall",
  clone_instance: "cloneInstance",
  export_instance: "exportInstance",
  check_updates: "checkUpdates",
  preview_updates: "previewUpdates",
  apply_updates: "applyUpdates",
  toggle_mod: "toggleMod",
  delete_mod: "deleteMod",
  read_launch_options: "readLaunchOptions",
  save_launch_options: "saveLaunchOptions",
  get_community: "getCommunity",
  refresh_community: "refreshCommunity",
  save_recommendations: "saveRecommendations",
} as const satisfies Record<KernelCommand, string>;

/**
 * All wrappers keyed by their wire command name.
 *
 * Handy for generic UIs and as a drift guard: the runtime check asserts these
 * keys are exactly `KERNEL_METHODS`.
 */
export const METHOD_FUNCTIONS = {
  get_overview: getOverview,
  get_settings: getSettings,
  list_accounts: listAccounts,
  list_instances: listInstances,
  list_all_instances: listAllInstances,
  list_instance_mods: listInstanceMods,
  list_servers: listServers,
  list_bookmarks: listBookmarks,
  select_instance: selectInstance,
  launch_game: launchGame,
  launch_to_server: launchToServer,
  save_server: saveServer,
  delete_server: deleteServer,
  ping_server: pingServer,
  read_avatar: readAvatar,
  start_login: startLogin,
  get_login_session: getLoginSession,
  select_login_profile: selectLoginProfile,
  cancel_login: cancelLogin,
  select_account: selectAccount,
  forget_account: forgetAccount,
  set_offline_skin: setOfflineSkin,
  save_settings: saveSettings,
  remove_game_root: removeGameRoot,
  scan_java: scanJava,
  save_custom_sources: saveCustomSources,
  use_data_sources: useDataSources,
  test_data_source: testDataSource,
  reset_window: resetWindow,
  open_folder: openFolder,
  read_log: readLog,
  get_system_info: getSystemInfo,
  verify_key: verifyKey,
  pick_file: pickFile,
  pick_folder: pickFolder,
  list_save_backups: listSaveBackups,
  backup_saves: backupSaves,
  restore_save: restoreSave,
  list_tasks: listTasks,
  task_action: taskAction,
  list_game_sessions: listGameSessions,
  stop_game: stopGame,
  search_content: searchContent,
  list_content_versions: listContentVersions,
  queue_content_version: queueContentVersion,
  toggle_bookmark: toggleBookmark,
  list_vanilla_versions: listVanillaVersions,
  install_vanilla: installVanilla,
  list_loaders: listLoaders,
  install_loader: installLoader,
  preview_pack: previewPack,
  confirm_pack: confirmPack,
  preview_uninstall: previewUninstall,
  apply_uninstall: applyUninstall,
  clone_instance: cloneInstance,
  export_instance: exportInstance,
  check_updates: checkUpdates,
  preview_updates: previewUpdates,
  apply_updates: applyUpdates,
  toggle_mod: toggleMod,
  delete_mod: deleteMod,
  read_launch_options: readLaunchOptions,
  save_launch_options: saveLaunchOptions,
  get_community: getCommunity,
  refresh_community: refreshCommunity,
  save_recommendations: saveRecommendations,
} as const satisfies Record<(typeof KERNEL_METHODS)[number], (kernel: Kernel, ...args: never[]) => Promise<unknown>>;

export type MethodFunction = (typeof METHOD_FUNCTIONS)[(typeof KERNEL_METHODS)[number]];

export type MethodResult<C extends CommandName> = CommandResult<C>;
