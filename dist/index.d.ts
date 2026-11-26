/**
 * @mcugl/frontpack-sdk — typed client for the MCUGL Launcher kernel.
 *
 * Compatible with `mcugl.kernel/v1`: snake_case command names, camelCase
 * arguments, `ApiError`, `SavedInfo` and resource snapshots are unchanged.
 */
export { ALL_COMMANDS, HOST_COMMANDS, KERNEL_METHODS, type CommandArgs, type CommandArgsMap, type CommandName, type CommandResult, type CommandResultMap, type Snapshot, } from "./commands.js";
export { KernelError, createKernel, kernelAvailable, kernelRuntime, kernelTransport, toKernelError, type ArgsTuple, type Kernel, type KernelCore, type KernelErrorCode, type KernelMethods, type KernelOptions, type KernelTransport, type TauriInternals, } from "./client.js";
export type { FrontendInfo, FrontendList, FrontendSummary, KernelLimits, KernelManifest, KernelRuntimeInfo, } from "./manifest.js";
export * from "./methods.js";
