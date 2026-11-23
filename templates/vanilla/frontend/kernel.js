// invoke 的薄封装：页面只依赖这几个函数，不直接碰 __TAURI_INTERNALS__。
const internals = globalThis.__TAURI_INTERNALS__;

export class KernelError extends Error {
  constructor(message, { method, code, detail } = {}) {
    super(message);
    this.name = "KernelError";
    this.method = method;
    this.code = code;
    this.detail = detail;
  }
}

export function kernelAvailable() {
  return typeof internals?.invoke === "function";
}

export async function call(method, args) {
  if (!kernelAvailable()) {
    throw new KernelError(
      "不在 MCUGL 内核里运行：请用 MCUGL_FRONTEND 指向本目录后重启启动器。",
      { method },
    );
  }
  try {
    return await internals.invoke(method, args ?? {});
  } catch (error) {
    const detail = typeof error === "object" && error !== null ? error : undefined;
    throw new KernelError(detail?.message ?? String(error), {
      method,
      code: detail?.code,
      detail,
    });
  }
}

export function manifest() {
  return call("kernel_manifest");
}

export function overview() {
  return call("get_overview");
}
