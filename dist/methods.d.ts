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
export declare const getOverview: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").LauncherOverview>>;
export declare const getSettings: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").SettingsInfo>>;
export declare const saveSettings: (kernel: Kernel, args: CommandArgs<"save_settings">) => Promise<import("./generated.js").SavedInfo>;
export declare const removeGameRoot: (kernel: Kernel, args: CommandArgs<"remove_game_root">) => Promise<import("./generated.js").SavedInfo>;
export declare const listAccounts: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").AccountInfo[]>>;
export declare const selectAccount: (kernel: Kernel, args: CommandArgs<"select_account">) => Promise<import("./generated.js").SavedInfo>;
export declare const forgetAccount: (kernel: Kernel, args: CommandArgs<"forget_account">) => Promise<import("./generated.js").SavedInfo>;
export declare const readAvatar: (kernel: Kernel) => Promise<import("./generated.js").AvatarInfo>;
export declare const setOfflineSkin: (kernel: Kernel, args: CommandArgs<"set_offline_skin">) => Promise<import("./generated.js").AvatarInfo>;
export declare const startLogin: (kernel: Kernel, args: CommandArgs<"start_login">) => Promise<import("./generated.js").LoginSessionInfo>;
export declare const getLoginSession: (kernel: Kernel, args: CommandArgs<"get_login_session">) => Promise<import("./generated.js").LoginSessionInfo>;
export declare const selectLoginProfile: (kernel: Kernel, args: CommandArgs<"select_login_profile">) => Promise<import("./generated.js").LoginSessionInfo>;
export declare const cancelLogin: (kernel: Kernel, args: CommandArgs<"cancel_login">) => Promise<import("./generated.js").LoginSessionInfo>;
export declare const listInstances: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").InstanceCatalogInfo>>;
export declare const listAllInstances: (kernel: Kernel) => Promise<import("./generated.js").InstanceCatalogInfo>;
export declare const listInstanceMods: (kernel: Kernel, args: CommandArgs<"list_instance_mods">) => Promise<import("./commands.js").Snapshot<import("./generated.js").ModInfo[]>>;
export declare const selectInstance: (kernel: Kernel, args: CommandArgs<"select_instance">) => Promise<import("./generated.js").SavedInfo>;
export declare const cloneInstance: (kernel: Kernel, args: CommandArgs<"clone_instance">) => Promise<import("./generated.js").SavedInfo>;
export declare const exportInstance: (kernel: Kernel, args: CommandArgs<"export_instance">) => Promise<import("./generated.js").SavedInfo>;
export declare const launchGame: (kernel: Kernel, args: CommandArgs<"launch_game">) => Promise<import("./generated.js").LaunchAcceptedInfo>;
export declare const launchToServer: (kernel: Kernel, args: CommandArgs<"launch_to_server">) => Promise<import("./generated.js").LaunchAcceptedInfo>;
export declare const openFolder: (kernel: Kernel, args: CommandArgs<"open_folder">) => Promise<import("./generated.js").SavedInfo>;
export declare const readLaunchOptions: (kernel: Kernel, args: CommandArgs<"read_launch_options">) => Promise<import("./generated.js").LaunchOptionsInfo>;
export declare const saveLaunchOptions: (kernel: Kernel, args: CommandArgs<"save_launch_options">) => Promise<import("./generated.js").SavedInfo>;
export declare const listServers: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").SavedServerInfo[]>>;
export declare const saveServer: (kernel: Kernel, args: CommandArgs<"save_server">) => Promise<import("./generated.js").SavedInfo>;
export declare const deleteServer: (kernel: Kernel, args: CommandArgs<"delete_server">) => Promise<import("./generated.js").SavedInfo>;
export declare const pingServer: (kernel: Kernel, args: CommandArgs<"ping_server">) => Promise<import("./generated.js").ServerPingInfo>;
export declare const listBookmarks: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").FavoriteInfo[]>>;
export declare const toggleBookmark: (kernel: Kernel, args: CommandArgs<"toggle_bookmark">) => Promise<import("./generated.js").SavedInfo>;
export declare const listTasks: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").TaskInfo[]>>;
export declare const taskAction: (kernel: Kernel, args: CommandArgs<"task_action">) => Promise<import("./generated.js").SavedInfo>;
export declare const listGameSessions: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").GameSessionInfo[]>>;
export declare const stopGame: (kernel: Kernel, args: CommandArgs<"stop_game">) => Promise<import("./generated.js").SavedInfo>;
export declare const searchContent: (kernel: Kernel, args: CommandArgs<"search_content">) => Promise<import("./generated.js").ContentSearchResult>;
export declare const listContentVersions: (kernel: Kernel, args: CommandArgs<"list_content_versions">) => Promise<import("./generated.js").ResourceVersionsInfo>;
export declare const queueContentVersion: (kernel: Kernel, args: CommandArgs<"queue_content_version">) => Promise<import("./generated.js").SavedInfo>;
export declare const listVanillaVersions: (kernel: Kernel) => Promise<import("./generated.js").VanillaVersionInfo[]>;
export declare const installVanilla: (kernel: Kernel, args: CommandArgs<"install_vanilla">) => Promise<import("./generated.js").SavedInfo>;
export declare const listLoaders: (kernel: Kernel, args: CommandArgs<"list_loaders">) => Promise<import("./generated.js").LoaderListInfo>;
export declare const installLoader: (kernel: Kernel, args: CommandArgs<"install_loader">) => Promise<import("./generated.js").SavedInfo>;
export declare const checkUpdates: (kernel: Kernel, args: CommandArgs<"check_updates">) => Promise<import("./generated.js").ContentUpdatesInfo>;
export declare const previewUpdates: (kernel: Kernel, args: CommandArgs<"preview_updates">) => Promise<import("./generated.js").ContentUpdatePreviewInfo>;
export declare const applyUpdates: (kernel: Kernel, args: CommandArgs<"apply_updates">) => Promise<import("./generated.js").SavedInfo>;
export declare const toggleMod: (kernel: Kernel, args: CommandArgs<"toggle_mod">) => Promise<import("./generated.js").SavedInfo>;
export declare const deleteMod: (kernel: Kernel, args: CommandArgs<"delete_mod">) => Promise<import("./generated.js").SavedInfo>;
export declare const previewPack: (kernel: Kernel, args: CommandArgs<"preview_pack">) => Promise<import("./generated.js").PackPreviewInfo>;
export declare const confirmPack: (kernel: Kernel, args: CommandArgs<"confirm_pack">) => Promise<import("./generated.js").SavedInfo>;
export declare const previewUninstall: (kernel: Kernel, args: CommandArgs<"preview_uninstall">) => Promise<import("./generated.js").UninstallPreviewInfo>;
export declare const applyUninstall: (kernel: Kernel, args: CommandArgs<"apply_uninstall">) => Promise<import("./generated.js").SavedInfo>;
export declare const listSaveBackups: (kernel: Kernel) => Promise<import("./generated.js").SaveBackupInfo[]>;
export declare const backupSaves: (kernel: Kernel) => Promise<import("./generated.js").SavedInfo>;
export declare const restoreSave: (kernel: Kernel, args: CommandArgs<"restore_save">) => Promise<import("./generated.js").SavedInfo>;
export declare const readLog: (kernel: Kernel) => Promise<string>;
export declare const getSystemInfo: (kernel: Kernel) => Promise<import("./generated.js").SystemInfoInfo>;
export declare const scanJava: (kernel: Kernel) => Promise<import("./generated.js").JavaInfo[]>;
export declare const verifyKey: (kernel: Kernel, args: CommandArgs<"verify_key">) => Promise<import("./generated.js").KeyResultInfo>;
export declare const resetWindow: (kernel: Kernel) => Promise<import("./generated.js").SavedInfo>;
export declare const pickFile: (kernel: Kernel, args?: CommandArgs<"pick_file">) => Promise<string | null>;
export declare const pickFolder: (kernel: Kernel, args?: CommandArgs<"pick_folder">) => Promise<string | null>;
export declare const saveCustomSources: (kernel: Kernel, args: CommandArgs<"save_custom_sources">) => Promise<import("./generated.js").SavedInfo>;
export declare const useDataSources: (kernel: Kernel, args: CommandArgs<"use_data_sources">) => Promise<import("./generated.js").SavedInfo>;
export declare const testDataSource: (kernel: Kernel, args: CommandArgs<"test_data_source">) => Promise<import("./generated.js").TestResultInfo>;
export declare const getCommunity: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").CommunityData>>;
export declare const refreshCommunity: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").CommunityData>>;
export declare const saveRecommendations: (kernel: Kernel, args: CommandArgs<"save_recommendations">) => Promise<import("./generated.js").SavedInfo>;
/**
 * Wire command name → method name on `Kernel`.
 *
 * Kept explicit (not derived from `Function.name`) so minifiers and bundlers
 * cannot change what `kernel.getOverview()` is called.
 */
