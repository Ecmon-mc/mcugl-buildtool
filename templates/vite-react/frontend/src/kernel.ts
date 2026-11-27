// MCUGL kernel client backed by @mcugl/frontpack-sdk.
//
// The page is served by the launcher over the `mcugl` protocol (on Windows that
// is http://mcugl.localhost/), so the Tauri IPC bridge injected by the host is
// available on window.__TAURI_INTERNALS__.

import {
  createKernel,
  KernelError,
  type CommandName,
  type FrontendInfo,
  type KernelManifest,
} from "@mcugl/frontpack-sdk";

export type { CommandName, FrontendInfo, KernelManifest };

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
