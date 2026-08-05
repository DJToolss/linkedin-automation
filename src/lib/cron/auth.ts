import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { getCronEnv } from "@/lib/env";

/**
 * Compares the `Authorization` header against `Bearer ${CRON_SECRET}`.
 * Hashing both sides to a fixed 32-byte digest before `timingSafeEqual`
 * avoids both its length-mismatch throw and a timing side-channel, and an
 * absent header is rejected the same as a mismatched one
 * (implementation.MD Phase 5 item 1).
 */
export function isAuthorizedCronRequest(authorizationHeader: string | null): boolean {
  if (!authorizationHeader) return false;
  const expected = createHash("sha256").update(`Bearer ${getCronEnv().CRON_SECRET}`).digest();
  const actual = createHash("sha256").update(authorizationHeader).digest();
  return timingSafeEqual(expected, actual);
}
