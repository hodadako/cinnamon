import type { AiAgentAdapter, AiAgentTaskInput, AiAgentTaskResult } from "./ai-agent-adapter";

export class ClaudeAdapter implements AiAgentAdapter {
  readonly name = "claude";

  async runTask(input: AiAgentTaskInput): Promise<AiAgentTaskResult> {
    return {
      summary: `Claude adapter skeleton for ${input.taskType}.`,
      details: "Claude runtime is not wired in the MVP yet.",
      toolCalls: input.allowedTools.map((name) => ({ name, status: "skipped" }))
    };
  }
}
