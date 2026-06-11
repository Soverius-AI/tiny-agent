import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Config } from "./config.ts";
import type { LlmClient } from "./llm.ts";
import { runTool, toolDefinitions } from "./tools/index.ts";

const systemPrompt =
  "You are a tiny coding agent. " +
  "Use the available tools to create or update files. " +
  "For HTML tasks, write complete documents with <!doctype html>.";

export function createMessages(): ChatCompletionMessageParam[] {
  return [{ role: "system", content: systemPrompt }];
}

export async function runAgent(
  client: LlmClient,
  config: Config,
  messages: ChatCompletionMessageParam[],
  input: string,
): Promise<void> {
  messages.push({ role: "user", content: input });

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    let printedText = false;

    const message = await client.chat(
      messages,
      toolDefinitions,
      (text) => {
        if (!printedText) process.stdout.write("model> ");
        printedText = true;
        process.stdout.write(text);
      },
    );
    if (printedText) console.log();

    messages.push(message);

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      if (!printedText) console.log(message.content ?? "done");
      return;
    }

    for (const call of calls) {
      if (call.type !== "function") {
        throw new Error(`unsupported tool call: ${call.type}`);
      }
      const result = await runTool(config, call.function.name, call.function.arguments);
      console.log(result);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  console.error(`stopped after ${config.maxTurns} turns`);
}
