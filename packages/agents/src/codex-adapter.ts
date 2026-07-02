import type { AiAgentAdapter, AiAgentTaskInput, AiAgentTaskResult } from "./ai-agent-adapter";

export class CodexAdapter implements AiAgentAdapter {
  readonly name = "codex";

  async runTask(input: AiAgentTaskInput): Promise<AiAgentTaskResult> {
    return {
      summary: `Codex adapter placeholder for ${input.taskType}.`,
      details: input.prompt,
      toolCalls: input.allowedTools.map((name) => ({ name, status: "skipped" }))
    };
  }
}
