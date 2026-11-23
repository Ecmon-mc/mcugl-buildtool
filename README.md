# mcugl-buildtool

Scaffold, run and package **third-party frontends for MCUGL Launcher**.

A generated project is plain static files — no Rust rebuild, no launcher fork. During development,
point `MCUGL_FRONTEND` at the frontend directory; to distribute, pack it as a `.mcuglf` and import it
from the launcher's settings page.

The tool currently lives in the MCUGL repository at `mcugl-buildtool/` and is **not published to npm
yet**. Inside the repo you can run it directly:

```powershell
node .\mcugl-buildtool\bin\mcugl-buildtool.mjs my-frontend
```

After publishing, the same thing is `npx mcugl-buildtool my-frontend`.

> **This package has no build step of its own.** Running `npm run build` inside `mcugl-buildtool/`
> only prints an explanation. Real builds happen in the generated project: `vite-react` compiles with
> Vite, while `vanilla` treats `npm run build` as an alias of `npm run pack`.
> `npx mcugl-buildtool` works from any directory.

## Interactive wizard

Run the tool with no arguments in a real terminal and it opens a guided wizard, similar to SJMCL's
`create-sjmcl-extension`: language → project directory → template → frontend identifier → display name →
description → author → version. Use ↑/↓ to move, Enter to confirm, Esc or Ctrl+C to cancel. If the
target directory is not empty, you are asked before anything is overwritten.

The wizard is implemented in-package with zero dependencies (`lib/keys.mjs` for key handling,
`lib/ui.mjs` for rendering and prompts, `lib/wizard.mjs` for the flow, `lib/i18n.mjs` for copy), so it
needs no `npm install`. Redirected input/output, `--yes`, or a CI environment automatically fall back to
flags/readline, which keeps scripted usage stable.

## Languages

The interface is **English by default**. The wizard's first question switches it, and scripts can pass
`--lang zh` (or set `MCUGL_LANG=zh`). Without an explicit setting, the tool only uses Chinese when the
system locale (`LANG`/`LC_ALL`) clearly asks for it.

## Usage

```text
mcugl-buildtool [directory] [options]

  -t, --template <name>    vanilla (default) | simple | vite-react
      --identifier <id>    reverse-DNS id, e.g. com.example.my-frontend
      --name <name>        display name
      --description <text> description (optional)
      --author <name>      author (optional)
      --version <semver>   version, default 0.1.0
  -y, --yes                use defaults, no prompts
  -f, --force              overwrite a non-empty target directory
  -l, --lang <en|zh>       interface language (default: English)
  -h, --help               show this help
```

Examples:

```powershell
npx mcugl-buildtool my-frontend --yes
npx mcugl-buildtool my-frontend -t vite-react --identifier com.example.demo --name "Demo Frontend"
npx mcugl-buildtool my-frontend --yes --lang zh
```

## Templates

### `vanilla`

No dependencies; edit a file and refresh the launcher window:

```text
my-frontend/
├─ frontend/               # the launcher loads this directory directly
│  ├─ frontend.json
│  ├─ index.html
│  ├─ kernel.js            # thin invoke wrapper + KernelError
│  ├─ app.js               # kernel_manifest / get_overview example
│  └─ styles.css
├─ scripts/pack.mjs        # zero-dependency zip + sha256
└─ package.json            # npm run pack
```

```powershell
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\frontend"
```

### `simple`

