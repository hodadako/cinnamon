import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { recordIdempotencyKey } from "@cinnamon/core";
import type { BetterSqliteDatabase, JsonlLogger } from "@cinnamon/core";

export interface GitHubWebhookServerOptions {
  port: number;
  secret: string;
  database: BetterSqliteDatabase;
  logger?: JsonlLogger;
}

export function createGitHubWebhookServer(options: GitHubWebhookServerOptions) {
  return createServer(async (request, response) => {
    try {
      await handleGitHubWebhookRequest(request, response, options);
    } catch (error) {
      await options.logger?.log({
        level: "error",
        component: "github-webhook",
        event: "webhook.failed",
        message: error instanceof Error ? error.message : "Unknown webhook error"
      });

      writeJson(response, 500, { ok: false, error: "internal_error" });
    }
  });
}

async function handleGitHubWebhookRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: GitHubWebhookServerOptions
): Promise<void> {
  if (request.method !== "POST" || request.url !== "/webhooks/github") {
    writeJson(response, 404, { ok: false, error: "not_found" });
    return;
  }

  const deliveryId = request.headers["x-github-delivery"];
  const eventName = request.headers["x-github-event"];
  const signature = request.headers["x-hub-signature-256"];

  if (typeof deliveryId !== "string" || typeof eventName !== "string" || typeof signature !== "string") {
    writeJson(response, 400, { ok: false, error: "missing_github_headers" });
    return;
  }

  const body = await readRequestBody(request);

  if (!verifyGitHubSignature(body, options.secret, signature)) {
    await options.logger?.log({
      level: "warn",
      component: "github-webhook",
      event: "webhook.signature_rejected",
      data: { deliveryId, eventName }
    });
    writeJson(response, 401, { ok: false, error: "invalid_signature" });
    return;
  }

  const created = recordIdempotencyKey(options.database, {
    key: deliveryId,
    source: "github",
    externalId: deliveryId,
    status: "received"
  });

  if (!created) {
    writeJson(response, 202, { ok: true, duplicate: true });
    return;
  }

  await options.logger?.log({
    level: "info",
    component: "github-webhook",
    event: "webhook.received",
    data: {
      deliveryId,
      eventName,
      size: body.length
    }
  });

  writeJson(response, 202, { ok: true, duplicate: false });
}

export function verifyGitHubSignature(body: Buffer, secret: string, signatureHeader: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const actual = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actual.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actual, expectedBuffer);
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function writeJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
