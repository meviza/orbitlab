#!/usr/bin/env bash
# Download a pinned (or latest) PocketBase binary for the current OS/arch into ./bin/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Pin by default for reproducible local/CI installs. Override:
#   PB_VERSION=0.25.8  (or "latest")
#   PB_FORCE=1         re-download even if binary exists
PB_VERSION="${PB_VERSION:-0.25.8}"
BIN_DIR="${ROOT}/bin"
BINARY="${BIN_DIR}/pocketbase"

detect_os() {
  local uname_s
  uname_s="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$uname_s" in
    darwin) echo "darwin" ;;
    linux)  echo "linux" ;;
    *)
      echo "error: unsupported OS '$uname_s' (supported: darwin, linux)" >&2
      exit 1
      ;;
  esac
}

detect_arch() {
  local uname_m
  uname_m="$(uname -m)"
  case "$uname_m" in
    arm64|aarch64) echo "arm64" ;;
    x86_64|amd64)  echo "amd64" ;;
    *)
      echo "error: unsupported architecture '$uname_m' (supported: arm64, amd64)" >&2
      exit 1
      ;;
  esac
}

resolve_version() {
  local ver="$1"
  if [[ "$ver" == "latest" ]]; then
    # GitHub releases/latest redirects to the tag URL.
    local loc
    loc="$(curl -fsSL -o /dev/null -w '%{url_effective}' \
      https://github.com/pocketbase/pocketbase/releases/latest)"
    ver="${loc##*/v}"
    ver="${ver##*/}"
    if [[ -z "$ver" || "$ver" == "latest" ]]; then
      echo "error: could not resolve latest PocketBase version from GitHub" >&2
      exit 1
    fi
  fi
  # strip optional leading v
  ver="${ver#v}"
  echo "$ver"
}

OS="$(detect_os)"
ARCH="$(detect_arch)"
VERSION="$(resolve_version "$PB_VERSION")"

ASSET="pocketbase_${VERSION}_${OS}_${ARCH}.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${ASSET}"

if [[ -x "$BINARY" && "${PB_FORCE:-0}" != "1" ]]; then
  echo "PocketBase already present at ${BINARY}"
  echo "  ($("$BINARY" --version 2>/dev/null || echo "version unknown"))"
  echo "  Re-download with: PB_FORCE=1 pnpm download"
  exit 0
fi

mkdir -p "$BIN_DIR"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/orbitlab-pb.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

ZIP_PATH="${TMP_DIR}/${ASSET}"

echo "Downloading PocketBase v${VERSION} (${OS}/${ARCH})..."
echo "  ${URL}"

if ! curl -fL --retry 3 --retry-delay 1 -o "$ZIP_PATH" "$URL"; then
  echo "error: download failed." >&2
  echo "" >&2
  echo "macOS notes:" >&2
  echo "  • Apple Silicon (M1/M2/M3/M4): darwin/arm64 (default on modern Macs)" >&2
  echo "  • Intel Mac: darwin/amd64" >&2
  echo "  • Override version: PB_VERSION=0.25.8 pnpm download" >&2
  echo "  • Releases: https://github.com/pocketbase/pocketbase/releases" >&2
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "error: 'unzip' is required but not found in PATH" >&2
  exit 1
fi

unzip -qo "$ZIP_PATH" -d "$TMP_DIR"

if [[ ! -f "${TMP_DIR}/pocketbase" ]]; then
  echo "error: zip did not contain a 'pocketbase' binary" >&2
  ls -la "$TMP_DIR" >&2 || true
  exit 1
fi

# Replace atomically-ish
rm -f "$BINARY"
mv "${TMP_DIR}/pocketbase" "$BINARY"
chmod +x "$BINARY"

# Drop LICENSE from extract if it landed in bin (we keep repo LICENSE)
rm -f "${BIN_DIR}/LICENSE.md" "${BIN_DIR}/CHANGELOG.md" 2>/dev/null || true

echo "Installed: ${BINARY}"
"$BINARY" --version || true
echo ""
echo "Next: pnpm serve   # → http://127.0.0.1:8090"
