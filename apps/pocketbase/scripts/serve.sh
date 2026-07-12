#!/usr/bin/env bash
# Run local PocketBase with OrbitLab defaults.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BINARY="${ROOT}/bin/pocketbase"
DATA_DIR="${PB_DATA_DIR:-./pb_data}"
HTTP="${PB_HTTP:-127.0.0.1:8090}"

if [[ ! -f "$BINARY" ]]; then
  echo "error: PocketBase binary not found at ${BINARY}" >&2
  echo "" >&2
  echo "Download it first:" >&2
  echo "  pnpm download" >&2
  echo "  # or from monorepo root: pnpm pb:download" >&2
  exit 1
fi

if [[ ! -x "$BINARY" ]]; then
  echo "error: ${BINARY} is not executable (chmod +x?)" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"

echo "Starting PocketBase"
echo "  binary : ${BINARY}"
echo "  data   : ${DATA_DIR}"
echo "  http   : http://${HTTP}"
echo "  admin  : http://${HTTP}/_/"
echo ""
echo "First run: create a superuser in the Admin UI, or:"
echo "  ${BINARY} superuser upsert \"\$PB_ADMIN_EMAIL\" \"\$PB_ADMIN_PASSWORD\" --dir=${DATA_DIR}"
echo ""

exec "$BINARY" serve --dir="$DATA_DIR" --http="$HTTP"
