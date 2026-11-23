// MCUGL kernel bridge.
//
// The page is served by the launcher over the `mcugl` protocol (on Windows that
// is http://mcugl.localhost/), so the Tauri IPC bridge injected by the host is
// available on window.__TAURI_INTERNALS__. Everything below is intentionally
// dependency-free.

export const KERNEL_PROTOCOL = "mcugl.kernel/v1";

// Every method in mcugl.kernel/v1. The advanced console uses this list so the
// generated frontend can reach all of them; keep it in sync with
// scripts/kernel-methods.json (the packer checks coverage against that file).
export const ALL_METHODS = [
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
] as const;

export interface FrontendInfo {
  mode: string;
  name: string;
  version: string;
  entry: string;
  identifier?: string;
  author?: string;
}

export interface KernelManifest {
  protocol: string;
  /** Kernel API version, e.g. "1.0.0". */
  apiVersion: string;
  /** Launcher version reported by the backend (not the Cargo crate version). */
  appVersion: string;
  backend: string;
  transports: string[];
  methods: string[];
  events: string[];
  capabilities: Record<string, boolean>;
  limits: { planTtlSeconds: number };
  frontend: FrontendInfo | null;
}

export interface ResourceSnapshot<T = unknown> {
  epoch: string;
  revision: number;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
}

export interface LauncherOverview {
  appVersion: string;
  selectedInstanceId: string | null;
  activeAccountId: string | null;
}

export interface InstanceInfo {
  id: string;
  name: string;
  displayName: string;
  loader: string;
  minecraft: string;
  mods: number;
  updates: number;
  isPlaceholder: boolean;
}

export interface InstanceCatalogInfo {
  items: InstanceInfo[];
  versionGroups: unknown;
}

export interface AccountInfo {
  id: string;
  kind: string;
  player: string;
  status: string;
}

export interface TaskInfo {
  id: string;
  name: string;
  kind: string;
  instanceId: string | null;
  status: string;
  phase: string;
}

export interface SavedInfo {
  message: string;
  changed: string[];
  entityIds: string[];
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: (
        command: string,
        args?: Record<string, unknown>,
        options?: unknown,
      ) => Promise<unknown>;
    };
    __MCUGL__?: {
      apiVersion: string;
      protocol: string;
      frontend: FrontendInfo;
    };
  }
}

export class KernelError extends Error {
  readonly command: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;

  constructor(command: string, body: ApiErrorBody) {
    super(body.message);
    this.name = "KernelError";
    this.command = command;
    this.code = body.code;
    this.retryable = body.retryable ?? false;
    this.fieldErrors = body.fieldErrors;
  }
}

export function kernelAvailable(): boolean {
  return Boolean(window.__TAURI_INTERNALS__?.invoke);
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

export function toKernelError(command: string, error: unknown): KernelError {
  if (error instanceof KernelError) return error;
  if (isApiErrorBody(error)) return new KernelError(command, error);
  return new KernelError(command, {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  });
}

export function describeError(error: unknown): ApiErrorBody {
  if (error instanceof KernelError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      fieldErrors: error.fieldErrors,
    };
  }
  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function call<T>(
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    throw new KernelError(command, {
      code: "KERNEL_UNAVAILABLE",
      message:
        "没有检测到 MCUGL 内核。请通过启动器加载这个前端，而不是直接用浏览器打开。",
    });
  }
  try {
    return (await invoke(command, args)) as T;
  } catch (error) {
    throw toKernelError(command, error);
  }
}

export function manifest(): Promise<KernelManifest> {
  return call<KernelManifest>("kernel_manifest");
}

export function overview<T = unknown>(): Promise<ResourceSnapshot<T>> {
  return call<ResourceSnapshot<T>>("get_overview");
}

export function listInstances(): Promise<ResourceSnapshot<InstanceCatalogInfo>> {
  return call<ResourceSnapshot<InstanceCatalogInfo>>("list_instances");
}

export function listAccounts(): Promise<ResourceSnapshot<AccountInfo[]>> {
  return call<ResourceSnapshot<AccountInfo[]>>("list_accounts");
}

export function listTasks(): Promise<ResourceSnapshot<TaskInfo[]>> {
  return call<ResourceSnapshot<TaskInfo[]>>("list_tasks");
}

export function selectInstance(instanceId: string): Promise<SavedInfo> {
  return call<SavedInfo>("select_instance", { instanceId });
}

export function selectAccount(accountId: string): Promise<SavedInfo> {
  return call<SavedInfo>("select_account", { accountId });
}

export function launchGame(instanceId: string, accountId: string): Promise<SavedInfo> {
  return call<SavedInfo>("launch_game", { instanceId, accountId });
}
