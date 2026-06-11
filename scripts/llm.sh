#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-start}"
llama_server="${LLAMA_SERVER:-llama-server}"
host="${LLM_HOST:-0.0.0.0}"
health_host="${LLM_HEALTH_HOST:-127.0.0.1}"
port="${LLM_PORT:-1234}"
health_url="http://$health_host:$port/health"
base_url="http://$health_host:$port/v1"

listener_pids() {
  lsof -tiTCP:"$port" -sTCP:LISTEN || true
}

show_listener() {
  lsof -nP -iTCP:"$port" -sTCP:LISTEN || true
}

healthy() {
  curl -fsS "$health_url" >/dev/null 2>&1
}

start() {
  if ! command -v "$llama_server" >/dev/null 2>&1; then
    echo "$llama_server was not found."
    echo "Install llama.cpp first, for example:"
    echo "  brew install llama.cpp"
    exit 1
  fi

  if [ -n "$(listener_pids)" ]; then
    echo "Port $port is already in use."
    show_listener
    if healthy; then
      echo "Existing llama-server is healthy: $base_url"
      exit 0
    fi
    echo "Set LLM_PORT to another port, or stop the process above."
    exit 1
  fi

  args=(
    --host "$host"
    --port "$port"
    --ctx-size "${CTX_SIZE:-32768}"
    --parallel "${PARALLEL:-1}"
    --n-gpu-layers "${N_GPU_LAYERS:-99}"
  )

  if [ -n "${MODEL_PATH:-}" ]; then
    args+=(-m "$MODEL_PATH")
  else
    args+=(-hf "${MODEL_ID:-unsloth/gemma-4-E4B-it-GGUF}")
    args+=(--hf-file "${MODEL_FILE:-gemma-4-E4B-it-Q8_0.gguf}")
  fi

  [ "${LLAMA_VERBOSE:-0}" = "1" ] && args+=(--verbose)

  echo "LLM server bind: http://$host:$port/v1"
  echo "Local health URL: $health_url"
  exec "$llama_server" "${args[@]}"
}

status() {
  if [ -z "$(listener_pids)" ]; then
    echo "No listener on $health_host:$port"
    exit 1
  fi

  if healthy; then
    echo "LLM server is healthy: $base_url"
  else
    echo "A process is listening on $health_host:$port, but /health did not respond."
    exit 1
  fi
}

stop() {
  pids="$(listener_pids)"
  if [ -z "$pids" ]; then
    echo "No listener on $health_host:$port"
    exit 0
  fi

  echo "Stopping listener on $health_host:$port:"
  show_listener
  kill $pids
  sleep 1

  remaining="$(listener_pids)"
  if [ -n "$remaining" ]; then
    echo "Process did not stop after SIGTERM; sending SIGKILL."
    kill -9 $remaining
  fi

  echo "Stopped LLM server on $health_host:$port"
}

case "$cmd" in
  start | status | stop)
    "$cmd"
    ;;
  *)
    echo "Usage: $0 {start|status|stop}"
    exit 2
    ;;
esac
