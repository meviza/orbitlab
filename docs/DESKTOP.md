# OrbitLab Desktop

Last updated: 2026-07-12

## Summary

Desktop is a **thin Tauri 2 shell** around the existing web presentation layer:

| Piece | Location | Role |
|-------|----------|------|
| Shell | `apps/desktop` | Native window, packaging |
| UI | `apps/web` | React + Vite composition root |
| Physics | `packages/sim-core` | Same module pipeline as browser |
| Offline data | web **memory** adapters | Guest auth, in-memory designs / sim runs |

**Offline = memory backend.** No PocketBase and no user secrets are required for the default demo path. Pro licensing against the same account as web can come later (see [PRODUCT.md](./PRODUCT.md), [ARCHITECTURE.md](./ARCHITECTURE.md)).

## Why Tauri (not Electron)

- Smaller install size
- System WebView instead of shipping Chromium
- Fits monorepo: shell owns almost no product code

## Layout

```text
apps/desktop/
├── package.json              # @orbitlab/desktop — scripts: dev, build
├── README.md                 # install + Mac commands
└── src-tauri/
    ├── Cargo.toml            # tauri 2
    ├── tauri.conf.json       # devUrl → :5173, frontendDist → apps/web/dist
    ├── capabilities/
    ├── icons/                # placeholder brand icons
    └── src/
        ├── main.rs
        └── lib.rs            # Builder::default() only
```

Config highlights (`src-tauri/tauri.conf.json`):

- **Dev:** `devUrl` = `http://localhost:5173`, `beforeDevCommand` starts `@orbitlab/web`
- **Prod:** `beforeBuildCommand` builds `@orbitlab/web`, `frontendDist` = `../../web/dist`

## Mac install checklist

1. **Node 20+** and **pnpm 9+**
2. **Rust stable** via [rustup](https://rustup.rs/):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"
   rustc --version
   cargo --version
   ```

3. **Xcode Command Line Tools** (WebKit / linker):

   ```bash
   xcode-select --install
   ```

4. From monorepo root:

   ```bash
   pnpm install
   pnpm desktop:dev      # Vite + native window
   # later:
   pnpm desktop:build    # package apps/web/dist into .app / bundle
   ```

Exact package-level commands:

```bash
pnpm --filter @orbitlab/desktop dev
pnpm --filter @orbitlab/desktop build
pnpm --filter @orbitlab/desktop tauri icon path/to/1024.png   # optional rebrand
```

## Dev / build flow

```text
pnpm desktop:dev
  → tauri dev
    → pnpm --filter @orbitlab/web dev   # http://localhost:5173
    → open OrbitLab window on that URL

pnpm desktop:build
  → tauri build
    → pnpm --filter @orbitlab/web build # apps/web/dist
    → bundle dist into native app under src-tauri/target/release/bundle/
```

## Offline vs online

| Mode | How | Badge / data |
|------|-----|----------------|
| **Offline (default)** | No `VITE_DATA_BACKEND` / memory adapters | MEMORY — designs in process memory |
| **Local BaaS** | Same env as web (`VITE_DATA_BACKEND=pocketbase`, `VITE_POCKETBASE_URL=...`) | POCKETBASE — requires `pnpm pb:serve` or remote |

Desktop does not introduce a separate data layer. Whatever the web composition root uses is what the window shows.

## Non-goals (scaffold)

- Custom Rust commands / IPC for sim (sim stays in TS)
- Auto-updater, code signing, notarization (add when shipping)
- Embedding PocketBase binary as sidecar (optional later)
- Shipping GPL OpenRocket binaries

## Next steps for contributors

1. Run `pnpm desktop:dev` on Mac and confirm MEMORY offline path.
2. Replace placeholder icons with OrbitLab brand art.
3. Add signing / notarization for distribution builds.
4. Optional: file open/save for `*.orbit.json` via Tauri plugins (domain remains in TS).
5. Optional: license check against PocketBase token for pro packs (same entitlements model as web).

## Related

- Package README: [`apps/desktop/README.md`](../apps/desktop/README.md)
- Architecture desktop note: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Web app (wrapped UI): [`apps/web/README.md`](../apps/web/README.md)
