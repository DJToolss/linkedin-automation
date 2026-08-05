import "server-only";

/**
 * This version is intentionally centralized. Verify it in Phase 0 against the
 * LinkedIn application before shipping, because LinkedIn sunsets old versions.
 */
export const LINKEDIN_API_VERSION = "202607";

if (!/^20\d{4}$/.test(LINKEDIN_API_VERSION)) {
  throw new Error("LINKEDIN_API_VERSION must use YYYYMM format.");
}

export const LINKEDIN_REST_BASE_URL = "https://api.linkedin.com/rest";
export const LINKEDIN_OAUTH_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_OAUTH_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function linkedinApiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Linkedin-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}
