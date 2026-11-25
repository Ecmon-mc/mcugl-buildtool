// 内核桥接。
//
// 在 MCUGL 里，宿主会把 Tauri 的 IPC 注入到 `window.__TAURI_INTERNALS__`；
// 官方前端和第三方前端走同一条 invoke 路径。这里做三件事：
//   1. 探测内核是否存在；
//   2. 把内核返回的 ApiError 归一化成 KernelError（code / message / retryable）；
//   3. 没有内核时落到演示后端，这样这个包直接用浏览器打开也能玩。

import { demoInvoke, demoManifest } from "./demo.js";

const internals = globalThis.__TAURI_INTERNALS__;

/** 当前是否跑在启动器里。 */
export const KERNEL_AVAILABLE = Boolean(internals && typeof internals.invoke === "function");

export const MODE = KERNEL_AVAILABLE ? "kernel" : "demo";

/** 内核错误。字段与 mcugl.kernel/v1 的 ApiError 对齐。 */
export class KernelError extends Error {
  constructor(message, { code = "UNKNOWN", method = "", retryable = false, detail = null } = {}) {
    super(message);
    this.name = "KernelError";
    this.code = code;
    this.method = method;
    this.retryable = retryable;
    this.detail = detail;
  }
}

function toKernelError(raw, method) {
  if (raw instanceof KernelError) return raw;
  let value = raw;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("{")) {
      try {
        value = JSON.parse(text);
      } catch {
        value = { message: text };
      }
    } else {
      value = { message: text };
    }
  }
  if (value && typeof value === "object") {
    return new KernelError(value.message || value.error || `调用 ${method} 失败`, {
      code: value.code || "INTERNAL_ERROR",
      method,
      retryable: Boolean(value.retryable),
      detail: value.detail ?? value.fieldErrors ?? null,
    });
  }
  return new KernelError(String(raw ?? `调用 ${method} 失败`), { method });
}

/**
 * 调用一个内核方法。
 * @param {string} method
 * @param {Record<string, unknown>} [args] 参数对象，字段 camelCase
 */
export async function invoke(method, args = {}) {
  if (!KERNEL_AVAILABLE) return demoInvoke(method, args);
  try {
    return await internals.invoke(method, args ?? {});
  } catch (error) {
    throw toKernelError(error, method);
  }
}

/** 读取内核自描述。 */
export async function manifest() {
  if (!KERNEL_AVAILABLE) return demoManifest();
  return invoke("kernel_manifest");
}

/**
 * 查询类方法都返回 `{ epoch, revision, data }`；写命令直接返回 DTO。
 * 这个函数把两种形状都摊平成 data。
 */
export function unwrap(result) {
  if (result && typeof result === "object" && "data" in result && "revision" in result) {
    return result.data;
  }
  return result;
}

/** 从快照里拿修订号，写入类命令需要它做乐观并发控制。 */
export function revisionOf(result) {
  return result && typeof result === "object" && typeof result.revision === "number"
    ? result.revision
    : null;
}
