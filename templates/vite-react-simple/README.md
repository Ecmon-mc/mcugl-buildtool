# {{name}}

A launcher-like MCUGL frontend built with Vite + React + TypeScript. It is the
`vite-react` stack with the **simple** layout: home, instances, accounts,
settings and a **commands** page.

The pages wire the commands a launcher UI usually needs (`get_overview`,
`list_instances`, `list_accounts`, `list_tasks`, `select_instance`,
`select_account`, `launch_game`, `kernel_manifest`). The commands page is the
escape hatch: pick any of the 66 methods from `mcugl.kernel/v1`, edit its JSON
arguments, and run it. Because every method is reachable, `npm run pack` passes
the coverage gate without `--allow-incomplete`; use the commands page as the
starting point when you promote one of those calls into a first-class screen.

## Development

```bash
npm install
npm run build        # typecheck + build into dist/frontend
npm run dev          # same, in watch mode
```

Point the launcher at the build output:

```powershell
$env:MCUGL_FRONTEND = "$PWD\dist\frontend"
```

`frontend.json` is copied into `dist/frontend` by the build, so the output
folder is a complete frontend directory.

## Using it from the launcher

1. `npm run build`
2. `npm run pack` (no flag needed — all 66 methods are covered)
3. Import the `.mcuglf` in the launcher under Settings → Developer options →
   Frontend, then restart.

`Ctrl+Alt+C` forces the launcher back to the official frontend at any time.

## Layout

```
frontend/index.html
frontend/frontend.json      # created by the scaffolder
frontend/src/main.tsx       # Chakra provider + mount
frontend/src/App.tsx        # topbar, pages, launch button, toast
frontend/src/kernel.ts      # typed bridge to window.__TAURI_INTERNALS__
vite.config.ts              # builds to dist/frontend and copies frontend.json
```

## What to keep from this template

- `base: "./"` and the `copyManifest` plugin — required for the custom protocol.
- `kernel.ts` — the bridge is the same in every MCUGL frontend.
- The launcher-like layout: fixed top navigation, content column, bottom-right
  launch button, transient toast.

Everything else (routing, state management, styling, i18n) is yours.
