/**
 * Kernel contract types that are not generated from `schemas/`:
 * the manifest returned by `kernel_manifest`, the runtime info injected into
 * `window.__MCUGL__`, and the host management commands used by the settings UI.
 */
/** What the launcher injects into the page before any frontend code runs. */
export interface KernelRuntimeInfo {
    apiVersion: string;
    protocol: string;
    frontend: FrontendInfo | null;
}
/** A loaded frontend, as reported by `kernel_manifest`. */
export interface FrontendInfo {
    /** `"official"`, `"directory"` or `"package"`. */
    mode: string;
    name: string;
    version: string;
    entry: string;
    identifier?: string;
    author?: string;
    icon?: string;
}
export interface KernelLimits {
    /** Seconds a preview plan (install/uninstall/update) stays valid. */
    planTtlSeconds: number;
}
/** `kernel_manifest` payload — the authoritative list of what the kernel offers. */
export interface KernelManifest {
    protocol: "mcugl.kernel/v1" | string;
    apiVersion: string;
    appVersion: string;
    /** `"demo"` for the in-memory sample backend, `"live"` otherwise. */
    backend: string;
    transports: string[];
    methods: string[];
    events: string[];
    capabilities: Record<string, boolean>;
    limits: KernelLimits;
    frontend: FrontendInfo | null;
}
/** One installed frontend package (host management API). */
export interface FrontendSummary {
    identifier: string;
    name: string;
    version: string;
    kernelApi: string;
    entry: string;
    author?: string;
    description?: string;
    homepage?: string;
    /** Currently selected in the launcher settings. */
    active: boolean;
    /** The package ships an icon (read it with `read_frontend_icon`). */
    hasIcon: boolean;
}
export interface FrontendList {
    active: string | null;
    items: FrontendSummary[];
}
