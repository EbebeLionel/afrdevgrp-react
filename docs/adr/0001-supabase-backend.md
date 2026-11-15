# ADR 0001: Supabase as the backend, enforced by Row Level Security

Status: accepted, 2026-11-15

## Decision

Replace Firebase (Auth, Firestore, Storage, Hosting) with Supabase (Google
auth, Postgres, Storage) and Vercel (hosting). The React app talks to Supabase
directly. There is no API server of our own. Every permission is enforced in
Postgres with Row Level Security (RLS).

## Constraints

- A student club site: tens of events and reels a year, hundreds of visitors,
  about ten admins. One small Postgres instance is far more than enough.
- Maintained by rotating student volunteers, so fewer moving parts wins.
- Free tiers: Supabase Free (500 MB database, 1 GB storage, 50 MB per file)
  and Vercel Hobby.
- Hard requirement: only allow-listed emails may create, edit or delete
  events and reels, and any admin may manage any other admin's uploads.

## Options considered

1. **Stay on Firebase.** No migration, but the admin list was duplicated in
   three places (frontend, Firestore rules, Storage rules) and had already
   drifted apart. Any signed-in user could rewrite any reel document. Files
   were stored under the uploader's id with the extension guessed on delete.
2. **Supabase plus our own API** (Vercel functions holding the service key).
   Central place for logic, but a second codebase to deploy, secure and
   monitor, for rules that are simple enough to state as SQL policies.
3. **Supabase direct from the browser with RLS** (chosen).

## Why option 3

- The rule "admins write, everyone reads" is a one-line policy per table.
  Putting it in the database means no client, script or future page can
  forget it.
- One source of truth for admins: the `admin_emails` table. The frontend
  holds no email list; it asks `is_admin()` only to decide which buttons to
  draw. Adding an admin is one SQL insert, no redeploy.
- Nothing to operate: no server, no secrets in Vercel beyond public keys.

Option 2 lost on operating cost for this team. Option 1 lost on the drift and
the open write rule.

## Key design points

- **Identity.** Google is the only sign-in method, so emails are verified.
  `is_admin()` reads the email from `auth.users` (not the token) and also
  requires `email_confirmed_at`, so it stays safe if another provider is ever
  enabled.
- **Shared ownership.** Policies check `is_admin()` and never `created_by`.
  Files live at `<content id>/<random>.<ext>`, not under a user id, so
  ownership is by content. `created_by` / `updated_by` are set by triggers
  for the audit trail and cannot be spoofed.
- **No half-written reels.** Files upload first, then one `create_reel` RPC
  inserts the reel and its media rows in a single transaction. On any failure
  the client removes the files it uploaded.
- **Delete order.** Row first, file second. A failed file delete leaves an
  orphan file (harmless), never a row pointing at a missing file.
- **Likes and comments** are separate tables with a primary key on
  `(reel_id, user_id)` for likes, replacing arrays inside the reel document
  that any signed-in user could overwrite.
- **View counter** goes through a narrow `increment_reel_view` function, the
  only thing a non-admin can change on a reel.
- **Verified.** The migration was run against real Postgres with stand-in
  `auth`/`storage` schemas and 57 checks covering anon, regular user,
  unverified allow-listed email, and two different admins.

## Accepted trade-offs

- View counts can be inflated by anyone calling the function repeatedly. They
  are cosmetic; not worth a rate limiter.
- Orphan files are possible if a browser closes mid-upload. At this volume
  they can be cleaned by hand from the Storage dashboard.
- The frontend stays on Create React App for now (a reversible choice). The
  page is rendered in the browser, which Google handles, but a move to a
  framework with server rendering would help search and link previews.
- 50 MB per file on the free plan limits video length.

## Revisit when

- Storage approaches 1 GB or videos routinely exceed 50 MB: move to Supabase
  Pro or a video host.
- A rule appears that cannot be expressed as a policy or a small SQL
  function (payments, emailing members, third-party APIs): add server
  functions then.
- Comment spam appears: add rate limiting or restrict comments to
  `@columbia.edu` / `@barnard.edu` accounts.
