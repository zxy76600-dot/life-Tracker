# Life Tracker

Life Tracker is a React, TypeScript, and Vite single-page app. Tracker records are stored in Supabase; the selected light/dark theme remains in browser storage. Supabase Auth manages accounts and Postgres Row Level Security scopes tracker records to the signed-in account.

## Supabase setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These values are included in the browser bundle; use only the publishable key. Never put a Supabase secret or `service_role` key in this frontend project.
2. In the Supabase Dashboard SQL Editor, run [`supabase/migrations/20261110000100_life_tracker_cloud.sql`](supabase/migrations/20261110000100_life_tracker_cloud.sql). It creates the private tracker tables, least-privilege grants, ownership policies, and the atomic legacy-data import function.
3. In Supabase Auth settings, enable email/password sign-in and configure the local and deployed site URLs/redirect URLs. Email confirmation may be enabled; new users will then confirm their address before signing in.
4. Add the same URL and publishable key as Vercel environment variables, then redeploy.

The app does not need a service key. Supabase policies apply to every browser database request. Each tracker table has row-level policies for select, insert, update, and delete, and child habit/milestone rows use composite foreign keys so they cannot reference another user's parent record.

## Existing browser data

After signing in on a browser that has the old Life Tracker data, open **Settings → Migrate Browser Data to Cloud**. Import runs only when the account has no tracker records; the SQL function performs the import as one transaction. Browser data is removed only after a successful import. JSON backups can also be exported from cloud data and restored to an empty account. Theme preference stays local to each device.

## Development

```sh
npm install
npm run dev
npm run build
npm run lint
```

The `supabase/migrations` directory contains database setup. Test privacy with two distinct accounts: each account should see and modify its own records only. Signed-out database requests should not be able to read or write tracker tables.
