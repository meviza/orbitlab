# Desktop offline checklist

OrbitLab desktop is a **Tauri 2** shell around `apps/web`. Offline mode is the **default**: no PocketBase, no secrets, no network BaaS.

Product-level desktop plan and full Mac checklist: [docs/DESKTOP.md](../../../docs/DESKTOP.md).

---

## What “offline” means

| Item | Offline default |
|------|-----------------|
| **Data backend** | **MEMORY** — guest auth + in-memory designs / sim runs |
| **UI** | Same React app as browser (`apps/web`) |
| **Physics** | Same engine (`packages/sim-core`) |
| **PocketBase** | **Not required** |
| **Secrets / env** | None required for the demo path |

Confirm in the app header badge: **MEMORY** (not **POCKETBASE**).

Do **not** set these for offline:

```bash
# leave unset / do not export for offline
# VITE_DATA_BACKEND=pocketbase
# VITE_POCKETBASE_URL=...
```

Optional explicit memory mode (same as default):

```bash
export VITE_DATA_BACKEND=memory
```

---

## Prerequisites for `pnpm desktop:dev`

| Tool | Check | Install (macOS) |
|------|--------|-----------------|
| **Node.js** ≥ 20 | `node -v` | nodejs.org or preferred version manager |
| **pnpm** 9+ | `pnpm -v` | monorepo pins `pnpm@9.15.0` |
| **Rust** (stable) | `rustc --version` / `cargo --version` | [rustup](https://rustup.rs/) |
| **Xcode CLT** | `xcode-select -p` | `xcode-select --install` |

Install Rust if missing:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

Install Xcode Command Line Tools if missing (WebKit / linker for Tauri):

```bash
xcode-select --install
```

---

## No PocketBase required

Offline desktop does **not** need:

- `pnpm pb:download` / `pnpm pb:serve`
- Docker PocketBase
- Admin email/password (`PB_ADMIN_*`)
- Schema import
- Any remote BaaS URL

Those paths are for optional **online / local BaaS** only. See package README and [docs/DESKTOP.md](../../../docs/DESKTOP.md) § Offline vs online if you later want PocketBase inside the shell.

---

## 5-step quickstart

1. **Install toolchain** — Node ≥ 20, pnpm 9+, Rust (rustup), Xcode CLT (`xcode-select --install`).
2. **Clone / open monorepo root** and install deps: `pnpm install`.
3. **Do not start PocketBase** — leave `VITE_DATA_BACKEND` unset (or `memory`). No `PB_*` env needed.
4. **Launch desktop**: from repo root run `pnpm desktop:dev` (first Rust build can take several minutes).
5. **Verify offline** — native window opens on Vite (`http://localhost:5173`); header badge shows **MEMORY**; create a design / run sim without any BaaS.

Done. For packaging later: `pnpm desktop:build` (still no PB required for the memory path).

---

## Related

- [docs/DESKTOP.md](../../../docs/DESKTOP.md) — desktop architecture, Mac checklist, offline vs online
- [apps/desktop/README.md](../README.md) — package-level install / dev / build
- Root `package.json` scripts: `desktop:dev`, `desktop:build`
