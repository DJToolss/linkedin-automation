# LinkedIn Automation — Implementation Plan

## Implementation status

| Phase | Status | Evidence / remaining action |
| --- | --- | --- |
| 0 — LinkedIn feasibility | Code-ready; external verification pending | API configuration and the runbook are in `PHASE_0.md`. It requires a LinkedIn developer app, test member consent, and real text/image API calls. |
| 1 — foundations and data model | Implemented; database application pending | Server configuration, crypto, Drizzle schema, and the initial migration are present. Run `npm run db:migrate` against the intended database to complete the operational checkpoint. |
| 2 — authentication and ownership | Implemented | Auth.js credentials flow, registration/login/logout, protected navigation, server-side session checks, and user-scoped data access helpers are in place. `npm run lint` and `npm run build` pass. |
| 3–6 | Not started | Implement in order after the Phase 0 verification and Phase 1 database migration. |

## Current project assessment

The repository is a clean Next.js 16.3 App Router starter. It has TypeScript,
Tailwind v4, ESLint, and the packages needed for the intended stack, but it has
no application routes, database schema, authentication, tests, scheduler, or
LinkedIn integration. `npm run lint` currently passes.

The installed dependencies support this plan: Drizzle + Neon, Auth.js/NextAuth,
Cloudinary, Zod, React Hook Form, and date-fns. `@vercel/blob` is also present
but is not needed if Cloudinary remains the sole media store; do not introduce a
second image backend without a product reason.

Do not read or commit `.env`. The variables reported as already configured are
adequate for the proposed first release:

| Variable | Planned use |
| --- | --- |
| `DATABASE_URL` | Neon application connection and migrations |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_EXPIRY` | Auth.js session configuration (`NEXTAUTH_EXPIRY` only after validating the beta API) |
| `NEXT_PUBLIC_APP_URL` | canonical callback URL and links |
| `ENCRYPTION_KEY` | 32-byte base64 AES-256-GCM key for LinkedIn credentials/tokens |
| `CRON_SECRET` | authorization of the scheduled publisher route |
| `CLOUDINARY_*` | server-side image upload and deletion |

`NEXTAUTH_EXPIRY` is not a standard Auth.js environment variable. Treat it as
an application setting only if it is parsed, validated, and explicitly passed
to the Auth.js configuration; otherwise it should have no effect.

## Important corrections to the earlier guide

1. **Use the current LinkedIn Content APIs.** `ugcPosts` and the legacy Assets
   flow in the earlier guide have been replaced by `POST /rest/posts` and the
   Images API (`/rest/images?action=initializeUpload`). LinkedIn requires both
   `Linkedin-Version: YYYYMM` and `X-Restli-Protocol-Version: 2.0.0` headers.
   See the [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
   and [Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api).

2. **Do not implement refresh-token logic by default.** Standard 3-legged
   LinkedIn tokens currently last 60 days and programmatic refresh tokens are
   available only to a limited set of partners. Normal renewal is a new
   browser-based authorization flow before expiry. The app must notify users
   and block posts once a connection expires, rather than falsely claiming to
   refresh it server-to-server. See LinkedIn's [OAuth flow documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow).

3. **`state = userId` is insecure.** OAuth state must be high-entropy,
   single-use, short-lived, stored server-side (or signed in an httpOnly
   cookie), and matched exactly on the callback. The callback must handle
   denial and error parameters.

4. **Publishing is at-least-once, not exactly-once.** A cron invocation can
   overlap, time out, or retry. Claim each due post atomically before calling
   LinkedIn, retain an idempotency/attempt record, and use a lease recovery
   path. Never select every pending row and publish them sequentially without a
   lock.

5. **Scheduled time is a target, not a promise.** Vercel states that cron
   timing is not guaranteed. UI copy should say “publishes at or shortly after”
   the selected time. Vercel automatically supplies `Bearer CRON_SECRET` to
   protected cron routes. See [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
   and [timing limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

6. **The multi-tenant credential model needs an explicit decision.** Asking
   each customer for a LinkedIn Client Secret requires them to configure the
   exact production callback URL and trust this service with that secret. For a
   real SaaS, one application-owned LinkedIn app is strongly preferable. A
   per-user app model is acceptable only for an internal/developer tool and
   must encrypt every secret at rest. In either model the app must have the
   **Share on LinkedIn** product and request only `w_member_social` for
   personal posting; `profile` is optional if OIDC user data is needed.
   [LinkedIn's access matrix](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
   documents these permissions.

## Scope for version 1

An authenticated user can connect one LinkedIn member account, draft one
text-only or single-image post, schedule it in their chosen IANA time zone,
and see whether it posted or failed. They can edit/delete only pending posts,
disconnect their LinkedIn account, and remove their image asset. The system
does not automate browsing, invitations, messages, scraping, engagement, or
multiple social networks.

Use a single LinkedIn application owned by this product unless the project is
explicitly restricted to internal developer users. The per-user app table from
the earlier guide should then be omitted entirely. If the per-user model is
chosen, keep the table but make `(user_id)` unique and never return the secret
in a route response.

## Architecture

```text
Browser
  ├─ Auth.js session ────────────────> Next.js App Router
  ├─ create/edit scheduled post ────> route handlers ──> Neon/Postgres
  └─ image upload ──────────────────> validated handler ─> Cloudinary

