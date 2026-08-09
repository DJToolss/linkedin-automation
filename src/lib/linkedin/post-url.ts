import "server-only";

/** Public feed URL for a LinkedIn post URN returned by the Posts API. */
export function linkedInPostUrl(postUrn: string): string {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`;
}
