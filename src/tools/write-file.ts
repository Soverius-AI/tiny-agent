import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { z } from "zod/v4";
import { defineTool } from "./define-tool.ts";

export const writeFileTool = defineTool({
  name: "write_file",
  description: "Write a text file into the workspace.",
  parameters: z.object({
    file: z.string().describe("Relative path inside the workspace."),
    content: z.string().describe("Full file contents."),
  }),

  async run(config, { file, content }) {
    const target = join(config.workspace, file);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > config.maxFileBytes) throw new Error(`content exceeds ${config.maxFileBytes} bytes`);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    return `wrote ${relative(config.workspace, target)} (${bytes} bytes)`;
  },
});
