import { NextResponse } from "next/server";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { getAppUrlEnv } from "@/lib/env";
import { getLinkedInAppSummary } from "@/lib/linkedin/app-credentials";
import {
  LINKEDIN_OAUTH_AUTHORIZE_URL,
  LINKEDIN_OAUTH_SCOPES,
  getLinkedInRedirectUri,
} from "@/lib/linkedin/config";
import { createOAuthState } from "@/lib/linkedin/state";

export async function GET() {
  const userId = await requireAuthenticatedUserId();
  const appUrl = getAppUrlEnv().NEXT_PUBLIC_APP_URL;

  const app = await getLinkedInAppSummary(userId);
  if (!app) {
    const settingsUrl = new URL("/settings", appUrl);
    settingsUrl.searchParams.set("linkedin_error", "missing_app");
    return NextResponse.redirect(settingsUrl);
  }

  const state = await createOAuthState(userId);

  const authorizeUrl = new URL(LINKEDIN_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", app.clientId);
  authorizeUrl.searchParams.set("redirect_uri", getLinkedInRedirectUri(appUrl));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", LINKEDIN_OAUTH_SCOPES.join(" "));

  return NextResponse.redirect(authorizeUrl);
}
