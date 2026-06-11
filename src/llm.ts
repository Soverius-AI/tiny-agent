import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { Config } from "./config.ts";
import type { ToolDefinition } from "./tools/define-tool.ts";

export type LlmClient = {
  chat(
    messages: ChatCompletionMessageParam[],
    tools: ToolDefinition[],
    onText?: (text: string) => void,
  ): Promise<ChatCompletionAssistantMessageParam>;
};

export function createClient(config: Config): LlmClient {
  const openai = new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey });

  return {
    async chat(messages, tools, onText) {
      const stream = await openai.chat.completions.create(
        {
          model: config.model,
          messages,
          tools,
          tool_choice: "auto",
          max_tokens: config.maxCompletionTokens,
          temperature: 0.2,
          stream: true,
        },
        { timeout: config.requestTimeoutMs },
      );

      let content = "";
      const toolCalls: ChatCompletionMessageFunctionToolCall[] = [];

      for await (const chunk of stream) {
        for (const choice of chunk.choices) {
          const text = choice.delta.content ?? "";
          if (text) {
            content += text;
            onText?.(text);
          }

          for (const call of choice.delta.tool_calls ?? []) {
            const draft = toolCalls[call.index] ?? {
              id: call.id ?? `call_${call.index}`,
              type: "function",
              function: { name: "", arguments: "" },
            };

            if (call.id) draft.id = call.id;
            if (call.function?.name) draft.function.name += call.function.name;
            if (call.function?.arguments) draft.function.arguments += call.function.arguments;

            toolCalls[call.index] = draft;
          }
        }
      }

      const calls = toolCalls.filter(Boolean);
      return {
        role: "assistant",
        content: content || null,
        tool_calls: calls.length > 0 ? calls : undefined,
      };
    },
  };
}
