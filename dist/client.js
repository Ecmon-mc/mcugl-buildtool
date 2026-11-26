import { METHOD_NAMES } from "./methods.js";
/**
 * Normalized failure from a kernel call. `code`, `retryable` and `fieldErrors`
 * come from the launcher's `ApiError`; everything else is context added here.
 */
export class KernelError extends Error {
    code;
    command;
    retryable;
    fieldErrors;
    detail;
    constructor(message, options) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "KernelError";
        this.code = options.code;
        this.command = options.command;
        this.retryable = options.retryable ?? false;
        this.fieldErrors = options.fieldErrors;
        this.detail = options.detail;
    }
}
function holder() {
    return globalThis;
}
/** The launcher's transport, or `null` when the page is not inside MCUGL. */
export function kernelTransport() {
    const internals = holder().__TAURI_INTERNALS__;
    return internals && typeof internals.invoke === "function" ? internals : null;
}
export function kernelAvailable() {
    return kernelTransport() !== null;
}
export function kernelRuntime() {
    return holder().__MCUGL__ ?? null;
}
function isApiError(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const candidate = value;
    return typeof candidate.code === "string" && typeof candidate.message === "string";
}
/** Turn a rejected `invoke` (usually an `ApiError`) into a `KernelError`. */
export function toKernelError(command, error) {
    if (error instanceof KernelError)
        return error;
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
export function createKernel(options = {}) {
    const transport = options.transport ?? kernelTransport();
    const call = async (command, ...args) => {
        if (!transport) {
            throw new KernelError("MCUGL kernel is not available: open this frontend inside MCUGL Launcher " +
                "(npm run tauri dev), or pass a custom transport for development.", { code: "KERNEL_UNAVAILABLE", command });
        }
        const payload = args[0];
        try {
            return await transport.invoke(command, payload);
        }
        catch (error) {
            throw toKernelError(command, error);
        }
    };
    const untypedCall = call;
    const bound = {};
    for (const [command, name] of Object.entries(METHOD_NAMES)) {
        bound[name] = (...args) => untypedCall(command, ...args);
    }
    return {
        available: transport !== null,
        transport,
        call,
        manifest: () => call("kernel_manifest"),
        runtime: kernelRuntime,
        ...bound,
    };
}
