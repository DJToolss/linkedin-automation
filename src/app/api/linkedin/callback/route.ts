import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { getAppUrlEnv } from "@/lib/env";
import { getLinkedInAppCredentials } from "@/lib/linkedin/app-credentials";
import { getLinkedInRedirectUri } from "@/lib/linkedin/config";
import { upsertConnection } from "@/lib/linkedin/connection";
import { LinkedInOAuthError, exchangeAuthorizationCode, fetchMemberIdentity } from "@/lib/linkedin/oauth";
import { consumeOAuthState } from "@/lib/linkedin/state";

const DENIAL_ERRORS = new Set(["user_cancelled_login", "user_cancelled_authorize", "access_denied"]);

function toSettings(appUrl: string, params: Record<string, string>) {
  const url = new URL("/settings", appUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrlEnv().NEXT_PUBLIC_APP_URL;
  const userId = await requireAuthenticatedUserId();
  const params = request.nextUrl.searchParams;

  const providerError = params.get("error");
  if (providerError) {
    return toSettings(appUrl, { linkedin_error: DENIAL_ERRORS.has(providerError) ? "denied" : "provider" });
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return toSettings(appUrl, { linkedin_error: "invalid_request" });

  // Consuming the state before touching LinkedIn rejects replayed, expired,
  // and forged callbacks in one atomic step (implementation.MD correction #3).
  const claimed = await consumeOAuthState(state);
  if (!claimed || claimed.userId !== userId) {
    return toSettings(appUrl, { linkedin_error: "invalid_state" });
  }

  const credentials = await getLinkedInAppCredentials(userId);
  if (!credentials) return toSettings(appUrl, { linkedin_error: "missing_app" });

  try {
    const token = await exchangeAuthorizationCode({
      code,
      redirectUri: getLinkedInRedirectUri(appUrl),
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    });
    const identity = await fetchMemberIdentity(token.accessToken);
    await upsertConnection({
      userId,
      linkedinAppId: credentials.id,
      personUrn: identity.personUrn,
      displayName: identity.name,
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.expiresAt,
    });
  } catch (error) {
    if (!(error instanceof LinkedInOAuthError)) throw error;
    console.error("LinkedIn connection failed:", error.message);
    return toSettings(appUrl, { linkedin_error: "exchange_failed" });
  }

  return toSettings(appUrl, { linkedin_connected: "1" });
}
