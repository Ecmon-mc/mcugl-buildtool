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
export declare class KernelError extends Error {
    readonly code: KernelErrorCode;
    readonly command: string;
    readonly retryable: boolean;
    readonly fieldErrors?: Record<string, string>;
    readonly detail: unknown;
    constructor(message: string, options: {
        code: KernelErrorCode;
        command: string;
        retryable?: boolean;
        fieldErrors?: Record<string, string>;
        detail?: unknown;
        cause?: unknown;
    });
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
export type ArgsTuple<C extends CommandName> = [CommandArgs<C>] extends [undefined] ? [] : AllOptional<CommandArgs<C>> extends true ? [args?: CommandArgs<C>] : [args: CommandArgs<C>];
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
    [C in KernelCommand as (typeof METHOD_NAMES)[C]]: (...args: ArgsTuple<C>) => Promise<CommandResult<C>>;
};
export type Kernel = KernelCore & KernelMethods;
/** The launcher's transport, or `null` when the page is not inside MCUGL. */
export declare function kernelTransport(): KernelTransport | null;
export declare function kernelAvailable(): boolean;
export declare function kernelRuntime(): KernelRuntimeInfo | null;
/** Turn a rejected `invoke` (usually an `ApiError`) into a `KernelError`. */
export declare function toKernelError(command: string, error: unknown): KernelError;
/**
 * Create a typed kernel client.
 *
 * ```ts
 * const kernel = createKernel();
 * if (!kernel.available) showErrorScreen();
 * const overview = await kernel.call("get_overview");
 * ```
 */
export declare function createKernel(options?: KernelOptions): Kernel;
export {};
