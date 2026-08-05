import "server-only";

import { z } from "zod";

import { LINKEDIN_OAUTH_TOKEN_URL, LINKEDIN_USERINFO_URL } from "@/lib/linkedin/config";

export class LinkedInOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkedInOAuthError";
  }
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
});

export type ExchangedToken = { accessToken: string; expiresAt: Date; scope: string };

export async function exchangeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<ExchangedToken> {
  const response = await fetch(LINKEDIN_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new LinkedInOAuthError(`LinkedIn token exchange failed with status ${response.status}.`);
  }

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new LinkedInOAuthError("LinkedIn token response did not match the expected shape.");

  return {
    accessToken: parsed.data.access_token,
    expiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
    scope: parsed.data.scope ?? "",
  };
}

const userinfoResponseSchema = z.object({ sub: z.string().min(1), name: z.string().optional() });

export type MemberIdentity = { personUrn: string; name: string | null };

/** Identifies the connecting member through the approved OIDC identity endpoint. */
export async function fetchMemberIdentity(accessToken: string): Promise<MemberIdentity> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new LinkedInOAuthError(`LinkedIn identity lookup failed with status ${response.status}.`);
  }

  const parsed = userinfoResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new LinkedInOAuthError("LinkedIn identity response did not match the expected shape.");

  return { personUrn: `urn:li:person:${parsed.data.sub}`, name: parsed.data.name ?? null };
}