export declare const METHOD_NAMES: {
    readonly get_overview: "getOverview";
    readonly get_settings: "getSettings";
    readonly list_accounts: "listAccounts";
    readonly list_instances: "listInstances";
    readonly list_all_instances: "listAllInstances";
    readonly list_instance_mods: "listInstanceMods";
    readonly list_servers: "listServers";
    readonly list_bookmarks: "listBookmarks";
    readonly select_instance: "selectInstance";
    readonly launch_game: "launchGame";
    readonly launch_to_server: "launchToServer";
    readonly save_server: "saveServer";
    readonly delete_server: "deleteServer";
    readonly ping_server: "pingServer";
    readonly read_avatar: "readAvatar";
    readonly start_login: "startLogin";
    readonly get_login_session: "getLoginSession";
    readonly select_login_profile: "selectLoginProfile";
    readonly cancel_login: "cancelLogin";
    readonly select_account: "selectAccount";
    readonly forget_account: "forgetAccount";
    readonly set_offline_skin: "setOfflineSkin";
    readonly save_settings: "saveSettings";
    readonly remove_game_root: "removeGameRoot";
    readonly scan_java: "scanJava";
    readonly save_custom_sources: "saveCustomSources";
    readonly use_data_sources: "useDataSources";
    readonly test_data_source: "testDataSource";
    readonly reset_window: "resetWindow";
    readonly open_folder: "openFolder";
    readonly read_log: "readLog";
    readonly get_system_info: "getSystemInfo";
    readonly verify_key: "verifyKey";
    readonly pick_file: "pickFile";
    readonly pick_folder: "pickFolder";
    readonly list_save_backups: "listSaveBackups";
    readonly backup_saves: "backupSaves";
    readonly restore_save: "restoreSave";
    readonly list_tasks: "listTasks";
    readonly task_action: "taskAction";
    readonly list_game_sessions: "listGameSessions";
    readonly stop_game: "stopGame";
    readonly search_content: "searchContent";
    readonly list_content_versions: "listContentVersions";
    readonly queue_content_version: "queueContentVersion";
    readonly toggle_bookmark: "toggleBookmark";
    readonly list_vanilla_versions: "listVanillaVersions";
    readonly install_vanilla: "installVanilla";
    readonly list_loaders: "listLoaders";
    readonly install_loader: "installLoader";
    readonly preview_pack: "previewPack";
    readonly confirm_pack: "confirmPack";
    readonly preview_uninstall: "previewUninstall";
    readonly apply_uninstall: "applyUninstall";
    readonly clone_instance: "cloneInstance";
    readonly export_instance: "exportInstance";
    readonly check_updates: "checkUpdates";
    readonly preview_updates: "previewUpdates";
    readonly apply_updates: "applyUpdates";
    readonly toggle_mod: "toggleMod";
    readonly delete_mod: "deleteMod";
    readonly read_launch_options: "readLaunchOptions";
    readonly save_launch_options: "saveLaunchOptions";
    readonly get_community: "getCommunity";
    readonly refresh_community: "refreshCommunity";
    readonly save_recommendations: "saveRecommendations";
};
/**
 * All wrappers keyed by their wire command name.
 *
 * Handy for generic UIs and as a drift guard: the runtime check asserts these
 * keys are exactly `KERNEL_METHODS`.
 */
