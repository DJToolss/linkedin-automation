## .env.example

```
NODE_ENV=
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

Auth.js v5 also accepts `AUTH_SECRET` and `AUTH_URL` as aliases for
`NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

## Railway deployment

1. Add every variable from `.env.example` to the **web service** Variables tab
   (not only a database service).
2. Set production URLs before the build runs:

```
NEXTAUTH_URL=https://YOUR-SERVICE.up.railway.app
NEXT_PUBLIC_APP_URL=https://YOUR-SERVICE.up.railway.app
```

3. Redeploy after changing variables so the build step can embed them into the
   proxy/middleware bundle.
4. LinkedIn redirect URL:
   `https://YOUR-SERVICE.up.railway.app/api/linkedin/callback`
5. `vercel.json` cron does not run on Railway. Schedule
   `GET /api/cron/publish` with header `Authorization: Bearer CRON_SECRET`
   using Railway Cron or an external scheduler.

