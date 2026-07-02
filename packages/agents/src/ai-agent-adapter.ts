export interface AiAgentTaskInput {
  taskType: string;
  prompt: string;
  memory?: string;
  allowedTools: string[];
  approvalPolicy: "read-only" | "ask-before-write";
  metadata?: Record<string, unknown>;
}

export interface AiAgentTaskResult {
  summary: string;
  details?: string;
  toolCalls?: Array<{
    name: string;
    status: "skipped" | "succeeded" | "failed";
  }>;
}

export interface AiAgentAdapter {
  readonly name: string;
  runTask(input: AiAgentTaskInput): Promise<AiAgentTaskResult>;
}
