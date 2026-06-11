import { spawn } from "node:child_process";
import { z } from "zod/v4";
import type { Config } from "../config.ts";
import { defineTool } from "./define-tool.ts";

export const bashTool = defineTool({
  name: "bash",
  description: "Run a shell command in the workspace.",
  parameters: z.object({
    command: z.string().describe("Command to run."),
  }),

  async run(config, { command }) {
    return await runBash(config, command);
  },
});

function runBash(config: Config, command: string): Promise<string> {
  return new Promise((resolveResult) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: config.workspace,
      env: { ...process.env, TERM: "dumb" },
      timeout: config.bashTimeoutMs,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolveResult(`Error: ${error.message}`);
    });

    child.on("close", (code, signal) => {
      let output = stdout;
      if (stderr) output += `${output ? "\n" : ""}STDERR:\n${stderr}`;
      if (signal) output += `${output ? "\n" : ""}Signal: ${signal}`;
      if (code !== 0 && code !== null) output += `${output ? "\n" : ""}Exit code: ${code}`;
      if (output.length > config.maxOutputChars) output = output.slice(-config.maxOutputChars);
      resolveResult(output || "(no output)");
    });
  });
}
