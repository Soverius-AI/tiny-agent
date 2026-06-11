#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p site

export WORKSPACE="${WORKSPACE:-$PWD/site}"
export LLM_BASE_URL="${LLM_BASE_URL:-http://127.0.0.1:1234/v1}"
export LLM_API_KEY="${LLM_API_KEY:-local}"
export LLM_MODEL="${LLM_MODEL:-local-model}"

exec node --experimental-strip-types src/index.ts "$@"
