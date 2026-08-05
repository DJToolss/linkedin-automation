# Phase 0 — LinkedIn feasibility verification

The project is code-ready for Phase 0, but the live verification cannot be
performed from the repository: it requires a LinkedIn developer application, a
test member who can grant consent, and authorization credentials. Do not place
the LinkedIn Client Secret in `.env`; the current project model stores one
encrypted app credential per signed-in user in the database.

## Required external steps

1. In LinkedIn Developer Portal, create or select the test app and add **Share
   on LinkedIn**. Confirm the `w_member_social` permission is approved.
2. Register the exact HTTPS callback that will later be used by the app:
   `https://<host>/api/linkedin/callback`. For localhost, use the exact URL
   accepted by LinkedIn for the development app.
3. Set the active `LINKEDIN_API_VERSION` in
   `src/lib/linkedin/config.ts` to a currently supported YYYYMM version.
4. Complete the authorization-code flow with the test member. Confirm the
   callback has a short-lived code and a state value that matches the state
   originally issued by this application.
5. Using the resulting access token, verify both operations with required
   `Linkedin-Version` and `X-Restli-Protocol-Version: 2.0.0` headers:
   - `POST /rest/posts` for a text-only post.
   - `POST /rest/images?action=initializeUpload`, upload image bytes to the
     returned URL, then create an image post through `/rest/posts`.
6. Record the test post URNs and API responses in a secure project log (never
   commit access tokens, authorization codes, or client secrets).
7. Decide the product policy for posts after a connection token expires:
   `requires_reconnect` (recommended) or cancellation. Standard LinkedIn apps
   must not assume they have programmatic refresh-token access.

## Exit criteria

Phase 0 is complete only when the two test posts are visible on the test
member's LinkedIn profile, all required permissions are granted, and the API
version in `src/lib/linkedin/config.ts` has been verified as active.
