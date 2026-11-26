# @mcugl/frontpack-sdk

Typed client for the MCUGL Launcher kernel (`mcugl.kernel/v1`).

The SDK is a **types + transport** layer only. It does not bundle a UI, a
runtime dependency, or a demo backend: it calls the same Tauri commands the
launcher's own frontend calls, with the same names and arguments.

```ts
import { createKernel, KernelError } from "@mcugl/frontpack-sdk";

const kernel = createKernel();
if (!kernel.available) {
  // Not running inside MCUGL Launcher (plain browser / SSR / tests).
  showError("请通过 MCUGL Launcher 打开这个前端");
}

const overview = await kernel.getOverview();
const manifest = await kernel.manifest();
const runtime = kernel.runtime(); // window.__MCUGL__, or null for the official UI

try {
  await kernel.launchGame({ instanceId, accountId });
} catch (error) {
  if (error instanceof KernelError) {
    console.error(error.code, error.message, error.fieldErrors);
  }
}
```

## Compatibility

- Commands keep their **snake_case** names (`get_overview`, `launch_game`…).
- Arguments keep **camelCase** keys (`instanceId`, `expectedRevision`…).
- Results keep the launcher's shapes: resource snapshots (`{ epoch, revision, data }`),
  `SavedInfo`, and `ApiError` (surfaced as `KernelError`).
- `KERNEL_METHODS` is the 66-method table of `mcugl.kernel/v1`; `HOST_COMMANDS`
  covers the launcher's frontend-management commands. A drift check keeps the
  SDK table identical to the Rust kernel:

  ```bash
  npm run sdk:check   # node scripts/check-sdk.mjs + build + runtime check
  ```

## Methods on the kernel

Every one of the 66 kernel methods is also available directly on `kernel`,
named in camelCase. Each is a bound `kernel.call`, so types, arguments, and
errors are identical; `kernel.call` stays fully supported and the two can be
mixed freely.

```ts
import { createKernel } from "@mcugl/frontpack-sdk";

const kernel = createKernel();

const overview = await kernel.getOverview();          // get_overview
const tasks = await kernel.listTasks();               // list_tasks
const file = await kernel.pickFile({ title: "Select a file" }); // optional args
await kernel.launchGame({ instanceId, accountId });    // required args
await kernel.queueContentVersion({ token, versionId }); // queue_content_version

// Still equivalent:
const same = await kernel.call("get_overview");
```

`METHOD_NAMES` maps each wire command name to its kernel method name (explicit,
so minifiers cannot rename it). `METHOD_FUNCTIONS` maps each wire command name
to a free wrapper (`getOverview(kernel)`, …) that forwards to the same call.
Host commands (`list_frontends`…) are not part of the 66 and remain
`kernel.call(...)` only.

## Transport

`createKernel()` uses `globalThis.__TAURI_INTERNALS__`. Pass `transport` to
target something else — a test double, an iframe bridge, or a local mock:

```ts
const kernel = createKernel({
  transport: {
    invoke: async (command, args) => mockKernel[command](args),
  },
});
```

The launcher's Vite demo mode (`npm run dev:demo`) intercepts calls inside the
launcher's own `src/api/invoke.ts`; it does not inject `__TAURI_INTERNALS__`.
A generated frontend therefore needs its own transport (or the launcher's demo
build) if it wants to run outside the desktop shell.

## Build

```bash
npm run sdk:build    # emits packages/kernel-sdk/dist
npm run sdk:check    # drift check + typecheck, no output
npm run dto:generate # regenerates generated.ts from schemas/*.schema.json
```

`src/generated.ts` is produced by `scripts/generate-dto.mjs` and is shared with
the launcher's `src/types/generated.ts`. Do not edit it by hand.

## Status

The package is `private` and lives inside the launcher repository. It is not
published to npm yet; until it is, frontends can vendor `dist/` or copy
`src/` (it has no runtime dependencies).

## License

MIT
