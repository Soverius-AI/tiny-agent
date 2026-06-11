import { createInterface } from "node:readline/promises";
import { runAgent, createMessages } from "./agent-loop.ts";
import { loadConfig } from "./config.ts";
import { createClient } from "./llm.ts";

const firstTask = process.argv.slice(2).join(" ").trim();
const config = loadConfig();
const client = createClient(config);
const messages = createMessages();

printBanner();

if (!firstTask && !process.stdin.isTTY) {
  console.error('npm run agent -- "Create index.html ..."');
  process.exitCode = 1;
} else {
  if (firstTask) await runAgent(client, config, messages, firstTask);
  if (process.stdin.isTTY) await promptLoop();
}

async function promptLoop(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const input = (await question(rl, "tiny-agent> ")).trim();
      if (!input || input === "exit" || input === "quit") break;
      await runAgent(client, config, messages, input);
    }
  } finally {
    rl.close();
  }
}

async function question(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt);
  } catch (error) {
    if (isAbortError(error)) return "";
    throw error;
  }
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ABORT_ERR";
}

function printBanner(): void {
  if (!process.stdout.isTTY) return;

  const cyan = "\x1b[36m";
  const dim = "\x1b[2m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";

  const banner = [
    " _   _                                      _   ",
    "| |_(_)_ __  _   _    __ _  __ _  ___ _ __ | |_ ",
    "| __| | '_ \\| | | |  / _` |/ _` |/ _ \\ '_ \\| __|",
    "| |_| | | | | |_| | | (_| | (_| |  __/ | | | |_ ",
    " \\__|_|_| |_|\\__, |  \\__,_|\\__, |\\___|_| |_|\\__|",
    "             |___/         |___/                ",
  ];

  console.log();
  for (const line of banner) console.log(`${cyan}${bold}${line}${reset}`);
  console.log(`${dim}  A tiny coding agent  ·  visit ${reset}${cyan}https://soverius.ai${reset}`);
  console.log();
}
