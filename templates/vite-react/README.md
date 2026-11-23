# {{name}}

A third-party frontend for MCUGL Launcher (Vite + React + TypeScript template).

- Identifier: `{{identifier}}`
- Version: `{{version}}`

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

## API

- `src/kernel.ts`: `call<T>(method, args)`, `manifest()`, `overview()`, and `KernelError`.
- The page calls `kernel_manifest` on load; use it to check the kernel version, capabilities and the
  current load mode.
- Method semantics live in `KERNEL_API_V1.md` and `BACKEND_CONTRACT.md`; the package format is in
  `FRONTEND_PACKAGE.md`.

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
│  └─ src/{main.tsx, App.tsx, kernel.ts, styles.css}
├─ dist/frontend/            # build output = a directory the launcher can load
├─ scripts/pack.mjs          # zero-dependency packer
├─ vite.config.ts            # base "./", outDir ../dist/frontend
└─ tsconfig.json
```
