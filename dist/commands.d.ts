/**
 * The 66 kernel methods plus the host management commands, with their
 * argument and result types.
 *
 * Invoke names stay snake_case and arguments stay camelCase: that is exactly
 * what the launcher already accepts, so the SDK adds types without changing
 * the wire contract.
 */
import type { AccountInfo, AppSettingsPatch, AvatarInfo, CommunityData, ContentSearchResult, ContentUpdatePreviewInfo, ContentUpdatesInfo, DataSourceSet, FavoriteInfo, GameSessionInfo, InstanceCatalogInfo, JavaInfo, KeyResultInfo, LauncherOverview, LaunchAcceptedInfo, LaunchOptionsInfo, LaunchSettings, LoaderListInfo, LoginSessionInfo, ModInfo, PackPreviewInfo, RecommendationInfo, ResourceVersionsInfo, SaveBackupInfo, SavedInfo, SavedServerInfo, ServerPingInfo, SettingsInfo, SystemInfoInfo, TaskInfo, TestResultInfo, UninstallPreviewInfo, VanillaVersionInfo } from "./generated.js";
import type { FrontendList, FrontendSummary, KernelManifest } from "./manifest.js";
/** Resource snapshots keep epoch/revision; only the payload is command-specific. */
export interface Snapshot<T> {
    epoch: string;
    revision: number;
    data: T;
}
export interface CommandArgsMap {
    get_overview: undefined;
    get_settings: undefined;
    list_accounts: undefined;
    list_instances: undefined;
    list_all_instances: undefined;
    list_instance_mods: {
        instanceId: string;
    };
    list_servers: undefined;
    list_bookmarks: undefined;
    select_instance: {
        instanceId: string;
    };
    launch_game: {
        instanceId: string;
        accountId: string;
    };
    launch_to_server: {
        instanceId: string;
        accountId: string;
        serverAddress: string;
    };
    save_server: {
        name: string;
        address: string;
        id?: string;
        instanceId?: string;
    };
    delete_server: {
        id: string;
    };
    ping_server: {
        address: string;
    };
    read_avatar: undefined;
    start_login: {
        provider: string;
        account?: string;
        password?: string;
    };
    select_account: {
        accountId: string;
    };
    forget_account: {
        accountId: string;
    };
    set_offline_skin: {
        path: string;
    };
    get_login_session: {
        authSessionId: string;
    };
    select_login_profile: {
        authSessionId: string;
        profileId: string;
    };
    cancel_login: {
        authSessionId: string;
    };
    save_settings: {
        patch: AppSettingsPatch;
        expectedRevision: number;
    };
    remove_game_root: {
        root: string;
        expectedRevision: number;
    };
    scan_java: undefined;
    save_custom_sources: {
        sources: DataSourceSet;
        expectedRevision: number;
        activate?: boolean;
    };
    use_data_sources: {
        mode: string;
        expectedRevision: number;
    };
    test_data_source: {
        name: string;
        url: string;
    };
    reset_window: undefined;
    open_folder: {
        kind: string;
    };
    read_log: undefined;
    get_system_info: undefined;
    verify_key: {
        role: string;
        key: string;
    };
    pick_file: {
        title?: string;
        defaultDirectory?: string;
    };
    pick_folder: {
        title?: string;
        defaultDirectory?: string;
    };
    list_save_backups: undefined;
    backup_saves: undefined;
    restore_save: {
        id: string;
        world: string;
    };
    list_tasks: undefined;
    task_action: {
        id: string;
        action: string;
    };
    list_game_sessions: undefined;
    stop_game: {
        sessionId: string;
    };
    search_content: {
        category: string;
        query: string;
        game?: string;
        loader?: string;
    };
    list_content_versions: {
        id: string;
        requestId?: string;
        game?: string;
        loader?: string;
        category?: string;
        instance?: string;
    };
    queue_content_version: {
        token: string;
        versionId: string;
        mode?: string;
        path?: string;
    };
    toggle_bookmark: {
        id: string;
        name: string;
        description: string;
        kind: string;
        author?: string;
    };
    list_vanilla_versions: undefined;
    install_vanilla: {
        minecraftVersion: string;
    };
    list_loaders: {
        minecraftVersion: string;
        loader: string;
    };
    install_loader: {
        minecraftVersion: string;
        loader: string;
        loaderVersion: string;
    };
    preview_pack: {
        path: string;
    };
    confirm_pack: {
        planId: string;
        name: string;
        directory: string;
    };
    preview_uninstall: {
        instanceId: string;
    };
    apply_uninstall: {
        planId: string;
    };
    clone_instance: {
        instanceId: string;
        displayName: string;
        saves?: boolean;
        servers?: boolean;
    };
    export_instance: {
        instanceId: string;
        path: string;
        servers?: boolean;
        saves?: boolean;
    };
    check_updates: {
        instanceId: string;
    };
    preview_updates: {
        checkId: string;
        projects?: string[];
    };
    apply_updates: {
        planId: string;
    };
    toggle_mod: {
        instanceId: string;
        modId: string;
        enabled: boolean;
    };
    delete_mod: {
        instanceId: string;
        modId: string;
    };
    read_launch_options: {
        instanceId: string;
        requestId?: string;
    };
    save_launch_options: {
        token: string;
        instanceId: string;
        displayName: string;
        settings: LaunchSettings;
        inherit?: boolean;
    };
    get_community: undefined;
    refresh_community: undefined;
    save_recommendations: {
        items: RecommendationInfo[];
    };
    kernel_manifest: undefined;
    list_frontends: undefined;
    install_frontend: {
        path: string;
    };
    use_frontend: {
        identifier: string | null;
        expectedRevision: number;
    };
    remove_frontend: {
        identifier: string;
        version?: string;
        expectedRevision: number;
    };
    reload_frontend: undefined;
    read_frontend_icon: {
        identifier: string;
        version?: string;
    };
}
export interface CommandResultMap {
    get_overview: Snapshot<LauncherOverview>;
    get_settings: Snapshot<SettingsInfo>;
    list_accounts: Snapshot<AccountInfo[]>;
    list_instances: Snapshot<InstanceCatalogInfo>;
    list_all_instances: InstanceCatalogInfo;
    list_instance_mods: Snapshot<ModInfo[]>;
    list_servers: Snapshot<SavedServerInfo[]>;
    list_bookmarks: Snapshot<FavoriteInfo[]>;
    select_instance: SavedInfo;
    launch_game: LaunchAcceptedInfo;
    launch_to_server: LaunchAcceptedInfo;
    save_server: SavedInfo;
    delete_server: SavedInfo;
    ping_server: ServerPingInfo;
    read_avatar: AvatarInfo;
    start_login: LoginSessionInfo;
    select_account: SavedInfo;
    forget_account: SavedInfo;
    set_offline_skin: AvatarInfo;
    get_login_session: LoginSessionInfo;
    select_login_profile: LoginSessionInfo;
    cancel_login: LoginSessionInfo;
    save_settings: SavedInfo;
    remove_game_root: SavedInfo;
    scan_java: JavaInfo[];
    save_custom_sources: SavedInfo;
    use_data_sources: SavedInfo;
    test_data_source: TestResultInfo;
    reset_window: SavedInfo;
    open_folder: SavedInfo;
    read_log: string;
    get_system_info: SystemInfoInfo;
    verify_key: KeyResultInfo;
    pick_file: string | null;
    pick_folder: string | null;
    list_save_backups: SaveBackupInfo[];
    backup_saves: SavedInfo;
    restore_save: SavedInfo;
    list_tasks: Snapshot<TaskInfo[]>;
    task_action: SavedInfo;
    list_game_sessions: Snapshot<GameSessionInfo[]>;
    stop_game: SavedInfo;
    search_content: ContentSearchResult;
    list_content_versions: ResourceVersionsInfo;
    queue_content_version: SavedInfo;
    toggle_bookmark: SavedInfo;
    list_vanilla_versions: VanillaVersionInfo[];
    install_vanilla: SavedInfo;
    list_loaders: LoaderListInfo;
    install_loader: SavedInfo;
    preview_pack: PackPreviewInfo;
    confirm_pack: SavedInfo;
    preview_uninstall: UninstallPreviewInfo;
    apply_uninstall: SavedInfo;
    clone_instance: SavedInfo;
    export_instance: SavedInfo;
    check_updates: ContentUpdatesInfo;
    preview_updates: ContentUpdatePreviewInfo;
    apply_updates: SavedInfo;
    toggle_mod: SavedInfo;
    delete_mod: SavedInfo;
    read_launch_options: LaunchOptionsInfo;
    save_launch_options: SavedInfo;
    get_community: Snapshot<CommunityData>;
    refresh_community: Snapshot<CommunityData>;
    save_recommendations: SavedInfo;
    kernel_manifest: KernelManifest;
    list_frontends: FrontendList;
    install_frontend: FrontendSummary;
    use_frontend: SavedInfo;
    remove_frontend: SavedInfo;
    reload_frontend: SavedInfo;
    read_frontend_icon: string | null;
}
export type CommandName = keyof CommandArgsMap;
export type CommandArgs<C extends CommandName> = CommandArgsMap[C];
export type CommandResult<C extends CommandName> = CommandResultMap[C];
/** The 66 methods advertised by `mcugl.kernel/v1`, in registration order. */
export declare const KERNEL_METHODS: readonly ["get_overview", "get_settings", "list_accounts", "list_instances", "list_all_instances", "list_instance_mods", "list_servers", "list_bookmarks", "select_instance", "launch_game", "launch_to_server", "save_server", "delete_server", "ping_server", "read_avatar", "start_login", "get_login_session", "select_login_profile", "cancel_login", "select_account", "forget_account", "set_offline_skin", "save_settings", "remove_game_root", "scan_java", "save_custom_sources", "use_data_sources", "test_data_source", "reset_window", "open_folder", "read_log", "get_system_info", "verify_key", "pick_file", "pick_folder", "list_save_backups", "backup_saves", "restore_save", "list_tasks", "task_action", "list_game_sessions", "stop_game", "search_content", "list_content_versions", "queue_content_version", "toggle_bookmark", "list_vanilla_versions", "install_vanilla", "list_loaders", "install_loader", "preview_pack", "confirm_pack", "preview_uninstall", "apply_uninstall", "clone_instance", "export_instance", "check_updates", "preview_updates", "apply_updates", "toggle_mod", "delete_mod", "read_launch_options", "save_launch_options", "get_community", "refresh_community", "save_recommendations"];
/** Host management commands, outside the kernel method table. */
export declare const HOST_COMMANDS: readonly ["kernel_manifest", "list_frontends", "install_frontend", "use_frontend", "remove_frontend", "reload_frontend", "read_frontend_icon"];
export declare const ALL_COMMANDS: readonly CommandName[];
