# Tiny Agent

Minimal TypeScript coding agent for a 3-part blog series.

1. One loop, three tools: `read_file`, `write_file`, `bash`.
2. OpenShell sandbox runtime with policy-enforced filesystem and network access.
3. Local LLM server on the host, routed into the sandbox through `inference.local`.

Source layout:

- `src/index.ts` - CLI entrypoint and follow-up prompt loop.
- `src/config.ts` - environment variables and limits.
- `src/llm.ts` - OpenAI-compatible streaming client using the OpenAI SDK.
- `src/agent-loop.ts` - system prompt, message history, model calls, tool-call loop.
- `src/tools/` - one file per tool, plus `define-tool.ts` (Zod-backed SDK registration helper) and `index.ts` (registry and dispatch).
- `scripts/llm.sh` - starts, stops, and checks `llama-server` on the host.
- `scripts/agent-local.sh` - runs the agent on the host without OpenShell, pointing at `127.0.0.1:1234`.
- `openshell/run.sh` - configures OpenShell inference, creates a sandbox, uploads `src/` and the required `node_modules` (`openai`, `zod`), runs the agent, downloads output.
- `openshell/policy.yaml` - OpenShell filesystem/process policy.

Install host tools:

```sh
brew install llama.cpp
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
pnpm install
```

Check that OpenShell is reachable:

```sh
openshell status
```

Start the local model server in one terminal:

```sh
pnpm llm
```

The pnpm commands call one script:

```sh
bash scripts/llm.sh start
bash scripts/llm.sh status
bash scripts/llm.sh stop
pnpm llm:start
pnpm llm:status
pnpm llm:stop
```

The default bind host is `0.0.0.0` so OpenShell sandboxes can reach the host
server. Health checks still use `127.0.0.1`.

If you started the server before this setting changed, restart it:

```sh
pnpm llm:stop
pnpm llm
```

If the server is already running on port `1234`, this command reports the
existing process and exits successfully when `/health` responds. Check it with:

```sh
pnpm llm:status
```

Stop it with:

```sh
pnpm llm:stop
```

Run the sandboxed agent in another terminal:

```sh
pnpm agent -- "Create index.html for a small coffee shop"
```

After the first task, use the `tiny-agent>` prompt for follow-up refinements. Type
`exit` or `quit` to stop. Output is written inside the sandbox at `/sandbox/site`
and synced to `tiny-agent/site` every 2 seconds while the session is running.
A final download also runs when the session exits.

Assistant text streams live after `model>`. Tool calls run when the structured
arguments are complete.

Tools are listed in `src/tools/index.ts`. They are not pasted into the system
prompt; `agent-loop.ts` maps `toolRegistry` into the OpenAI `tools` request
field.

Useful overrides:

```sh
MODEL_ID=unsloth/gemma-4-E4B-it-GGUF:Q8_0 pnpm llm
LLM_MODEL=unsloth/gemma-4-E4B-it-GGUF:Q8_0 pnpm agent -- "Create index.html"
OPENSHELL_SYNC_INTERVAL=1 pnpm agent
```

The default sandboxed agent calls `https://inference.local/v1`. `openshell/run.sh`
configures that OpenShell route to the host server at
`http://host.openshell.internal:1234/v1`.

OpenShell endpoint verification runs outside the sandbox route, so the script
checks `http://127.0.0.1:1234/health` itself and then applies the route with
`--no-verify`.

For quick local debugging without OpenShell:

```sh
pnpm agent:local -- "Create index.html"
```

Type-check the source without emitting files:

```sh
pnpm check
```

The policy does not grant network egress to `/bin/bash`, `curl`, package managers,
or other binaries. Model traffic goes through OpenShell inference routing. The
file tools write relative to `WORKSPACE=/sandbox/site`; host isolation comes from
OpenShell.
