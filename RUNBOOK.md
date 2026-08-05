# Operations runbook

Admin-safe procedures for running this service. Nothing here requires
reading `.env` values or ciphertext — every check below uses the database's
own status/error columns or the structured logs, never a decrypted secret.

## Monitoring

- **Health check**: `GET /api/health` — unauthenticated, returns
  `{"status":"ok"}` after a trivial `select 1`, or `503` on DB failure. Point
  an uptime monitor at it.
- **Logs**: every server module logs one JSON line per event via
  `src/lib/logger.ts` (`timestamp`, `level`, `message`, `context`). Known-
  sensitive keys (`accessToken`, `clientSecret`, `password`, …) are redacted
  automatically, wherever they appear in a logged object — this is a
  denylist, so a newly-added secret field must be added to
  `SENSITIVE_KEYS` in that file before it's logged anywhere.
- **Correlation IDs**: the cron route and the LinkedIn callback route each
  generate a `requestId` and thread it through every log line for that
  request/run via `logger.child({...})`; publish attempts additionally carry
  `postId`, `userId`, `attemptId`, and `attemptNumber`. Filter logs by these
  fields to reconstruct one request or one post's full attempt history.

## Expiring / expired LinkedIn tokens

Standard LinkedIn tokens are not refreshed programmatically
(implementation.MD correction #2) — reconnection is always a new
browser-based authorization.

1. Check `linkedin_connections.status` and `access_token_expires_at` for the
   affected user (via `/settings`, or a direct query).
2. `getConnectionSummary()` (`src/lib/linkedin/connection.ts`) lazily flips a
   `connected` row to `requires_reconnect` the next time it's read past
   `access_token_expires_at` — so the UI is self-correcting, but a row that
   hasn't been read since expiring may still show `connected` until it is.
3. A publish attempt that gets a 401/403 from LinkedIn flips the connection
   to `requires_reconnect` immediately (`markConnectionRequiresReconnect`),
   independent of the locally-computed expiry — this is the authoritative
   signal, since LinkedIn may revoke a token before its stated expiry.
4. There is no admin action to "fix" this remotely: the user must visit
   `/settings` and click Reconnect. Scheduled posts affected show
   `requires_reconnect` too (see below) and will resume once reconnected —
   they are not automatically re-queued; the user must reschedule if the
   original time has passed.

## Failed posts

`posts.status = 'failed'` is terminal. Look at `posts.error_code` /
`error_message` and the post's `post_attempts` rows (ordered by
`attempt_number`) for the full history:

| `error_code` | Meaning | Action |
| --- | --- | --- |
| `linkedin_permanent` | LinkedIn rejected the request as invalid (4xx, not a token problem) | Inspect `post_attempts.provider_metadata`/`error_message` for the response detail; the post content or image likely needs to change before rescheduling. |
| `unexpected_error` | An exception outside the classified LinkedIn error paths (bug, unhandled network condition) | Check the logs for that `attemptId`; this is the case most worth a code fix if it recurs. |
| `lease_expired_ambiguous` | See "Duplicate-risk retries" below | Do not blindly retry. |
| Exhausted retries (`attempt_count` reached the cap in `MAX_ATTEMPTS`, `src/lib/publish/publisher.ts`) | Repeated transient failures | Check whether the underlying LinkedIn/network issue has resolved, then have the user reschedule. |

Rescheduling a `failed` post is a user action (edit it back to a future
time via `/posts/[id]/edit` — editing is only permitted for statuses in
`EDITABLE_STATUSES`, which includes `failed`).

## Duplicate-risk retries (`lease_expired_ambiguous`)

This is the deliberate, conservative outcome of lease recovery
(`recoverAbandonedLease`, `src/lib/publish/claim.ts`) when a `publishing`
lease expired and our own `post_attempts` history shows no confirmed
success. It means: **the process that was publishing this post was
interrupted, and we cannot tell whether LinkedIn actually received it.**

1. Check the member's actual LinkedIn profile/feed for that post's content
   around the attempt's `started_at` timestamp — this is the only reliable
   way to know, since there is no documented endpoint to look a post back up
   by our own request (same reasoning as the no-revocation-call decision in
   Phase 3).
2. If it's on LinkedIn: do nothing to the post row (leave it `failed`); at
   most, correct the user-facing record if you want it marked `posted`
   manually.
3. If it's not on LinkedIn: it's safe to have the user reschedule.
4. Never bulk-retry a batch of `lease_expired_ambiguous` posts
   automatically — each one needs the manual check above, which is exactly
   why the system doesn't auto-reschedule them.

## Key rotation (`ENCRYPTION_KEY`)

The envelope format is versioned specifically to make this possible:
`v1.<iv>.<tag>.<ciphertext>` (`src/lib/crypto.ts`). Rotating today (still on
`v1`) means re-encrypting under a new key value, not introducing a new
version tag:

1. Generate a new key (32 random bytes, base64-encoded).
2. Decrypt every `linkedin_connections.access_token_enc` and
   `linkedin_apps.client_secret_enc` value under the **old** key, re-encrypt
   under the **new** key, and update the rows — this needs a one-off script
   using `decrypt()`/`encrypt()` from `src/lib/crypto.ts` with the old key
   loaded as `ENCRYPTION_KEY` for the read pass and the new key for the
   write pass. There is no live migration path in the app itself.
3. Only after every row is confirmed re-encrypted, update the deployed
   `ENCRYPTION_KEY` and redeploy.
4. If a future change introduces an actual second envelope version (e.g.
   `v2` with a different cipher), `decrypt()` already branches on that first
   `.`-delimited segment, so both versions can be read simultaneously during
   a rolling migration — that's the reason the version tag exists at all.

## Release

See `implementation.MD`'s **Release checklist** for the pre-deploy list
(LinkedIn app config, migrations, OAuth rejection tests, cron exercised in
production, etc.). This runbook covers what to do once something in that
list needs attention in production, not the checklist itself.
