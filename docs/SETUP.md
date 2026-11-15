# Going live: Supabase + Google sign-in + Vercel

Do these in order. Total time is about 45 minutes. Everything here is done in
your own accounts; none of it can be done from the code alone.

Use the shared ADG Google account (adg.columbia@gmail.com) to own the
Supabase, Google Cloud and Vercel projects, so access survives board turnover.

---

## 1. Create the Supabase project (5 min)

1. Go to <https://supabase.com/dashboard> and choose **New project**.
2. Name it `adg-columbia`, pick region **East US (North Virginia)**, and save
   the database password somewhere safe.
3. When it finishes, open **Project Settings > API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key

## 2. Create the database, security rules and storage (2 min)

1. In Supabase open **SQL Editor > New query**.
2. Paste the whole of `supabase/migrations/20261115000000_init.sql` and press **Run**.

That one file creates the tables, the admin list (all ten board emails), the
security rules, and the two storage buckets (`event-photos`, `reel-media`).

## 3. Turn on Google sign-in (15 min)

**In Google Cloud** (<https://console.cloud.google.com>):

1. Create a project named `ADG Columbia`.
2. **APIs & Services > OAuth consent screen**: choose **External**, app name
   `African Development Group Columbia`, add your support email, save.
   Then press **Publish app** so anyone with a Google account can sign in
   (while it is in "Testing", only listed test users can).
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: your site address
     (`https://african-development-group-columbia.vercel.app`) and
     `http://localhost:3000`
   - Authorized redirect URI: `https://YOUR-REF.supabase.co/auth/v1/callback`
     (Supabase shows the exact value on the Google provider page)
4. Copy the **Client ID** and **Client secret**.

**In Supabase**:

1. **Authentication > Sign In / Providers > Google**: enable it, paste the
   Client ID and secret, save.
2. **Authentication > Sign In / Providers > Email**: turn it **off**. Google
   is the only way in, which guarantees every email is verified by Google.
3. **Authentication > URL Configuration**:
   - Site URL: `https://african-development-group-columbia.vercel.app`
   - Redirect URLs: add `https://african-development-group-columbia.vercel.app/**`
     and `http://localhost:3000/**`

## 4. Try it locally (5 min)

```
copy .env.example .env.local
```

Put your Project URL and anon key in `.env.local`, then:

```
npm install
npm start
```

Sign in with a board email. The **+ Upload** buttons and the edit/delete
controls should appear. Sign in with a personal Gmail: they should not.

## 5. Copy the existing events and reels over from Firebase (5 min)

In **Project Settings > API**, copy the **service_role** key (treat it like a
password: it bypasses every security rule). In PowerShell:

```
$env:SUPABASE_URL = "https://YOUR-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "paste-it-here"
node scripts/migrate-from-firebase.mjs --dry-run
node scripts/migrate-from-firebase.mjs
```

It copies the 10 events and 4 reels with their photos and videos. It is safe
to run twice. Likes and comments are not copied (see the README).

## 6. Deploy on Vercel (10 min)

1. Push this repository to GitHub.
2. At <https://vercel.com/new>, import the repository.
3. Set **Project Name** to `african-development-group-columbia`. That gives
   the address `african-development-group-columbia.vercel.app`. If the name
   is taken, pick another and use that address everywhere in this guide.
4. Add **Environment Variables** (Production and Preview):

   | Name | Value |
   |---|---|
   | `REACT_APP_SUPABASE_URL` | your Project URL |
   | `REACT_APP_SUPABASE_ANON_KEY` | your anon public key |
   | `REACT_APP_SITE_URL` | `https://african-development-group-columbia.vercel.app` |

   Do **not** add the service_role key.
5. Press **Deploy**. Every later push to `main` redeploys automatically.

## 7. Get it onto Google (10 min, then wait)

A domain name cannot contain spaces, so the *domain* is
`african-development-group-columbia.vercel.app`, while the *name Google shows*
is "African Development Group Columbia". The site already declares that name
in its title, description and structured data. What is left is telling Google
the site exists:

1. Go to <https://search.google.com/search-console> and **Add property >
   URL prefix**, entering the full site address.
2. Verify with the **HTML tag** method: Google gives you a tag like
   `<meta name="google-site-verification" content="...">`. Paste it into
   `public/index.html` just above `<title>`, push, wait for the deploy, then
   press **Verify**.
3. **Sitemaps**: submit `sitemap.xml`.
4. **URL inspection**: paste the homepage address and press
   **Request indexing**.

Expect the site to appear within a few days to two weeks. Google decides
ranking on its own, so nobody can guarantee position, but an exact
organisation name with little competition normally reaches the first results.
Things that speed it up and strengthen it:

- Link to the site from the ADG Instagram bio and Linktree.
- Ask Columbia to list the site on the club's official directory page
  (a link from a columbia.edu page carries a lot of weight).
- A custom domain such as `adgcolumbia.org` (about $12 a year, added under
  Vercel > Project > Domains) looks more official than a `vercel.app` address
  and tends to be trusted more. If you add one, update `REACT_APP_SITE_URL`,
  the Supabase URL settings, and the Google OAuth origins to match.

## 8. Retire Firebase

Once the live site has run on Supabase for a week or two without problems,
delete the Firebase project (`adg-columbia-13d72`) from the Firebase console.
Until then it is your backup.

---

## Everyday admin tasks

**Add an admin** (Supabase > SQL Editor):

```sql
insert into public.admin_emails (email) values ('newperson@columbia.edu');
```

**Remove an admin:**

```sql
delete from public.admin_emails where email = 'oldperson@columbia.edu';
```

Emails must be lower-case. Changes apply the next time that person loads the
site; no redeploy needed.

**Bigger videos:** the free Supabase plan caps each file at 50 MB and total
storage at 1 GB. On the Pro plan, raise the limit in Project Settings >
Storage, in the `reel-media` bucket settings, and in `MAX_REEL_FILE_MB` in
`src/services/storageService.ts`.

**Free-plan pause:** Supabase pauses free projects after a week with no
activity. Normal site traffic prevents this; if it ever happens, press
**Restore** in the dashboard.