Vercel Cron ─> authenticated publisher ─> atomic DB claim ─> LinkedIn Images API
                                                           └> LinkedIn Posts API
```

All date/times cross the API boundary as ISO 8601 UTC. Store the original IANA
time zone alongside the UTC instant so the scheduler and UI have an auditable
record. Run database and crypto code only in the Node.js runtime; do not import
them into client components or Edge middleware.

## Delivery phases

### Phase 0 — LinkedIn feasibility gate

Complete this before building the user interface.

1. Create/select the product-owned LinkedIn application, add the Share on
   LinkedIn product, register both development and production callback URLs,
   and confirm `w_member_social` is granted.
2. With a test member, execute the authorization-code flow and manually call
   the current Images and Posts API endpoints using the required version
   headers.
3. Record the currently supported `Linkedin-Version` in a server-only
   configuration module with a test that fails when it is removed/invalid. Do
   not hard-code a sunset API version throughout route handlers.
4. Decide whether queued posts beyond a token's expiry are cancelled or held
   as `requires_reconnect`; implement that decision in the product copy and
   database state machine.

**Exit criterion:** text and image posts appear on a test profile using the
actual production API version and scope.

### Phase 1 — foundations and data model

1. Read the Next.js 16 guides in `node_modules/next/dist/docs/` before adding
   routes, middleware, or caching code, as required by `AGENTS.md`.
2. Add `src/lib/env.ts` with server-only Zod validation for required values.
   Validate format/length without logging any values. Never expose secret
   variables through a `NEXT_PUBLIC_` name.
3. Add Drizzle setup and migrations. Use `DATABASE_URL` for the current Neon
   connection unless a separate migration URL is intentionally added later.
4. Implement a versioned AES-256-GCM envelope: `keyVersion.iv.tag.ciphertext`.
   Validate decoded key length is exactly 32 bytes, use a new random 12-byte IV
   per encryption, and make decryption errors safe for users but observable in
   logs. This makes future key rotation possible.
5. Create these tables and indexes:

| Table | Key fields and constraints |
| --- | --- |
| `users` | UUID, unique normalized email, password hash, timestamps |
| `linkedin_connections` | unique `user_id`; member URN; encrypted token; `token_expires_at`; connection status; timestamps |
| `oauth_states` | hash of random state, user ID, expiry, consumed timestamp; TTL cleanup index |
| `posts` | user ID; content; image URL/public ID; `scheduled_at`; `timezone`; status; claim token/expiry; attempt count; LinkedIn post URN; error code/message; timestamps |
| `post_attempts` | post ID; attempt number; start/end; outcome; provider request/response metadata redacted of secrets |

Post status: `draft → scheduled → publishing → posted`; terminal or recovery
states are `failed`, `requires_reconnect`, and `cancelled`. Add indexes on
`(status, scheduled_at)` and `(user_id, scheduled_at DESC)`.

**Exit criterion:** migrations apply to an empty database, crypto round-trips
in tests, and the env validator starts without printing secrets.

### Phase 2 — product authentication and ownership boundaries

1. Configure the installed Auth.js beta credentials provider for email/password
   sign-up and sign-in. Hash passwords with bcrypt cost 12; use a generic error
   for invalid credentials; rate-limit registration and login.
2. Add Auth.js type augmentation so `session.user.id` is available with strict
   TypeScript types. Ensure each protected route independently calls `auth()`;
   middleware improves navigation but is not authorization.
3. Implement registration with Zod validation, normalized email, duplicate-safe
   handling, and a minimum password policy. Add login/logout pages and the
   dashboard shell.
4. Every post, upload, connection, and deletion query must include the session
   user ID in its `where` condition. Never fetch by a user-supplied ID and
   check ownership afterwards.

**Exit criterion:** users cannot access another user's post or connection by
altering route parameters or JSON bodies.

### Phase 3 — LinkedIn connection lifecycle

1. Create `/api/linkedin/authorize`: require the signed-in user, create random
   state, persist only its hash with a short expiry, and redirect with the
   exact configured callback URI and least-privilege scopes.
2. Create `/api/linkedin/callback`: check LinkedIn error parameters, look up
   and consume state atomically, exchange the code immediately, validate the
   token response, identify the member through the approved identity endpoint,
   then encrypt/upsert the connection.
3. Show connection status, member display data permitted by scope, token expiry
   date, and a reconnect button. Send in-app/email reminders before expiry if
   email delivery is later introduced. Do not promise background refresh.
4. Disconnect revokes the token if LinkedIn supports it for the product, then
   deletes local ciphertext and changes future scheduled posts to
   `requires_reconnect` (or cancellation, per Phase 0 decision).

**Exit criterion:** replayed/expired/mismatched OAuth state is rejected, a
successful connection is encrypted at rest, and expired credentials do not
cause a publish attempt.

### Phase 4 — composer, uploads, and post management

1. Build accessible dashboard, settings, post list, and new/edit post pages.
   Keep form state in client components; keep database and provider calls in
   route handlers/server modules.
2. Validate post content and scheduled time on both client and server. Reject
   times in the past and only allow states that can be scheduled. Preserve UTC
   plus the selected IANA zone.
3. Upload via an authenticated handler. Validate MIME type with file signature
   where practical, limit dimensions and byte size, reject SVG, set Cloudinary
   folder paths from the authenticated user ID, and use a server-generated
   public ID. Do not trust client-supplied Cloudinary URLs/public IDs.
4. Create, update, and delete pending posts with transactions. On replacement
   or deletion, enqueue/best-effort delete the prior Cloudinary asset only
   after ownership is established. Retain failed assets temporarily for retry
   and support diagnosis.

**Exit criterion:** a user can schedule text-only and one-image posts, and all
invalid, unauthenticated, oversized, or cross-user requests are rejected.

### Phase 5 — reliable publisher and scheduler

1. Add `vercel.json` cron configuration and a Node runtime route handler that
   compares `Authorization` exactly with `Bearer ${CRON_SECRET}`. Reject when
   the secret is absent as well as mismatched.
2. Claim due rows in bounded batches using a single SQL transaction and
   `FOR UPDATE SKIP LOCKED` (or an equivalent atomic `UPDATE … RETURNING`). Set
   `publishing`, a random claim token, and an expiry lease before any external
   call. Process batches with limited concurrency to respect runtime/rate
   limits.
3. The publisher verifies the connection remains valid, initializes an image
   through `/rest/images?action=initializeUpload`, streams/upload bytes to the
   provided URL, then creates `/rest/posts` with the required versioned
   headers. Store the returned `x-restli-id` only after a successful response.
4. Categorize failures: token/permission → `requires_reconnect`; temporary
   LinkedIn/network/provider errors → retry with bounded exponential backoff;
   validation/permanent errors → `failed`. Persist safe diagnostic detail, not
   access tokens or client secrets.
5. Recover abandoned `publishing` leases conservatively. Because a timeout may
   mean LinkedIn accepted the request, first reconcile when possible; otherwise
   surface an explicit “manual retry may duplicate” action instead of silently
   reposting.

**Exit criterion:** concurrent cron invocations produce one claimed attempt;
network/API failures transition to understandable states; a known test post
publishes and stores its LinkedIn URN.

### Phase 6 — quality, operations, and release

1. Add unit tests for crypto, env validation, scheduling/time-zone conversion,
   OAuth state, authorization, and publish result mapping. Add route tests with
   mocked Cloudinary/LinkedIn and an integration test database.
2. Add end-to-end coverage for sign-up, connection callback state validation,
   draft/schedule/edit/delete, and the successful/failed cron paths.
3. Add structured logs with request/post/attempt IDs, redaction, error
   monitoring, health checks, and an admin-safe runbook for expiring tokens,
   failed posts, duplicate-risk retries, and key rotation.
4. Set production `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` to the canonical HTTPS
   host; deploy migrations before application code; register the same callback
   URL in LinkedIn; configure Vercel cron; then perform the smoke test below.

## Release checklist

- [ ] LinkedIn test app has Share on LinkedIn and `w_member_social`; current
      versioned APIs were manually verified.
- [ ] Environment validation passes without reading or logging `.env` values.
- [ ] Migration has been applied and backed up; secrets/tokens are encrypted.
- [ ] Auth and resource-ownership tests pass.
- [ ] OAuth rejects incorrect, reused, expired, and user-denied callbacks.
- [ ] A text post and one image post publish from production.
- [ ] Expiring/expired connections visibly require reconnect, without a false
      programmatic refresh attempt.
- [ ] Cron authorization, batch claiming, failure recovery, and logs are
      exercised in production.
- [ ] Product wording states “at or shortly after” the scheduled time.

## Implementation order

Work only one vertical slice at a time: Phase 0 → Phase 1 → Phase 2 → Phase 3
→ Phase 4 → Phase 5 → Phase 6. Do not start the scheduler before the atomic
claim design and live LinkedIn feasibility gate are complete. This sequence
avoids building a UI around deprecated endpoints or a token-refresh capability
that standard LinkedIn applications do not receive.
