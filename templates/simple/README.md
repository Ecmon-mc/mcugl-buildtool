# {{name}}

A minimal third-party frontend for MCUGL Launcher, laid out like the built-in UI:
a top bar with navigation, a home overview, instance and account pickers, a
settings page, a floating launch button, and toasts. No build step, no
dependencies — plain HTML, CSS, and ES modules.

## Layout

- `frontend/index.html` — shell: top bar, navigation, view container, launch button.
- `frontend/app.js` — loads the overview, instances, accounts, and tasks; renders
  each page; handles selection, launch, and log reading.
- `frontend/kernel.js` — thin wrapper over `window.__TAURI_INTERNALS__.invoke`.
- `frontend/styles.css` — small, readable stylesheet (safe to replace).

## Run it

```powershell
# development: point the launcher at the source directory
$env:MCUGL_FRONTEND = "D:\path\to\{{packageName}}\frontend"
# restart MCUGL Launcher, then refresh the window after changes (no cache)

# one-off package: dist-frontends/<identifier>-<version>.mcuglf
npm run build
```

Import the resulting `.mcuglf` from the launcher under
**Settings → Developer options → Frontend (third-party UI)**, then restart.

## Commands used

`kernel_manifest`, `get_overview`, `list_instances`, `list_accounts`,
`select_instance`, `select_account`, `launch_game`, `read_log` (plus
`list_tasks` when the backend provides it). The demo backend answers many
mutating commands with `UNSUPPORTED`; that is expected.

## Scope

This template is a layout starting point, not a complete launcher: it covers the
core flow and leaves install, content, updates, and settings to you. For the
full command surface (all 66 kernel methods plus host frontend commands) and a
data-driven action console, see the `vite-react` template in the same
repository. A distributable frontend is expected to reach functional parity —
see `MCUGLAUNCHER/docs/FRONTEND_PACKAGE.md` §6.1.

## API

- Contract: `MCUGLAUNCHER/docs/KERNEL_API_V1.md`
- Packaging: `MCUGLAUNCHER/docs/FRONTEND_PACKAGE.md`
