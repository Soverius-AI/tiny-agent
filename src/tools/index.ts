import type { Config } from "../config.ts";
import { bashTool } from "./bash.ts";
import type { Tool } from "./define-tool.ts";
import { readFileTool } from "./read-file.ts";
import { writeFileTool } from "./write-file.ts";

export const toolRegistry: Tool[] = [readFileTool, writeFileTool, bashTool];
export const toolDefinitions = toolRegistry.map((tool) => tool.definition);

export async function runTool(config: Config, name: string, rawArgs: string): Promise<string> {
  try {
    const tool = toolRegistry.find((candidate) => candidate.definition.function.name === name);
    if (!tool) return `Error: unknown tool ${name}`;
    return await tool.run(config, tool.definition.$parseRaw(rawArgs));
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