export declare const METHOD_FUNCTIONS: {
    readonly get_overview: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").LauncherOverview>>;
    readonly get_settings: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").SettingsInfo>>;
    readonly list_accounts: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").AccountInfo[]>>;
    readonly list_instances: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").InstanceCatalogInfo>>;
    readonly list_all_instances: (kernel: Kernel) => Promise<import("./generated.js").InstanceCatalogInfo>;
    readonly list_instance_mods: (kernel: Kernel, args: CommandArgs<"list_instance_mods">) => Promise<import("./commands.js").Snapshot<import("./generated.js").ModInfo[]>>;
    readonly list_servers: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").SavedServerInfo[]>>;
    readonly list_bookmarks: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").FavoriteInfo[]>>;
    readonly select_instance: (kernel: Kernel, args: CommandArgs<"select_instance">) => Promise<import("./generated.js").SavedInfo>;
    readonly launch_game: (kernel: Kernel, args: CommandArgs<"launch_game">) => Promise<import("./generated.js").LaunchAcceptedInfo>;
    readonly launch_to_server: (kernel: Kernel, args: CommandArgs<"launch_to_server">) => Promise<import("./generated.js").LaunchAcceptedInfo>;
    readonly save_server: (kernel: Kernel, args: CommandArgs<"save_server">) => Promise<import("./generated.js").SavedInfo>;
    readonly delete_server: (kernel: Kernel, args: CommandArgs<"delete_server">) => Promise<import("./generated.js").SavedInfo>;
    readonly ping_server: (kernel: Kernel, args: CommandArgs<"ping_server">) => Promise<import("./generated.js").ServerPingInfo>;
    readonly read_avatar: (kernel: Kernel) => Promise<import("./generated.js").AvatarInfo>;
    readonly start_login: (kernel: Kernel, args: CommandArgs<"start_login">) => Promise<import("./generated.js").LoginSessionInfo>;
    readonly get_login_session: (kernel: Kernel, args: CommandArgs<"get_login_session">) => Promise<import("./generated.js").LoginSessionInfo>;
    readonly select_login_profile: (kernel: Kernel, args: CommandArgs<"select_login_profile">) => Promise<import("./generated.js").LoginSessionInfo>;
    readonly cancel_login: (kernel: Kernel, args: CommandArgs<"cancel_login">) => Promise<import("./generated.js").LoginSessionInfo>;
    readonly select_account: (kernel: Kernel, args: CommandArgs<"select_account">) => Promise<import("./generated.js").SavedInfo>;
    readonly forget_account: (kernel: Kernel, args: CommandArgs<"forget_account">) => Promise<import("./generated.js").SavedInfo>;
    readonly set_offline_skin: (kernel: Kernel, args: CommandArgs<"set_offline_skin">) => Promise<import("./generated.js").AvatarInfo>;
    readonly save_settings: (kernel: Kernel, args: CommandArgs<"save_settings">) => Promise<import("./generated.js").SavedInfo>;
    readonly remove_game_root: (kernel: Kernel, args: CommandArgs<"remove_game_root">) => Promise<import("./generated.js").SavedInfo>;
    readonly scan_java: (kernel: Kernel) => Promise<import("./generated.js").JavaInfo[]>;
    readonly save_custom_sources: (kernel: Kernel, args: CommandArgs<"save_custom_sources">) => Promise<import("./generated.js").SavedInfo>;
    readonly use_data_sources: (kernel: Kernel, args: CommandArgs<"use_data_sources">) => Promise<import("./generated.js").SavedInfo>;
    readonly test_data_source: (kernel: Kernel, args: CommandArgs<"test_data_source">) => Promise<import("./generated.js").TestResultInfo>;
    readonly reset_window: (kernel: Kernel) => Promise<import("./generated.js").SavedInfo>;
    readonly open_folder: (kernel: Kernel, args: CommandArgs<"open_folder">) => Promise<import("./generated.js").SavedInfo>;
    readonly read_log: (kernel: Kernel) => Promise<string>;
    readonly get_system_info: (kernel: Kernel) => Promise<import("./generated.js").SystemInfoInfo>;
    readonly verify_key: (kernel: Kernel, args: CommandArgs<"verify_key">) => Promise<import("./generated.js").KeyResultInfo>;
    readonly pick_file: (kernel: Kernel, args?: CommandArgs<"pick_file">) => Promise<string | null>;
    readonly pick_folder: (kernel: Kernel, args?: CommandArgs<"pick_folder">) => Promise<string | null>;
    readonly list_save_backups: (kernel: Kernel) => Promise<import("./generated.js").SaveBackupInfo[]>;
    readonly backup_saves: (kernel: Kernel) => Promise<import("./generated.js").SavedInfo>;
    readonly restore_save: (kernel: Kernel, args: CommandArgs<"restore_save">) => Promise<import("./generated.js").SavedInfo>;
    readonly list_tasks: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").TaskInfo[]>>;
    readonly task_action: (kernel: Kernel, args: CommandArgs<"task_action">) => Promise<import("./generated.js").SavedInfo>;
    readonly list_game_sessions: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").GameSessionInfo[]>>;
    readonly stop_game: (kernel: Kernel, args: CommandArgs<"stop_game">) => Promise<import("./generated.js").SavedInfo>;
    readonly search_content: (kernel: Kernel, args: CommandArgs<"search_content">) => Promise<import("./generated.js").ContentSearchResult>;
    readonly list_content_versions: (kernel: Kernel, args: CommandArgs<"list_content_versions">) => Promise<import("./generated.js").ResourceVersionsInfo>;
    readonly queue_content_version: (kernel: Kernel, args: CommandArgs<"queue_content_version">) => Promise<import("./generated.js").SavedInfo>;
    readonly toggle_bookmark: (kernel: Kernel, args: CommandArgs<"toggle_bookmark">) => Promise<import("./generated.js").SavedInfo>;
    readonly list_vanilla_versions: (kernel: Kernel) => Promise<import("./generated.js").VanillaVersionInfo[]>;
    readonly install_vanilla: (kernel: Kernel, args: CommandArgs<"install_vanilla">) => Promise<import("./generated.js").SavedInfo>;
    readonly list_loaders: (kernel: Kernel, args: CommandArgs<"list_loaders">) => Promise<import("./generated.js").LoaderListInfo>;
    readonly install_loader: (kernel: Kernel, args: CommandArgs<"install_loader">) => Promise<import("./generated.js").SavedInfo>;
    readonly preview_pack: (kernel: Kernel, args: CommandArgs<"preview_pack">) => Promise<import("./generated.js").PackPreviewInfo>;
    readonly confirm_pack: (kernel: Kernel, args: CommandArgs<"confirm_pack">) => Promise<import("./generated.js").SavedInfo>;
    readonly preview_uninstall: (kernel: Kernel, args: CommandArgs<"preview_uninstall">) => Promise<import("./generated.js").UninstallPreviewInfo>;
    readonly apply_uninstall: (kernel: Kernel, args: CommandArgs<"apply_uninstall">) => Promise<import("./generated.js").SavedInfo>;
    readonly clone_instance: (kernel: Kernel, args: CommandArgs<"clone_instance">) => Promise<import("./generated.js").SavedInfo>;
    readonly export_instance: (kernel: Kernel, args: CommandArgs<"export_instance">) => Promise<import("./generated.js").SavedInfo>;
    readonly check_updates: (kernel: Kernel, args: CommandArgs<"check_updates">) => Promise<import("./generated.js").ContentUpdatesInfo>;
    readonly preview_updates: (kernel: Kernel, args: CommandArgs<"preview_updates">) => Promise<import("./generated.js").ContentUpdatePreviewInfo>;
    readonly apply_updates: (kernel: Kernel, args: CommandArgs<"apply_updates">) => Promise<import("./generated.js").SavedInfo>;
    readonly toggle_mod: (kernel: Kernel, args: CommandArgs<"toggle_mod">) => Promise<import("./generated.js").SavedInfo>;
    readonly delete_mod: (kernel: Kernel, args: CommandArgs<"delete_mod">) => Promise<import("./generated.js").SavedInfo>;
    readonly read_launch_options: (kernel: Kernel, args: CommandArgs<"read_launch_options">) => Promise<import("./generated.js").LaunchOptionsInfo>;
    readonly save_launch_options: (kernel: Kernel, args: CommandArgs<"save_launch_options">) => Promise<import("./generated.js").SavedInfo>;
    readonly get_community: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").CommunityData>>;
    readonly refresh_community: (kernel: Kernel) => Promise<import("./commands.js").Snapshot<import("./generated.js").CommunityData>>;
    readonly save_recommendations: (kernel: Kernel, args: CommandArgs<"save_recommendations">) => Promise<import("./generated.js").SavedInfo>;
};
export type MethodFunction = (typeof METHOD_FUNCTIONS)[(typeof KERNEL_METHODS)[number]];
export type MethodResult<C extends CommandName> = CommandResult<C>;
