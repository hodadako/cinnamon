import { createHash, timingSafeEqual } from "node:crypto";

export function hashBootstrapCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyBootstrapCode(code: string, expectedHash: string | undefined): boolean {
  if (!expectedHash) {
    return false;
  }

  const actual = Buffer.from(hashBootstrapCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
