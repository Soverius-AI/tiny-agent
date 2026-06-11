import { zodFunction } from "openai/helpers/zod";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import type { infer as Infer, ZodType } from "zod/v4";
import type { Config } from "../config.ts";

export type ToolDefinition = ChatCompletionFunctionTool & {
  $parseRaw(rawArgs: string): unknown;
};

export type Tool = {
  definition: ToolDefinition;
  run(config: Config, args: unknown): Promise<string>;
};

export function defineTool<Schema extends ZodType>(options: {
  name: string;
  description: string;
  parameters: Schema;
  run(config: Config, args: Infer<Schema>): Promise<string>;
}): Tool {
  return {
    definition: zodFunction({
      name: options.name,
      description: options.description,
      parameters: options.parameters,
    }) as ToolDefinition,
    run: (config, args) => options.run(config, args as Infer<Schema>),
  };
}
