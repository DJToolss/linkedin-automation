import Link from "next/link";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { getAppUrlEnv } from "@/lib/env";
import { getLinkedInAppSummary } from "@/lib/linkedin/app-credentials";
import { getLinkedInRedirectUri } from "@/lib/linkedin/config";
import { getConnectionSummary } from "@/lib/linkedin/connection";
import { disconnectLinkedInAction, removeLinkedInAppAction } from "@/app/settings/actions";
import { LinkedInAppForm } from "@/app/settings/_components/linkedin-app-form";

const ERROR_COPY: Record<string, string> = {
  denied: "You declined the LinkedIn authorization request.",
  invalid_request: "LinkedIn did not return the expected authorization response.",
  invalid_state: "That connection link expired or was already used. Try connecting again.",
  missing_app: "Add your LinkedIn app's Client ID and Client Secret, then connect.",
  exchange_failed: "LinkedIn could not complete the connection. Please try again.",
  provider: "LinkedIn returned an error. Please try again.",
};

const STATUS_COPY: Record<string, string> = {
  connected: "Connected",
  requires_reconnect: "Needs reconnection",
  disconnected: "Disconnected",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireAuthenticatedUserId();
  const [app, connection, params] = await Promise.all([
    getLinkedInAppSummary(userId),
    getConnectionSummary(userId),
    searchParams,
  ]);

  const appUrl = getAppUrlEnv().NEXT_PUBLIC_APP_URL;
  const redirectUri = getLinkedInRedirectUri(appUrl);
  const errorKey = typeof params.linkedin_error === "string" ? params.linkedin_error : undefined;
  const justConnected = params.linkedin_connected === "1";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <header className="border-b pb-6">
        <p className="text-sm font-medium text-blue-700">LinkedIn Automation</p>
        <h1 className="mt-1 text-3xl font-semibold">Settings</h1>
      </header>

      {errorKey && (
        <p className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {ERROR_COPY[errorKey] ?? "Something went wrong connecting LinkedIn."}
        </p>
      )}
      {justConnected && (
        <p className="mt-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          LinkedIn connected.
        </p>
      )}

      <section className="mt-8 rounded-xl border bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold">LinkedIn app credentials</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Each account uses its own LinkedIn developer app. Register this exact callback URL in that app before
          connecting:
        </p>
        <code className="mt-2 block rounded bg-white px-3 py-2 text-xs break-all text-zinc-800">{redirectUri}</code>

        {app && (
          <div className="mt-4 flex items-center justify-between rounded border bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium">Client ID: {app.clientId}</p>
              <p className="text-xs text-zinc-500">Saved {app.updatedAt.toLocaleString()}</p>
            </div>
            <form action={removeLinkedInAppAction}>
              <button className="rounded border px-3 py-1.5 text-sm font-medium text-red-700" type="submit">
                Remove
              </button>
            </form>
          </div>
        )}

        <LinkedInAppForm hasApp={Boolean(app)} />
      </section>

      <section className="mt-8 rounded-xl border bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold">LinkedIn connection</h2>

        {connection ? (
          <div className="mt-4 space-y-2 rounded border bg-white px-4 py-3 text-sm">
            <p>
              <span className="font-medium">Status:</span> {STATUS_COPY[connection.status] ?? connection.status}
            </p>
            <p>
              <span className="font-medium">Member:</span> {connection.displayName ?? connection.personUrn}
            </p>
            <p>
              <span className="font-medium">Token expires:</span> {connection.accessTokenExpiresAt.toLocaleString()}
            </p>
            <div className="flex gap-3 pt-2">
              <Link className="rounded bg-blue-700 px-4 py-2 font-medium text-white" href="/api/linkedin/authorize">
                {connection.status === "connected" ? "Reconnect" : "Reconnect now"}
              </Link>
              <form action={disconnectLinkedInAction}>
                <button className="rounded border px-4 py-2 font-medium text-red-700" type="submit">
                  Disconnect
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded border bg-white px-4 py-3 text-sm text-zinc-600">
            <p>Not connected yet.</p>
            {app ? (
              <Link className="mt-3 inline-block rounded bg-blue-700 px-4 py-2 font-medium text-white" href="/api/linkedin/authorize">
                Connect LinkedIn
              </Link>
            ) : (
              <p className="mt-2">Save your app credentials above first.</p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          Standard LinkedIn tokens are not refreshed automatically. Reconnect before the expiry date above to avoid
          interrupting scheduled posts.
        </p>
      </section>
    </main>
  );
}
