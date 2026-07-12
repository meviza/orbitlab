# CI for desktop (Tauri) — optional future workflow

Last updated: 2026-07-12

## Status

**Not enabled.** Main CI stays web-only:

| Workflow | File | Runs on | What it does |
|----------|------|---------|--------------|
| **Main CI (active)** | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | `ubuntu-latest` | `pnpm typecheck`, `pnpm test`, `@orbitlab/web` build |
| **Desktop CI (future)** | *not committed* | `macos-latest` (recommended) | Optional Tauri package build for `apps/desktop` |

This document is a **recipe** for when we want a GitHub Actions job that builds the Tauri shell. Do **not** merge the example YAML into main CI until desktop packaging is a release gate.

Related local docs:

- [DESKTOP.md](./DESKTOP.md) — Mac install checklist, dev/build flow
- [apps/desktop/README.md](../apps/desktop/README.md) — package-level commands
- [DEPLOY.md](./DEPLOY.md) — web Netlify deploy + main CI notes

## Why keep it optional

1. **Runner cost** — macOS minutes are more expensive than Ubuntu; first Rust builds are slow without cache.
2. **Main CI purity** — web typecheck/test/build should stay fast on every PR.
3. **Signing / notarization** — distribution builds need Apple certs and secrets; scaffold builds do not.
4. **Platform matrix** — Ubuntu can compile some Tauri targets with extra system deps, but OrbitLab’s documented desktop path is **macOS first** (Xcode CLT + WebView). Start with one runner.

Gate desktop CI behind path filters, `workflow_dispatch`, and/or a separate workflow file so default PR traffic is unchanged.

## What “CI-build Tauri” means here

Same as local production package:

```text
pnpm desktop:build
  → tauri build
    → beforeBuildCommand: pnpm --filter @orbitlab/web build
    → bundle apps/web/dist into apps/desktop/src-tauri/target/release/bundle/
```

Success criteria for a smoke CI job:

- Job installs Node 20, pnpm 9, Rust stable, and macOS build tools.
- `pnpm install --frozen-lockfile` from monorepo root.
- `pnpm desktop:build` (or `pnpm --filter @orbitlab/desktop build`) exits 0.
- Optional: upload `.app` / `.dmg` (or the `bundle/` tree) as a workflow artifact.

Non-goals for the first optional job:

- Code signing, notarization, Sparkle/auto-update
- Windows / Linux matrix
- PocketBase sidecar or pro license checks
- Changing or extending `.github/workflows/ci.yml`

## Prerequisites on the runner

### macOS runner

Use **`macos-latest`** (or a pinned image such as `macos-14` / `macos-15` once you standardize).

| Need | Why |
|------|-----|
| Xcode Command Line Tools / SDK | Link WebKit / produce `.app` |
| Rust stable (`rustc`, `cargo`) | Tauri 2 native shell (`apps/desktop/src-tauri`) |
| Node **20+**, **pnpm 9** | Monorepo (`packageManager: pnpm@9.15.0`) + `@tauri-apps/cli` |
| Workspace install at **repo root** | `beforeBuildCommand` runs `pnpm --filter @orbitlab/web build` |

GitHub-hosted macOS images usually include Xcode CLT. If a link step fails with missing SDK tools, add an explicit setup step (or pin a known-good image).

### rustup

Prefer the official Rust GitHub Action (installs via rustup and caches toolchain metadata):

```yaml
- name: Install Rust stable
  uses: dtolnay/rust-toolchain@stable
```

Manual equivalent (if you ever bootstrap without the action):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

Pin a channel only if you need reproducibility beyond `stable` (e.g. `1.8x.0`). Tauri 2 + current `Cargo.toml` (`edition = "2021"`, `tauri = "2"`) are fine on stable.

### Node / pnpm (match main CI)

Mirror active CI so desktop jobs do not drift:

- `pnpm/action-setup@v4` with `version: 9`
- `actions/setup-node@v4` with `node-version: 20` and `cache: pnpm`
- `pnpm install --frozen-lockfile`

### Caching (recommended)

Without cache, cold macOS Rust compiles dominate wall time. Cache **Cargo registry + git + target** for the desktop crate path.

| Layer | What to cache | Notes |
|-------|----------------|-------|
| **pnpm store** | via `setup-node` `cache: pnpm` | Same as main CI |
| **Rust toolchain** | usually handled by `dtolnay/rust-toolchain` | Avoid re-downloading rustc every run |
| **Cargo** | `~/.cargo/registry`, `~/.cargo/git`, `apps/desktop/src-tauri/target` | Key on `Cargo.lock` (+ OS + job name) |

Suggested cache keys:

```text
${{ runner.os }}-cargo-${{ hashFiles('apps/desktop/src-tauri/Cargo.lock') }}
${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}   # setup-node handles this when cache: pnpm
```

