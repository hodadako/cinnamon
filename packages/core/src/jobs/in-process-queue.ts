import { randomUUID } from "node:crypto";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface QueueJob<TInput = unknown, TResult = unknown> {
  id: string;
  name: string;
  input: TInput;
  status: JobStatus;
  result?: TResult;
  error?: string;
}

export type QueueHandler<TInput = unknown, TResult = unknown> = (input: TInput) => Promise<TResult>;

export class InProcessQueue {
  private readonly jobs = new Map<string, QueueJob>();
  private readonly handlers = new Map<string, QueueHandler>();

  register<TInput, TResult>(name: string, handler: QueueHandler<TInput, TResult>): void {
    this.handlers.set(name, handler as QueueHandler);
  }

  async enqueue<TInput, TResult>(name: string, input: TInput): Promise<QueueJob<TInput, TResult>> {
    const job: QueueJob<TInput, TResult> = {
      id: randomUUID(),
      name,
      input,
      status: "queued"
    };

    this.jobs.set(job.id, job as QueueJob);
    await this.run(job as QueueJob);
    return job;
  }

  get(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  private async run(job: QueueJob): Promise<void> {
    const handler = this.handlers.get(job.name);

    if (!handler) {
      job.status = "failed";
      job.error = `No handler registered for ${job.name}`;
      return;
    }

    job.status = "running";

    try {
      job.result = await handler(job.input);
      job.status = "completed";
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown job error";
    }
  }
}