A launcher-like starting point with **minimal CSS and no build step**: a top bar with
home/instances/accounts/settings navigation, an overview with counts, instance and account pickers,
a floating launch button, and toasts. It mirrors the official layout instead of the `vite-react`
command console, so it is the friendlier base for a custom launcher UI. It covers the core flow
(selection + launch + log), not the whole command surface — see [Functional parity](#functional-parity).

```text
my-frontend/
├─ frontend/
│  ├─ frontend.json
│  ├─ index.html            # shell: top bar, nav, view container, launch button, toast
│  ├─ kernel.js             # thin invoke wrapper + KernelError
│  ├─ app.js                # pages, selection, launch, log
│  └─ styles.css            # small, replaceable stylesheet
├─ scripts/pack.mjs
└─ package.json             # npm run pack / build
```

```powershell
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\frontend"
```

### `vite-react`

React 19 + TypeScript + Vite + Chakra UI. This template is also the **reference implementation** of
the kernel API: `frontend/src/actions.ts` lists all 66 kernel methods and the 4 host management
commands as clickable forms, so a fresh project can exercise the whole surface immediately. `npm run
dev` rebuilds into `dist/frontend` on change:

```text
my-frontend/
├─ frontend/               # Vite root (source)
│  ├─ frontend.json
│  ├─ index.html
│  └─ src/{main.tsx, App.tsx, kernel.ts, actions.ts, ActionCard.tsx}
├─ vite.config.ts          # base "./", outDir ../dist/frontend, copies frontend.json
├─ scripts/pack.mjs
└─ package.json
```

```powershell
npm install
npm run dev                # rebuild on change
$env:MCUGL_FRONTEND = "D:\path\to\my-frontend\dist\frontend"
```

> The launcher serves the frontend from disk through its `mcugl` protocol, not from the Vite dev
> server, so there is no HMR. The development loop is "rebuild on change, then refresh the window".

## Functional parity

A third-party frontend replaces the official UI, so it has to expose the official capabilities itself.
The rule for a distributable frontend is: **cover every method in `kernel_manifest.methods`** (66 in
`mcugl.kernel/v1`). Missing entries silently remove features from the user's launcher, and there is no
kernel-side fallback UI.

- `vite-react` is the baseline: its `actions.ts` catalog is the checklist, and the page shows
  `covered/total` plus any missing method.
- `simple` and `vanilla` are layout starting points; extend them with the missing commands before
  shipping.
- The demo backend answers 28 write commands with `UNSUPPORTED`; show that error instead of hiding the
  action.
- Before packing, diff your catalog against `kernel_manifest.methods`; the reference template makes that
  diff visible at runtime.
- This is a review/documentation rule, not a kernel-enforced one. Details in
  `MCUGLauncher/docs/KERNEL_API_V1.md` §4.5 and `FRONTEND_PACKAGE.md` §6.1.

## Packaging and installing

```powershell
npm run pack
# dist-frontends/<identifier>-<version>.mcuglf
```

In the launcher: **Settings → Developer options → Frontend (third-party UI) → Import package…**, then
choose **Use** and restart. For development, `MCUGL_FRONTEND` can also point straight at a `.mcuglf`
file; the launcher unpacks it into `.dev/` inside its data directory.

## What the generated project relies on

- `frontend.json`: `identifier` (3–128 ASCII letters, digits and `. - _`; reverse-DNS; avoid Windows
  reserved names), `name`, `version` (semver), `kernelApi` (default `^1.0.0`), `entry` (default
  `index.html`).
- Pages run at `http://mcugl.localhost/` on Windows and `mcugl://localhost/` elsewhere. That is a
  local origin, so `invoke` works without a Tauri capability or a remote-domain allowlist.
- `kernel.js` / `kernel.ts` is only a thin wrapper around `__TAURI_INTERNALS__.invoke`, used to
  normalize errors. Method semantics live in `docs/KERNEL_API_V1.md` and `docs/BACKEND_CONTRACT.md`
  in the MCUGL repository.

## FAQ

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm run build` → `Missing script: "build"` | You ran it inside `mcugl-buildtool/`, or in a `vanilla` project generated by an older version | Build in the generated project: `vite-react` uses `npm install && npm run build`; `vanilla` uses `npm run pack` (newer templates alias `build` to it) |
| `vite: not found` | Dependencies were not installed | Run `npm install` in the generated project first |
| The launcher does not load my frontend | `MCUGL_FRONTEND` points at the wrong directory, or the manifest is invalid | Point it at the directory containing `frontend.json` (`dist/frontend` for `vite-react`) and check the launcher log for `[mcugl] frontend (directory/package): …` |

## Tests

```powershell
npm test
```

The suite generates all three template projects, packs the `vanilla` and `simple` ones, and checks the
zip header and artifact name. It also drives the key state machines, the three prompts, the full wizard
through a fake terminal, and the i18n catalogs (23 cases).
