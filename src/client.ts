import type { ApiError } from "./generated.js";
import type { CommandArgs, CommandName, CommandResult } from "./commands.js";
import type { KernelManifest, KernelRuntimeInfo } from "./manifest.js";
import { METHOD_NAMES, type KernelCommand } from "./methods.js";

/** Kernel error codes plus the two the SDK itself can raise. */
export type KernelErrorCode = ApiError["code"] | "KERNEL_UNAVAILABLE" | "UNKNOWN";

/**
 * Normalized failure from a kernel call. `code`, `retryable` and `fieldErrors`
 * come from the launcher's `ApiError`; everything else is context added here.
 */
export class KernelError extends Error {
  readonly code: KernelErrorCode;
  readonly command: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;
  readonly detail: unknown;

  constructor(
    message: string,
    options: {
      code: KernelErrorCode;
      command: string;
      retryable?: boolean;
      fieldErrors?: Record<string, string>;
      detail?: unknown;
      cause?: unknown;
    },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "KernelError";
    this.code = options.code;
    this.command = options.command;
    this.retryable = options.retryable ?? false;
    this.fieldErrors = options.fieldErrors;
    this.detail = options.detail;
  }
}

/** The subset of `__TAURI_INTERNALS__` the SDK uses. */
export interface TauriInternals {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface KernelTransport {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface KernelOptions {
  /** Override the transport (tests, a demo backend, an iframe bridge…). */
  transport?: KernelTransport;
}

type AllOptional<T> = Partial<T> extends T ? true : false;

/** No-argument commands take no second parameter; all-optional ones may omit it. */
export type ArgsTuple<C extends CommandName> = [CommandArgs<C>] extends [undefined]
  ? []
  : AllOptional<CommandArgs<C>> extends true
    ? [args?: CommandArgs<C>]
    : [args: CommandArgs<C>];

export interface KernelCore {
  /** True when the page runs inside MCUGL Launcher. */
  readonly available: boolean;
  readonly transport: KernelTransport | null;
  call<C extends CommandName>(command: C, ...args: ArgsTuple<C>): Promise<CommandResult<C>>;
  manifest(): Promise<KernelManifest>;
  /** `window.__MCUGL__`, injected by the launcher; `null` for the official UI. */
  runtime(): KernelRuntimeInfo | null;
}

/** One method per kernel command, e.g. `kernel.getOverview()`. */
export type KernelMethods = {
  [C in KernelCommand as (typeof METHOD_NAMES)[C]]: (
    ...args: ArgsTuple<C>
  ) => Promise<CommandResult<C>>;
};

export type Kernel = KernelCore & KernelMethods;

type InternalsHolder = {
  __TAURI_INTERNALS__?: TauriInternals;
  __MCUGL__?: KernelRuntimeInfo | null;
};

function holder(): InternalsHolder {
  return globalThis as unknown as InternalsHolder;
}

/** The launcher's transport, or `null` when the page is not inside MCUGL. */
export function kernelTransport(): KernelTransport | null {
  const internals = holder().__TAURI_INTERNALS__;
  return internals && typeof internals.invoke === "function" ? internals : null;
}

export function kernelAvailable(): boolean {
  return kernelTransport() !== null;
}

export function kernelRuntime(): KernelRuntimeInfo | null {
  return holder().__MCUGL__ ?? null;
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

/** Turn a rejected `invoke` (usually an `ApiError`) into a `KernelError`. */
export function toKernelError(command: string, error: unknown): KernelError {
  if (error instanceof KernelError) return error;
  if (isApiError(error)) {
    return new KernelError(error.message, {
      code: error.code,
      command,
      retryable: error.retryable,
      fieldErrors: error.fieldErrors,
      detail: error,
    });
  }
  if (error instanceof Error) {
    return new KernelError(error.message || "Kernel call failed", {
      code: "UNKNOWN",
      command,
      detail: error,
      cause: error,
    });
  }
  if (typeof error === "string" && error.trim() !== "") {
    return new KernelError(error, { code: "UNKNOWN", command, detail: error });
  }
  return new KernelError("Kernel call failed", { code: "UNKNOWN", command, detail: error });
}

/**
 * Create a typed kernel client.
 *
 * ```ts
 * const kernel = createKernel();
 * if (!kernel.available) showErrorScreen();
 * const overview = await kernel.call("get_overview");
 * ```
 */
export function createKernel(options: KernelOptions = {}): Kernel {
  const transport = options.transport ?? kernelTransport();

  const call = async <C extends CommandName>(
    command: C,
    ...args: ArgsTuple<C>
  ): Promise<CommandResult<C>> => {
    if (!transport) {
      throw new KernelError(
        "MCUGL kernel is not available: open this frontend inside MCUGL Launcher " +
          "(npm run tauri dev), or pass a custom transport for development.",
        { code: "KERNEL_UNAVAILABLE", command },
      );
    }
    const payload = (args as readonly unknown[])[0] as Record<string, unknown> | undefined;
    try {
      return await transport.invoke<CommandResult<C>>(command, payload);
    } catch (error) {
      throw toKernelError(command, error);
    }
  };

  const untypedCall = call as (
    command: CommandName,
    ...args: unknown[]
  ) => Promise<unknown>;
  const bound: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  for (const [command, name] of Object.entries(METHOD_NAMES)) {
    bound[name] = (...args: unknown[]) => untypedCall(command as CommandName, ...args);
  }

  return {
    available: transport !== null,
    transport,
    call,
    manifest: () => call("kernel_manifest"),
    runtime: kernelRuntime,
    ...bound,
  } as Kernel;
}
