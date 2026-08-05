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

/**
 * The OpenID Connect userinfo endpoint used to identify the connecting member
 * (see PHASE_0.md item 5). This is LinkedIn's fixed OIDC endpoint, not a
 * dated REST resource, so it does not take a `Linkedin-Version` header.
 */
export const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

/**
 * Least-privilege scope set for personal single-account posting: `openid` +
 * `profile` identify the member via the userinfo endpoint, `w_member_social`
 * is the only posting permission requested (implementation.MD correction #6).
 */
export const LINKEDIN_OAUTH_SCOPES = ["openid", "profile", "w_member_social"] as const;

/** Short-lived window during which an issued OAuth state may be consumed. */
export const LINKEDIN_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function linkedinApiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Linkedin-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

/** Builds the exact callback URI that must be registered in the LinkedIn app. */
export function getLinkedInRedirectUri(appUrl: string): string {
  return new URL("/api/linkedin/callback", appUrl).toString();
}
