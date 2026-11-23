# {{name}}

A third-party frontend for MCUGL Launcher (vanilla template, no build step).

- Identifier: `{{identifier}}`
- Version: `{{version}}`

## Development

1. Start the launcher with the frontend directory pointing at this project's `frontend/`:

   ```powershell
   $env:MCUGL_FRONTEND = "D:\path\to\{{packageName}}\frontend"
   ```

2. Start MCUGL Launcher. The log prints `[mcugl] 前端（directory）：{{name}} …`.
3. Edit files under `frontend/` and refresh the window (responses use `no-store`, so stale files are
   never cached).
4. To return to the official frontend, clear `MCUGL_FRONTEND` and restart.

## API

- `frontend/kernel.js` wraps `invoke`; use `call("method", args)` in your page.
- The method list and error shape are described in `KERNEL_API_V1.md` and `BACKEND_CONTRACT.md`.
- The page already calls `kernel_manifest` on load; use it to check the kernel version and capabilities.

## Packaging

```powershell
npm run pack     # or npm run build — vanilla has no compile step, so both are equivalent
```

The artifact is `dist-frontends/{{identifier}}-{{version}}.mcuglf`. In the launcher, open
**Settings → Developer options → Frontend (third-party UI) → Import package…**, choose **Use**, then
restart.

## Layout

```text
{{packageName}}/
├─ frontend/          # the directory the launcher loads
│  ├─ frontend.json   # manifest (identifier, version, kernel API range, entry)
│  ├─ index.html
│  ├─ kernel.js       # invoke wrapper
│  ├─ app.js          # example UI
│  └─ styles.css
├─ scripts/pack.mjs   # zero-dependency packer
└─ package.json
```
