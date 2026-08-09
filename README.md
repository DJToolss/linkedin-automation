## .env.example

```
DATABASE_URL=""
NEXTAUTH_SECRET=
NEXTAUTH_EXPIRY=""
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=
CRON_SECRET=
# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do **not** set `NODE_ENV` in `.env` or Railway variables. Next.js sets it
automatically (`development` for `next dev`, `production` for `next build`).
Setting `NODE_ENV=development` during build breaks the production build.

Auth.js v5 also accepts `AUTH_SECRET` and `AUTH_URL` as aliases for
`NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

## Railway deployment

1. Add every variable from `.env.example` to the **web service** Variables tab
   (not only a database service). **Do not set `NODE_ENV`** — Railway/Next.js
   manage it automatically.
2. Set production URLs before the build runs:

```
NEXTAUTH_URL=https://YOUR-SERVICE.up.railway.app
NEXT_PUBLIC_APP_URL=https://YOUR-SERVICE.up.railway.app
```

3. Redeploy after changing variables so the build step can embed them into the
   proxy/middleware bundle.
4. LinkedIn redirect URL:
   `https://YOUR-SERVICE.up.railway.app/api/linkedin/callback`
5. Scheduled posts publish via the in-process timer scheduler (`src/instrumentation.ts`
   starts it when the server boots). No external cron is required on Railway.
6. Optional fallback: `GET /api/cron/publish` with
   `Authorization: Bearer CRON_SECRET` still works for manual or backup triggers.

