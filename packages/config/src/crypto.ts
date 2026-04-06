import { createHash, randomBytes } from "node:crypto";

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateToken(size = 32) {
  return randomBytes(size).toString("hex");
}
