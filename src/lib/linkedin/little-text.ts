import "server-only";

/**
 * LinkedIn Posts API `commentary` uses the little Text Format. Reserved
 * characters must be backslash-escaped or LinkedIn silently truncates the
 * body at the first unescaped occurrence (no error returned).
 *
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
 */
const LITTLE_TEXT_RESERVED = /[\\|{}@[\]()<>#*_~]/g;

export function escapeLittleTextCommentary(text: string): string {
  return text.replace(LITTLE_TEXT_RESERVED, (char) => `\\${char}`);
}
