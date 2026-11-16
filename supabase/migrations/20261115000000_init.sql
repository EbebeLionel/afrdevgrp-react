-- =============================================================================
-- ADG Columbia — initial Supabase schema
--
-- Authorization model (see docs/adr/0001-supabase-backend.md):
--   * Everyone (signed in or not) can READ events, reels, media, comments.
--   * Any signed-in user can like reels and post/delete their OWN comments.
--   * Only admins can create / edit / delete events and reels and their files.
--     Admins share one pool of content: any admin can edit or delete anything
--     another admin uploaded.
--   * "Admin" = a signed-in user whose verified email is in public.admin_emails.
--     That table is the single source of truth; the frontend only asks the
--     database `is_admin()` to decide which buttons to show.
-- Row Level Security enforces all of this in Postgres, so a modified client
-- cannot bypass it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin allow-list
-- -----------------------------------------------------------------------------
create table public.admin_emails (
  email    text primary key check (email = lower(btrim(email)) and email like '%@%'),
  added_at timestamptz not null default now()
);

-- RLS on with no policies: invisible to the anon/authenticated API roles.
-- Manage it from the Supabase SQL editor (runs as postgres).
alter table public.admin_emails enable row level security;

insert into public.admin_emails (email) values
  ('adg@columbia.edu'),
  ('adg.columbia@gmail.com'),
  ('em3820@columbia.edu'),
  ('ldm2165@columbia.edu'),
  ('cre2122@columbia.edu'),
  ('voa2107@columbia.edu'),
  ('aay2124@columbia.edu'),
  ('wso2104@columbia.edu'),
  ('fg2571@barnard.edu'),
  ('sae2161@barnard.edu');

-- True when the caller is signed in with a verified email on the allow-list.
-- SECURITY DEFINER so it can read auth.users and admin_emails, which the
-- caller cannot. Reads the email from auth.users (not from the JWT) so a
-- stale token never outlives an email change.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_emails a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Shared trigger functions
-- -----------------------------------------------------------------------------
create function public.set_created_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Never trust the client for authorship.
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create function public.set_updated_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := old.created_by;   -- authorship is immutable
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (public display info only — no emails)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 200),
  avatar_url text check (char_length(avatar_url) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Create a profile automatically when someone signs in for the first time.
-- Google puts the name in full_name/name and the photo in avatar_url/picture.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 200),
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 2000)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Events
-- -----------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 200),
  type        text not null check (type in ('g-body', 'major')),
  -- Wall-clock date/time in New York; matches how the site has always shown them.
  event_date  date not null,
  start_time  time not null,
  end_time    time not null,
  description text not null default '' check (char_length(description) <= 5000),
  link        text check (link is null or (link ~* '^https?://' and char_length(link) <= 2000)),
  -- Object name inside the "event-photos" bucket. Must live under this
  -- event's folder so deleting one event can never touch another's photo.
  photo_path  text not null check (photo_path like id::text || '/%'),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_event_date_idx on public.events (event_date desc, start_time desc);

create trigger events_created before insert on public.events
  for each row execute function public.set_created_audit();
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_audit();

alter table public.events enable row level security;

create policy "Events are public"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Admins create events"
  on public.events for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins edit events"
  on public.events for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete events"
  on public.events for delete
  to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Reels
