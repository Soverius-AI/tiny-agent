#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

name="${OPENSHELL_SANDBOX_NAME:-tiny-agent}"
provider="${OPENSHELL_PROVIDER:-tiny-agent-local}"
model="${LLM_MODEL:-local-model}"
llm_port="${LLM_PORT:-1234}"
sync_interval="${OPENSHELL_SYNC_INTERVAL:-2}"
sync_pid=""

require_openshell() {
  if command -v openshell >/dev/null 2>&1; then
    return
  fi

  echo "OpenShell is not installed on the host."
  echo "Install it with:"
  echo "  curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh"
  exit 1
}

require_dependencies() {
  if [ -d node_modules/openai ] && [ -d node_modules/zod ]; then
    return
  fi

  echo "Missing node_modules/openai or node_modules/zod."
  echo "Install dependencies on the host first:"
  echo "  pnpm install"
  exit 1
}

configure_inference() {
  local health_url="${OPENSHELL_UPSTREAM_HEALTH_URL:-http://127.0.0.1:$llm_port/health}"
  local upstream_url="${OPENSHELL_UPSTREAM_BASE_URL:-http://host.openshell.internal:$llm_port/v1}"

  if ! curl -fsS "$health_url" >/dev/null 2>&1; then
    echo "LLM server is not reachable from the host at $health_url"
    echo "Start it with:"
    echo "  pnpm llm"
    exit 1
  fi

  openshell provider delete "$provider" >/dev/null 2>&1 || true
  openshell provider create \
    --name "$provider" \
    --type openai \
    --credential "OPENAI_API_KEY=${OPENAI_API_KEY:-local}" \
    --config "OPENAI_BASE_URL=$upstream_url"

  openshell inference set \
    --provider "$provider" \
    --model "$model" \
    --timeout "${OPENSHELL_INFERENCE_TIMEOUT:-300}" \
    --no-verify
}

download_site() {
  mkdir -p site
  openshell sandbox download "$name" /sandbox/site ./site >/dev/null 2>&1 || true
}

cleanup() {
  set +e
  [ -n "$sync_pid" ] && kill "$sync_pid" >/dev/null 2>&1
  [ -n "$sync_pid" ] && wait "$sync_pid" 2>/dev/null
  download_site
  if [ "${OPENSHELL_KEEP_SANDBOX:-0}" != "1" ]; then
    openshell sandbox delete "$name" >/dev/null 2>&1 || true
  fi
}

start_sync() {
  [ "$sync_interval" = "0" ] && return

  (
    while true; do
      sleep "$sync_interval"
      download_site
    done
  ) &
  sync_pid=$!
  echo "Syncing sandbox output to ./site every ${sync_interval}s"
}

require_openshell
require_dependencies

if ! openshell status; then
  echo ""
  echo "OpenShell gateway is not reachable."
  echo "Start or repair it, then retry:"
  echo "  openshell status"
  exit 1
fi

configure_inference

openshell sandbox delete "$name" >/dev/null 2>&1 || true
openshell sandbox create \
  --name "$name" \
  --from base \
  --policy ./openshell/policy.yaml \
  --no-tty \
  -- sh -lc 'mkdir -p /sandbox/app /sandbox/site'
trap cleanup EXIT

openshell sandbox upload "$name" ./src /sandbox/app
openshell sandbox exec -n "$name" --no-tty -- mkdir -p /sandbox/app/node_modules
openshell sandbox upload --no-git-ignore "$name" ./node_modules/openai /sandbox/app/node_modules
openshell sandbox upload --no-git-ignore "$name" ./node_modules/zod /sandbox/app/node_modules

cmd=(
  env
  WORKSPACE=/sandbox/site
  "LLM_BASE_URL=${LLM_BASE_URL:-https://inference.local/v1}"
  "LLM_API_KEY=${LLM_API_KEY:-unused}"
  "LLM_MODEL=$model"
  node --experimental-strip-types src/index.ts
)

if [ "$#" -gt 0 ]; then
  cmd+=("$*")
fi

tty=(--no-tty)
if [ -t 0 ] && [ -t 1 ]; then
  tty=(--tty)
fi

start_sync

status=0
openshell sandbox exec \
  -n "$name" \
  --workdir /sandbox/app \
  "${tty[@]}" \
  -- "${cmd[@]}" || status=$?

cleanup
trap - EXIT

echo "Downloaded sandbox output to ./site"
exit "$status"