Optional: [`Swatinem/rust-cache@v2`](https://github.com/Swatinem/rust-cache) with:

```yaml
workspaces: apps/desktop/src-tauri -> target
```

That is usually simpler than hand-rolled `actions/cache` paths.

**Cache hygiene:**

- Do not commit `apps/desktop/src-tauri/target/` (local only).
- If `Cargo.lock` changes, expect a cold-ish rebuild for native deps.
- First successful run still pays full compile; subsequent runs should reuse crates.

## Triggers (keep main CI alone)

Recommended patterns for a **separate** workflow file (when you create one later):

1. **`workflow_dispatch`** — manual “build desktop” from Actions UI.
2. **Path filters** — only when desktop / web / lockfiles change:

   ```text
   apps/desktop/**
   apps/web/**
   packages/**
   pnpm-lock.yaml
   package.json
   ```

3. **Tag / release** — e.g. `desktop-v*` when you start shipping builds.
4. **Never** fold Tauri into the default `check` job on Ubuntu unless you intentionally accept slower PR feedback.

Example concurrency group (separate from main CI):

```yaml
concurrency:
  group: desktop-ci-${{ github.ref }}
  cancel-in-progress: true
```

## Example workflow (YAML — not active)

> **Copy-paste only.** This block is documentation. It is **not** an active workflow under `.github/workflows/`. Do not replace or amend `ci.yml` with this content unless the team explicitly enables desktop CI.

Suggested future path (when enabling): `.github/workflows/desktop.yml` (name is arbitrary; keep it **out of** `ci.yml`).

```yaml
# FUTURE OPTIONAL WORKFLOW — example only; not enabled in this repo yet.
# Intended path when adopted: .github/workflows/desktop.yml
# Do not merge into .github/workflows/ci.yml.

name: Desktop (Tauri)

on:
  workflow_dispatch:
  # Uncomment when desktop packaging is a real gate:
  # push:
  #   branches: [main]
  #   paths:
  #     - 'apps/desktop/**'
  #     - 'apps/web/**'
  #     - 'packages/**'
  #     - 'pnpm-lock.yaml'
  #     - 'package.json'
  # pull_request:
  #   branches: [main]
  #   paths:
  #     - 'apps/desktop/**'
  #     - 'apps/web/**'
  #     - 'packages/**'
  #     - 'pnpm-lock.yaml'
  #     - 'package.json'

concurrency:
  group: desktop-ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  tauri-macos:
    name: Build Tauri (macOS)
    runs-on: macos-latest
    timeout-minutes: 60

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Cargo / Tauri target
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: apps/desktop/src-tauri -> target

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build desktop (Tauri)
        run: pnpm desktop:build
        env:
          # Match web CI default: offline memory backend for the embedded UI
          VITE_DATA_BACKEND: memory
          # Non-interactive / CI-friendly env if tools respect it
          CI: true

      - name: Upload bundle artifacts
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: orbitlab-desktop-macos-${{ github.sha }}
          path: |
            apps/desktop/src-tauri/target/release/bundle/**
          if-no-files-found: warn
          retention-days: 14
```

### Local parity commands

Run the same core steps on a Mac before trusting CI:

```bash
# repo root
pnpm install --frozen-lockfile
VITE_DATA_BACKEND=memory pnpm desktop:build
# artifacts under:
# apps/desktop/src-tauri/target/release/bundle/
```

## Environment variables

| Variable | CI recommendation | Notes |
|----------|-------------------|--------|
| `VITE_DATA_BACKEND` | `memory` | Same default as main web CI; offline desktop path |
| `VITE_POCKETBASE_URL` | omit unless testing PB in shell | Vite inlines at web build time |
| `CI` | `true` (often set by Actions) | Helps some tools skip prompts |

Signing-related secrets (`APPLE_*`, notarization API keys, etc.) are **out of scope** until distribution builds are planned. Leave them out of the smoke workflow.

## Artifacts

After a successful `tauri build` on macOS, expect something under:

```text
apps/desktop/src-tauri/target/release/bundle/
```

Exact names depend on `bundle.targets` in `apps/desktop/src-tauri/tauri.conf.json` (currently `"all"` for the scaffold). Upload the tree as a CI artifact for smoke inspection; do not treat unsigned CI artifacts as App Store / notarized releases.

## Failure checklist

| Symptom | Likely cause | Fix direction |
|---------|--------------|---------------|
| `cargo` / `rustc` not found | rustup step missing | Add `dtolnay/rust-toolchain@stable` |
| Link / WebKit / SDK errors | incomplete Xcode tools on image | Pin macOS image; ensure CLT/SDK present |
| `pnpm: command not found` | setup order wrong | `pnpm/action-setup` before `setup-node` / install |
| Web filter build fails | workspace install incomplete | Always `pnpm install` from monorepo root |
| Timeout ~20–30 min cold | no Cargo cache | Add `Swatinem/rust-cache` or manual cargo cache |
| Lockfile mismatch | local install without commit | Commit `pnpm-lock.yaml` / `Cargo.lock` as appropriate |

## When to enable

Enable a real workflow file when **any** of these become true:

1. Desktop is in the release checklist (Phase 4+ in [ROADMAP.md](./ROADMAP.md)).
2. Contributors regularly break `tauri.conf.json` / Rust shell without noticing.
3. You need downloadable unsigned nightlies for Mac testers.

Until then: document here, build locally with `pnpm desktop:build`, keep **main CI** on Ubuntu web-only.

## Explicit non-touch rule

| Path | Policy |
|------|--------|
| `.github/workflows/ci.yml` | **Do not break / do not fold Tauri into it** for optional desktop packaging |
| `.github/workflows/desktop.yml` (or similar) | Create later by copying the example above when the team opts in |
| `docs/CI-DESKTOP.md` | This guide (source of truth for the optional recipe) |

## Related

- Local Mac setup: [DESKTOP.md](./DESKTOP.md)
- Active web CI steps: [DEPLOY.md § CI](./DEPLOY.md#ci)
- Package scripts: root `pnpm desktop:dev` / `pnpm desktop:build`
- Tauri config: `apps/desktop/src-tauri/tauri.conf.json`
