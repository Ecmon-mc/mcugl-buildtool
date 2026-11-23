// invoke 的薄封装：页面只依赖这几个函数，不直接碰 __TAURI_INTERNALS__。
type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

const internals = (
  globalThis as { __TAURI_INTERNALS__?: { invoke?: Invoke } }
).__TAURI_INTERNALS__;

export type KernelErrorDetail = {
  code?: string;
  message?: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export class KernelError extends Error {
  readonly method: string;
  readonly code?: string;
  readonly detail?: unknown;

  constructor(message: string, options: { method: string; code?: string; detail?: unknown }) {
    super(message);
    this.name = "KernelError";
    this.method = options.method;
    this.code = options.code;
    this.detail = options.detail;
  }
}

export function kernelAvailable(): boolean {
  return typeof internals?.invoke === "function";
}

export async function call<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  if (!internals?.invoke) {
    throw new KernelError(
      "不在 MCUGL 内核里运行：请用 MCUGL_FRONTEND 指向 dist/frontend 后重启启动器。",
      { method },
    );
  }
  try {
    return (await internals.invoke(method, args ?? {})) as T;
  } catch (error) {
    const detail = (typeof error === "object" && error !== null ? error : undefined) as
      | KernelErrorDetail
      | undefined;
    throw new KernelError(detail?.message ?? String(error), {
      method,
      code: detail?.code,
      detail,
    });
  }
}

export type KernelManifest = {
  protocol: string;
  apiVersion: string;
  appVersion: string;
  backend: string;
  transports: string[];
  methods: string[];
  events: unknown[];
  capabilities: Record<string, boolean>;
  limits: { planTtlSeconds: number };
  frontend: {
    mode: string;
    name: string;
    version: string;
    entry: string;
    identifier?: string;
    author?: string;
  } | null;
};

export function manifest(): Promise<KernelManifest> {
  return call<KernelManifest>("kernel_manifest");
}

export type OverviewSnapshot = {
  epoch: string;
  revision: number;
  data: {
    appVersion?: string;
    selectedInstanceId?: string | null;
    [key: string]: unknown;
  };
};

export function overview(): Promise<OverviewSnapshot> {
  return call<OverviewSnapshot>("get_overview");
}
