# @orbitlab/desktop

Thin **Tauri 2** shell around `@orbitlab/web`.

- **Same UI** as the browser app (`apps/web`)
- **Same engine** as web (`packages/sim-core`)
- **Offline by default** — web app uses the **memory** data backend (guest auth + in-memory designs/sim runs) unless you point it at PocketBase

This package does **not** reimplement product logic. It only hosts the web frontend in a native window.

## Prerequisites (macOS)

| Tool | Notes |
|------|--------|
| **Node.js** ≥ 20 | `node -v` |
| **pnpm** 9+ | monorepo uses `packageManager: pnpm@9.15.0` |
| **Rust** (stable) | [rustup](https://rustup.rs/) → `rustc --version` |
| **Xcode CLT** | `xcode-select --install` (WebView / linking) |

Optional system packages (usually already present on modern macOS with Xcode CLT):

```bash
# Apple Silicon / Intel — confirm toolchain
rustc --version
cargo --version
```

Install Rust if missing:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

## Install monorepo deps

From the **repo root**:

```bash
cd /path/to/orbitlab
pnpm install
```

That pulls `@tauri-apps/cli` for this package via the workspace.

## Dev (desktop window + Vite)

From repo root:

```bash
pnpm desktop:dev
```

Or from this package:

```bash
pnpm --filter @orbitlab/desktop dev
```

What happens:

1. Tauri runs `pnpm --filter @orbitlab/web dev` (Vite on **http://localhost:5173**)
2. Opens a native window pointed at that URL

Header badge in the UI should show **MEMORY** when no PocketBase env is set — that is the offline path.

### Two-terminal alternative

If `beforeDevCommand` is awkward in your shell:

```bash
# terminal 1
pnpm dev

# terminal 2 — temporarily clear beforeDevCommand or just rely on existing Vite:
pnpm --filter @orbitlab/desktop tauri dev
```

## Production build (macOS)

```bash
# repo root
pnpm desktop:build
```

Or:

```bash
pnpm --filter @orbitlab/desktop build
```

This runs `pnpm --filter @orbitlab/web build`, then bundles `apps/web/dist` into a native app.

Artifacts typically land under:

```text
apps/desktop/src-tauri/target/release/bundle/
```

(e.g. `.app` / `.dmg` depending on targets).

First Rust build can take several minutes; later builds are faster.

## Architecture notes

```text
┌─────────────────────────────┐
│  Tauri window (this app)    │
│  loads apps/web UI          │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  apps/web (React + Vite)    │
│  composition root + DI      │
└─────────────┬───────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
 sim-core          memory backend
 (calc pipeline)   (offline default)
                   or PocketBase
```

- **No secrets required** to run offline.
- PocketBase is optional (same as web): set `VITE_DATA_BACKEND=pocketbase` and `VITE_POCKETBASE_URL=...` for the web build/dev if you want cloud/local BaaS inside the desktop shell.

## Icons

Placeholder Tauri default icons ship under `src-tauri/icons/`. Replace with brand assets later:

```bash
pnpm --filter @orbitlab/desktop tauri icon path/to/orbitlab-1024.png
```

## Docs

See [docs/DESKTOP.md](../../docs/DESKTOP.md) for the product-level desktop plan and Mac command checklist.

## Status

**Scaffold only** — ready for `pnpm desktop:dev` once Rust + Xcode CLT are installed. No custom Rust commands yet; native features (file dialogs, auto-update, deep links) can be added later without changing sim-core.
