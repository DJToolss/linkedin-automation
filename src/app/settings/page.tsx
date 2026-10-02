import Link from "next/link";

import { AdminShell } from "@/app/_components/admin-shell";
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
  const connectionTone =
    connection?.status === "connected" ? "positive" : connection?.status === "requires_reconnect" ? "warn" : "negative";

  return (
    <AdminShell breadcrumb="Account" title="Settings">
      <div className="max-w-4xl space-y-4">
        {errorKey && (
          <p className="rounded-[10px] border border-border bg-negative-soft px-4 py-3 text-[13.5px] text-negative" role="alert">
            {ERROR_COPY[errorKey] ?? "Something went wrong connecting LinkedIn."}
          </p>
        )}
        {justConnected && (
          <p className="rounded-[10px] border border-border bg-positive-soft px-4 py-3 text-[13.5px] text-positive">
            LinkedIn connected.
          </p>
        )}

        <section className="ui-panel p-[18px]">
          <h2 className="ui-panel-title">LinkedIn app credentials</h2>
          <p className="mt-2 text-[13.5px] text-text-muted">
            Each account uses its own LinkedIn developer app. Register this exact callback URL in that app before connecting:
          </p>
          <code className="mt-3 block rounded-[8px] border border-border-soft bg-surface-2 px-3 py-2 font-mono text-[12px] break-all text-text">
            {redirectUri}
          </code>

          {app && (
            <div className="mt-4 flex items-center justify-between rounded-[8px] border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-[13.5px] font-medium text-text">
                  Client ID: <span className="font-mono">{app.clientId}</span>
                </p>
                <p className="font-mono text-[12px] text-text-muted">Saved {app.updatedAt.toLocaleString()}</p>
              </div>
              <form action={removeLinkedInAppAction}>
                <button className="ui-btn-danger px-3 py-1.5 text-[13px]" type="submit">
                  Remove
                </button>
              </form>
            </div>
          )}

          <LinkedInAppForm hasApp={Boolean(app)} />
        </section>

        <section className="ui-panel p-[18px]">
          <h2 className="ui-panel-title">LinkedIn connection</h2>

          {connection ? (
            <div className="mt-4 space-y-2 rounded-[8px] border border-border bg-surface px-4 py-3 text-[13.5px]">
              <p className="flex items-center gap-2">
                <span className="font-semibold text-text">Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-0.5 text-[11.5px] font-semibold ${
                    connectionTone === "positive"
                      ? "bg-positive-soft text-positive"
                      : connectionTone === "warn"
                        ? "bg-warn-soft text-warn"
                        : "bg-negative-soft text-negative"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      connectionTone === "positive" ? "bg-positive" : connectionTone === "warn" ? "bg-warn" : "bg-negative"
                    }`}
                  />
                  {STATUS_COPY[connection.status] ?? connection.status}
                </span>
              </p>
              <p>
                <span className="font-semibold text-text">Member:</span> {connection.displayName ?? connection.personUrn}
              </p>
              <p>
                <span className="font-semibold text-text">Token expires:</span>{" "}
                <span className="font-mono text-text-muted">{connection.accessTokenExpiresAt.toLocaleString()}</span>
              </p>
              <div className="flex gap-3 pt-2">
                <Link className="ui-btn-primary" href="/api/linkedin/authorize">
                  {connection.status === "connected" ? "Reconnect" : "Reconnect now"}
                </Link>
                <form action={disconnectLinkedInAction}>
                  <button className="ui-btn-danger" type="submit">
                    Disconnect
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[8px] border border-border bg-surface px-4 py-3 text-[13.5px] text-text-muted">
              <p>Not connected yet.</p>
              {app ? (
                <Link className="ui-btn-primary mt-3" href="/api/linkedin/authorize">
                  Connect LinkedIn
                </Link>
              ) : (
                <p className="mt-2">Save your app credentials above first.</p>
              )}
            </div>
          )}

          <p className="mt-4 text-[12px] text-text-muted">
            Standard LinkedIn tokens are not refreshed automatically. Reconnect before the expiry date above to avoid interrupting
            scheduled posts.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
