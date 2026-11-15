# African Development Group Columbia (ADG) website

React app (Create React App + TypeScript) backed by Supabase and deployed on
Vercel.

- **Going live / first-time setup:** [docs/SETUP.md](docs/SETUP.md)
- **Why the backend is built this way:** [docs/adr/0001-supabase-backend.md](docs/adr/0001-supabase-backend.md)

## What the backend does

| Feature | Who |
|---|---|
| View events, reels, comments | Everyone |
| Sign up / sign in with Google | Everyone |
| Like and comment on reels, delete own comments | Signed-in users |
| Upload events (photo) and reels (photos and videos) | Admins |
| Edit events, edit reel captions, delete events / reels / any comment | Admins |

Admins are the emails in the `admin_emails` table. Any admin can edit or
delete anything another admin uploaded. The upload, edit and delete buttons
are only drawn for admins, and the database rejects those actions from anyone
else regardless of what the page shows.

## Layout

```
supabase/migrations/   database schema, security rules, storage buckets
src/lib/supabase.ts    Supabase client
src/contexts/          AuthContext: session, Google sign-in, isAdmin
src/services/          eventService, reelService, storageService
src/components/        pages
scripts/prepare-seo.js writes robots.txt and sitemap.xml before each build
scripts/migrate-from-firebase.mjs   one-time copy of old content
vercel.json            hosting config
```

## Local development

```
copy .env.example .env.local   # then fill in the two Supabase values
npm install
npm start
```

`npm run build` makes the production build in `build/`.

## Changed from the Firebase version

- Sign-in is Google only. Email/password accounts, and the birthday and
  school fields, are gone.
- Liking and commenting now need a sign-in (previously all anonymous visitors
  shared one "guest" identity).
- Old likes and comments were not migrated, because they were tied to
  Firebase accounts.
