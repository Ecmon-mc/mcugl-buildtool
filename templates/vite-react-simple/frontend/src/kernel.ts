// MCUGL kernel client backed by @mcugl/frontpack-sdk.
//
// The page is served by the launcher over the `mcugl` protocol (on Windows that
// is http://mcugl.localhost/), so the Tauri IPC bridge injected by the host is
// available on window.__TAURI_INTERNALS__.

import {
  createKernel,
  KERNEL_METHODS,
  KernelError,
  type CommandName,
  type CommandResult,
  type FrontendInfo,
  type KernelManifest,
} from "@mcugl/frontpack-sdk";

// Every method in mcugl.kernel/v1 from @mcugl/frontpack-sdk.
export const ALL_METHODS = KERNEL_METHODS;

export type { CommandName, FrontendInfo, KernelManifest };
export type LauncherOverview = CommandResult<"get_overview">["data"];
export type InstanceInfo = CommandResult<"list_instances">["data"]["items"][number];
export type AccountInfo = CommandResult<"list_accounts">["data"][number];
export type TaskInfo = CommandResult<"list_tasks">["data"][number];

export interface ApiErrorBody {
  code: string;
  message: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
}

export const kernel = createKernel();

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
