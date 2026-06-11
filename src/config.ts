import { resolve } from "node:path";

export type Config = {
  workspace: string;
  baseURL: string;
  apiKey: string;
  model: string;
  maxTurns: number;
  maxFileBytes: number;
  maxOutputChars: number;
  maxCompletionTokens: number;
  requestTimeoutMs: number;
  bashTimeoutMs: number;
};

export function loadConfig(): Config {
  return {
    workspace: resolve(process.env.WORKSPACE ?? "site"),
    baseURL: process.env.LLM_BASE_URL ?? "https://inference.local/v1",
    apiKey: process.env.LLM_API_KEY ?? "local",
    model: process.env.LLM_MODEL ?? "local-model",
    maxTurns: Number(process.env.MAX_TURNS ?? 6),
    maxFileBytes: Number(process.env.MAX_FILE_BYTES ?? 200_000),
    maxOutputChars: Number(process.env.MAX_OUTPUT_CHARS ?? 12_000),
    maxCompletionTokens: Number(process.env.MAX_COMPLETION_TOKENS ?? 4096),
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 300_000),
    bashTimeoutMs: Number(process.env.BASH_TIMEOUT_MS ?? 20_000),
  };
}
