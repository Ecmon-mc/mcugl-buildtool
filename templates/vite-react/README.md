# {{name}}

A third-party frontend for MCUGL Launcher, generated from the `vite-react` template.

- Identifier: `{{identifier}}`
- Version: `{{version}}`

This template is also the **reference implementation** of the kernel API: it exposes the full
`mcugl.kernel/v1` surface — all 66 kernel methods plus the 4 host-side frontend commands — as a
clickable UI, so you can verify a launcher build end to end without writing any code. Replacing
`src/actions.ts` or the pages is expected; keeping the coverage is the point.

## What is inside

- `frontend/src/kernel.ts` — `call<T>(command, args)`, `manifest()`, `overview()`, `KernelError`, and
  the `__TAURI_INTERNALS__` / `__MCUGL__` types.
- `frontend/src/actions.ts` — the data-driven catalog: one entry per command, with field definitions
  (`text` / `number` / `boolean` / `json`) and shared bindings for instance / account / server / task
  / session / plan / revision IDs.
- `frontend/src/ActionCard.tsx` — renders a catalog entry as a form and sends the typed arguments.
- `frontend/src/App.tsx` — page shell: kernel manifest, coverage indicator, shared parameter bar, tab
  groups, and a raw result panel.
- No custom CSS: everything is built from Chakra UI v3 primitives (`defaultSystem`), so the template is
  a pure "can I click it" baseline.

## Development

```powershell
npm install
npm run dev            # vite build --watch; output keeps landing in dist/frontend
```

Then start the launcher with the frontend directory pointing at the build output:

```powershell
$env:MCUGL_FRONTEND = "D:\path\to\{{packageName}}\dist\frontend"
```

The log prints `[mcugl] 前端（directory）：{{name}} …`. After the watch build finishes, refresh the
window (responses use `no-store`, so stale files are never cached). To return to the official
frontend, clear `MCUGL_FRONTEND` and restart.

> Why not `vite dev`? The launcher serves the frontend from disk through its `mcugl` protocol, not
> from the Vite HTTP server, so the development loop is "watch build + refresh window" and `base` must
> stay `./`.

## Using the reference UI

1. The top card reports `kernel_manifest`: protocol, `apiVersion`, `appVersion`, backend, transports,
   current frontend mode, and the coverage counter.
2. The shared bar beneath it holds `instance_id`, `account_id`, `server id`, `task id`, `session_id`,
   `plan_id`, and `expected_revision`. Every command card binds to these values, so you fill an ID once
   and every action using it follows.
3. Tabs group the commands: 概览 / 实例 / 账号 / 启动 / 内容 / 任务 / 设置 / 前端. Each card builds the
   exact argument object and shows the raw JSON response (or the structured `ApiError`) in the result
   panel on the right.
4. `expected_revision` is filled automatically from `get_settings`; the 读取 revision button refreshes
   it after a write.
5. JSON fields exist for the commands that take structured objects (`save_settings.patch`,
   `save_custom_sources.sources`, `save_launch_options.settings`, `save_recommendations.items`,
   `preview_updates.projects`).

## Functional parity

A distributable frontend is expected to cover **every method in `kernel_manifest.methods`**; dropping
one silently removes a user-facing feature. The catalog in `src/actions.ts` is the baseline, and the
page shows `covered/total` plus any missing method name. Two facts to keep in mind:

- The demo backend answers 28 write commands with `UNSUPPORTED`. That is a backend capability limit,
  not a frontend bug: display the error code and say so, do not hide the entry.
- `list_frontends`, `install_frontend`, `use_frontend`, and `remove_frontend` are host management
  commands: they are not part of the 66-method kernel table, but the settings UI relies on them.

See `MCUGLauncher/docs/KERNEL_API_V1.md` §4.5 and `FRONTEND_PACKAGE.md` §6.1 in the launcher repository.

## API

- Method semantics: `MCUGLauncher/docs/KERNEL_API_V1.md` and `BACKEND_CONTRACT.md`.
- Package format: `MCUGLauncher/docs/FRONTEND_PACKAGE.md`.
- The page runs at `http://mcugl.localhost/` on Windows and `mcugl://localhost/` elsewhere; that is a
  local origin, so `invoke` works without a Tauri capability or remote-domain allowlist.

## Packaging

```powershell
npm run build          # type check + build into dist/frontend
npm run pack           # dist/frontend -> dist-frontends/{{identifier}}-{{version}}.mcuglf
```

In the launcher, open **Settings → Developer options → Frontend (third-party UI) → Import package…**,
choose **Use**, then restart.

## Layout

```text
{{packageName}}/
├─ frontend/                 # source (Vite root)
│  ├─ frontend.json          # manifest (copied into the build output)
│  ├─ index.html
│  └─ src/{main.tsx, App.tsx, kernel.ts, actions.ts, ActionCard.tsx}
├─ dist/frontend/            # build output = a directory the launcher can load
├─ scripts/pack.mjs          # zero-dependency packer
├─ vite.config.ts            # base "./", outDir ../dist/frontend
└─ tsconfig.json
```
