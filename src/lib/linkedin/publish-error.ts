import "server-only";

/**
 * The three outcomes implementation.MD Phase 5 item 4 requires publish
 * failures to be sorted into: token/permission problems need a reconnect,
 * transient provider/network trouble is worth retrying, everything else is
 * treated as permanent.
 */
export type FailureCategory = "reconnect" | "retryable" | "permanent";

export class LinkedInPublishError extends Error {
  category: FailureCategory;
  constructor(category: FailureCategory, message: string) {
    super(message);
    this.name = "LinkedInPublishError";
    this.category = category;
  }
}

export function classifyStatus(status: number): FailureCategory {
  if (status === 401 || status === 403) return "reconnect";
  if (status === 429 || status >= 500) return "retryable";
  return "permanent";
}