-- -----------------------------------------------------------------------------
create table public.reels (
  id         uuid primary key default gen_random_uuid(),
  caption    text not null default '' check (char_length(caption) <= 2200),
  view_count integer not null default 0 check (view_count >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reels_created_at_idx on public.reels (created_at desc, id desc);

create trigger reels_created before insert on public.reels
  for each row execute function public.set_created_audit();
-- Only caption edits count as an edit; view-count bumps must not.
create trigger reels_updated before update of caption on public.reels
  for each row execute function public.set_updated_audit();

alter table public.reels enable row level security;

create policy "Reels are public"
  on public.reels for select
  to anon, authenticated
  using (true);

create policy "Admins create reels"
  on public.reels for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins edit reels"
  on public.reels for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete reels"
  on public.reels for delete
  to authenticated
  using ((select public.is_admin()));

-- Photos/videos belonging to a reel, in display order.
create table public.reel_media (
  id           uuid primary key default gen_random_uuid(),
  reel_id      uuid not null references public.reels (id) on delete cascade,
  kind         text not null check (kind in ('photo', 'video')),
  -- Object name inside the "reel-media" bucket, under this reel's folder.
  storage_path text not null unique check (storage_path like reel_id::text || '/%'),
  position     smallint not null check (position between 0 and 19),
  unique (reel_id, position)
);

alter table public.reel_media enable row level security;

create policy "Reel media is public"
  on public.reel_media for select
  to anon, authenticated
  using (true);

create policy "Admins add reel media"
  on public.reel_media for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins edit reel media"
  on public.reel_media for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete reel media"
  on public.reel_media for delete
  to authenticated
  using ((select public.is_admin()));

-- One row per (reel, user). The primary key makes double-likes impossible.
create table public.reel_likes (
  reel_id    uuid not null references public.reels (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create index reel_likes_user_idx on public.reel_likes (user_id);

alter table public.reel_likes enable row level security;

create policy "Likes are public"
  on public.reel_likes for select
  to anon, authenticated
  using (true);

create policy "Users like as themselves"
  on public.reel_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove their own likes"
  on public.reel_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table public.reel_comments (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references public.reels (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index reel_comments_reel_idx on public.reel_comments (reel_id, created_at);
create index reel_comments_user_idx on public.reel_comments (user_id);

alter table public.reel_comments enable row level security;

create policy "Comments are public"
  on public.reel_comments for select
  to anon, authenticated
  using (true);

create policy "Users comment as themselves"
  on public.reel_comments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Authors can delete their own comments; admins can moderate any comment.
create policy "Authors or admins delete comments"
  on public.reel_comments for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Read model for the reels page: one query returns everything a card needs.
-- security_invoker so the caller's RLS applies to every underlying table.
-- -----------------------------------------------------------------------------
create view public.reel_feed
with (security_invoker = true)
as
select
  r.id,
  r.caption,
  r.view_count,
  r.created_at,
  r.updated_at,
  r.created_by,
  coalesce(p.full_name, 'ADG Columbia') as author_name,
  p.avatar_url as author_avatar_url,
  (select count(*) from public.reel_likes l where l.reel_id = r.id)::int as like_count,
  (select count(*) from public.reel_comments c where c.reel_id = r.id)::int as comment_count,
  exists (
    select 1 from public.reel_likes l
    where l.reel_id = r.id and l.user_id = auth.uid()
  ) as liked_by_me,
  coalesce(
    (select jsonb_agg(
              jsonb_build_object('id', m.id, 'kind', m.kind, 'path', m.storage_path, 'position', m.position)
              order by m.position)
       from public.reel_media m
      where m.reel_id = r.id),
    '[]'::jsonb
  ) as media
from public.reels r
left join public.profiles p on p.id = r.created_by;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Create a reel and all of its media rows in one transaction, so a reel can
-- never exist half-written. Files are uploaded first, under <p_id>/..., then
-- this is called. SECURITY INVOKER: the normal admin RLS policies apply.
create function public.create_reel(p_id uuid, p_caption text, p_media jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can create reels' using errcode = '42501';
  end if;

  if p_media is null
     or jsonb_typeof(p_media) <> 'array'
     or jsonb_array_length(p_media) = 0 then
    raise exception 'A reel needs at least one photo or video' using errcode = '22023';
  end if;

  if jsonb_array_length(p_media) > 20 then
    raise exception 'A reel can have at most 20 photos or videos' using errcode = '22023';
  end if;

  insert into public.reels (id, caption)
  values (p_id, coalesce(btrim(p_caption), ''));

  insert into public.reel_media (reel_id, kind, storage_path, position)
  select p_id, item ->> 'kind', item ->> 'path', (ord - 1)::smallint
  from jsonb_array_elements(p_media) with ordinality as t (item, ord);

  return p_id;
end;
$$;

revoke all on function public.create_reel(uuid, text, jsonb) from public;
grant execute on function public.create_reel(uuid, text, jsonb) to authenticated;

-- Anyone may bump a reel's view counter, and nothing else on the row.
create function public.increment_reel_view(p_reel_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reels set view_count = view_count + 1 where id = p_reel_id;
$$;

revoke all on function public.increment_reel_view(uuid) from public;
grant execute on function public.increment_reel_view(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Table privileges (deny by default; RLS narrows these further)
-- -----------------------------------------------------------------------------
revoke all on public.admin_emails, public.profiles, public.events, public.reels,
              public.reel_media, public.reel_likes, public.reel_comments,
              public.reel_feed
  from anon, authenticated;

grant select on public.profiles, public.events, public.reels, public.reel_media,
                public.reel_likes, public.reel_comments, public.reel_feed
  to anon, authenticated;

grant update (full_name, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.events, public.reels, public.reel_media to authenticated;
grant insert, delete on public.reel_likes to authenticated;
grant insert (reel_id, body), delete on public.reel_comments to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: two public buckets (anyone can view), admin-only writes.
-- 50 MB is the Supabase Free-plan per-file ceiling; raise reel-media's limit
-- here and in Project Settings → Storage if you move to the Pro plan.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-photos', 'event-photos', true, 10485760, array['image/*']),
  ('reel-media',   'reel-media',   true, 52428800, array['image/*', 'video/*'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without any SELECT policy. This one lets
-- admins list/remove objects through the API (remove() needs SELECT too).
create policy "Admins read site media objects"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('event-photos', 'reel-media') and (select public.is_admin()));

create policy "Admins upload site media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('event-photos', 'reel-media') and (select public.is_admin()));

create policy "Admins replace site media"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('event-photos', 'reel-media') and (select public.is_admin()))
  with check (bucket_id in ('event-photos', 'reel-media') and (select public.is_admin()));

create policy "Admins delete site media"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('event-photos', 'reel-media') and (select public.is_admin()));
