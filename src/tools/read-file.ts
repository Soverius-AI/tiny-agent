import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod/v4";
import { defineTool } from "./define-tool.ts";

export const readFileTool = defineTool({
  name: "read_file",
  description: "Read a text file from the workspace.",
  parameters: z.object({
    file: z.string().describe("Relative path inside the workspace."),
  }),

  async run(config, { file }) {
    const target = join(config.workspace, file);
    const info = await stat(target);
    if (!info.isFile()) throw new Error("path is not a file");
    if (info.size > config.maxFileBytes) throw new Error(`file exceeds ${config.maxFileBytes} bytes`);
    return await readFile(target, "utf8");
  },
});
