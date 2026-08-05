import "server-only";

import { createHash } from "node:crypto";

type Entry = { attempts: number; resetAt: number };
const attempts = new Map<string, Entry>();

function key(scope: string, email: string) {
  return `${scope}:${createHash("sha256").update(email).digest("hex")}`;
}

function canTry(scope: string, email: string, maximum: number) {
  const entry = attempts.get(key(scope, email));
  return !entry || entry.resetAt <= Date.now() || entry.attempts < maximum;
}

function record(scope: string, email: string, windowMs: number) {
  const attemptKey = key(scope, email);
  const entry = attempts.get(attemptKey);
  if (!entry || entry.resetAt <= Date.now()) attempts.set(attemptKey, { attempts: 1, resetAt: Date.now() + windowMs });
  else entry.attempts += 1;
}

/** In-memory throttling; replace with a shared durable store before horizontal scaling. */
export const authRateLimit = {
  canRegister: (email: string) => canTry("register", email, 3),
  recordRegister: (email: string) => record("register", email, 60 * 60 * 1000),
  clearRegister: (email: string) => attempts.delete(key("register", email)),
  canLogIn: (email: string) => canTry("login", email, 5),
  recordLogIn: (email: string) => record("login", email, 15 * 60 * 1000),
  clearLogIn: (email: string) => attempts.delete(key("login", email)),
};
