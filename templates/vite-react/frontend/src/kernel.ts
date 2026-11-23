// MCUGL kernel bridge.
//
// The page is served by the launcher over the `mcugl` protocol (on Windows that
// is http://mcugl.localhost/), so the Tauri IPC bridge injected by the host is
// available on window.__TAURI_INTERNALS__. Everything below is intentionally
// dependency-free.

export const KERNEL_PROTOCOL = "mcugl.kernel/v1";

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
