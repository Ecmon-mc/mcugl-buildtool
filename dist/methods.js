// --- State / settings -------------------------------------------------------
export const getOverview = (kernel) => kernel.call("get_overview");
export const getSettings = (kernel) => kernel.call("get_settings");
export const saveSettings = (kernel, args) => kernel.call("save_settings", args);
export const removeGameRoot = (kernel, args) => kernel.call("remove_game_root", args);
// --- Accounts ---------------------------------------------------------------
export const listAccounts = (kernel) => kernel.call("list_accounts");
export const selectAccount = (kernel, args) => kernel.call("select_account", args);
export const forgetAccount = (kernel, args) => kernel.call("forget_account", args);
export const readAvatar = (kernel) => kernel.call("read_avatar");
export const setOfflineSkin = (kernel, args) => kernel.call("set_offline_skin", args);
export const startLogin = (kernel, args) => kernel.call("start_login", args);
export const getLoginSession = (kernel, args) => kernel.call("get_login_session", args);
export const selectLoginProfile = (kernel, args) => kernel.call("select_login_profile", args);
export const cancelLogin = (kernel, args) => kernel.call("cancel_login", args);
// --- Instances --------------------------------------------------------------
export const listInstances = (kernel) => kernel.call("list_instances");
export const listAllInstances = (kernel) => kernel.call("list_all_instances");
export const listInstanceMods = (kernel, args) => kernel.call("list_instance_mods", args);
export const selectInstance = (kernel, args) => kernel.call("select_instance", args);
export const cloneInstance = (kernel, args) => kernel.call("clone_instance", args);
export const exportInstance = (kernel, args) => kernel.call("export_instance", args);
// --- Launch -----------------------------------------------------------------
export const launchGame = (kernel, args) => kernel.call("launch_game", args);
export const launchToServer = (kernel, args) => kernel.call("launch_to_server", args);
export const openFolder = (kernel, args) => kernel.call("open_folder", args);
export const readLaunchOptions = (kernel, args) => kernel.call("read_launch_options", args);
export const saveLaunchOptions = (kernel, args) => kernel.call("save_launch_options", args);
// --- Servers / bookmarks ----------------------------------------------------
export const listServers = (kernel) => kernel.call("list_servers");
export const saveServer = (kernel, args) => kernel.call("save_server", args);
export const deleteServer = (kernel, args) => kernel.call("delete_server", args);
export const pingServer = (kernel, args) => kernel.call("ping_server", args);
export const listBookmarks = (kernel) => kernel.call("list_bookmarks");
export const toggleBookmark = (kernel, args) => kernel.call("toggle_bookmark", args);
// --- Tasks / sessions -------------------------------------------------------
export const listTasks = (kernel) => kernel.call("list_tasks");
export const taskAction = (kernel, args) => kernel.call("task_action", args);
export const listGameSessions = (kernel) => kernel.call("list_game_sessions");
export const stopGame = (kernel, args) => kernel.call("stop_game", args);
// --- Content ----------------------------------------------------------------
export const searchContent = (kernel, args) => kernel.call("search_content", args);
export const listContentVersions = (kernel, args) => kernel.call("list_content_versions", args);
export const queueContentVersion = (kernel, args) => kernel.call("queue_content_version", args);
export const listVanillaVersions = (kernel) => kernel.call("list_vanilla_versions");
export const installVanilla = (kernel, args) => kernel.call("install_vanilla", args);
export const listLoaders = (kernel, args) => kernel.call("list_loaders", args);
export const installLoader = (kernel, args) => kernel.call("install_loader", args);
export const checkUpdates = (kernel, args) => kernel.call("check_updates", args);
export const previewUpdates = (kernel, args) => kernel.call("preview_updates", args);
export const applyUpdates = (kernel, args) => kernel.call("apply_updates", args);
export const toggleMod = (kernel, args) => kernel.call("toggle_mod", args);
export const deleteMod = (kernel, args) => kernel.call("delete_mod", args);
// --- Packaging / uninstall --------------------------------------------------
export const previewPack = (kernel, args) => kernel.call("preview_pack", args);
export const confirmPack = (kernel, args) => kernel.call("confirm_pack", args);
export const previewUninstall = (kernel, args) => kernel.call("preview_uninstall", args);
export const applyUninstall = (kernel, args) => kernel.call("apply_uninstall", args);
// --- Saves / system ---------------------------------------------------------
export const listSaveBackups = (kernel) => kernel.call("list_save_backups");
export const backupSaves = (kernel) => kernel.call("backup_saves");
export const restoreSave = (kernel, args) => kernel.call("restore_save", args);
export const readLog = (kernel) => kernel.call("read_log");
export const getSystemInfo = (kernel) => kernel.call("get_system_info");
export const scanJava = (kernel) => kernel.call("scan_java");
export const verifyKey = (kernel, args) => kernel.call("verify_key", args);
export const resetWindow = (kernel) => kernel.call("reset_window");
export const pickFile = (kernel, args) => kernel.call("pick_file", args);
export const pickFolder = (kernel, args) => kernel.call("pick_folder", args);
// --- Data sources -----------------------------------------------------------
export const saveCustomSources = (kernel, args) => kernel.call("save_custom_sources", args);
export const useDataSources = (kernel, args) => kernel.call("use_data_sources", args);
export const testDataSource = (kernel, args) => kernel.call("test_data_source", args);
// --- Community --------------------------------------------------------------
export const getCommunity = (kernel) => kernel.call("get_community");
export const refreshCommunity = (kernel) => kernel.call("refresh_community");
export const saveRecommendations = (kernel, args) => kernel.call("save_recommendations", args);
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
};
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
};
