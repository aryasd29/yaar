-- =====================================================================
-- Yaar database. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once.
-- =====================================================================

-- ---------- Profiles (public scrapbook) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,                     -- the scrapbook: name, age, moments, hot take, ...
  updated_at timestamptz not null default now()
);

-- Private details (work, college, phone). Only the owner can ever read these.
create table if not exists public.private_details (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Blocks and reports ----------
create table if not exists public.blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users(id) on delete cascade,
  reported uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

-- True if either person has blocked the other.
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

-- ---------- Reactions ----------
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  target jsonb not null,                   -- which piece of the scrapbook: {kind, refId, label}
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','matched','passed')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

-- ---------- Matches ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','ended')),
  ended_by uuid,
  end_reason text,
  check (user_a < user_b),
  unique (user_a, user_b)
);

-- ---------- Messages ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  from_id uuid references auth.users(id) on delete cascade,   -- null = a message from Yaar
  body text not null,
  kind text not null default 'text' check (kind in ('text','system','game','date')),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- ---------- Date plans (shared by the two people in a match) ----------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.in_match(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and auth.uid() in (user_a, user_b));
$$;

-- ---------- When two people react to each other, open a match ----------
create or replace function public.on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  back reactions%rowtype;
  mid uuid;
begin
  if public.is_blocked(new.from_id, new.to_id) then
    raise exception 'blocked';
  end if;
  select * into back from reactions
    where from_id = new.to_id and to_id = new.from_id and status = 'pending' limit 1;
  if found then
    insert into matches (user_a, user_b)
      values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id))
      on conflict (user_a, user_b) do update set status = 'active', ended_by = null, end_reason = null
      returning id into mid;
    update reactions set status = 'matched' where id = back.id;
    new.status := 'matched';
    -- The two reactions become the first messages of the chat.
    insert into messages (match_id, from_id, body, kind, meta, created_at) values
      (mid, back.from_id, coalesce(nullif(back.note, ''), 'Reacted to ' || (back.target->>'label')), 'text', jsonb_build_object('reaction', back.target), back.created_at),
      (mid, new.from_id, coalesce(nullif(new.note, ''), 'Reacted to ' || (new.target->>'label')), 'text', jsonb_build_object('reaction', new.target), now());
  end if;
  return new;
end $$;

drop trigger if exists reaction_match on public.reactions;
create trigger reaction_match before insert on public.reactions
  for each row execute function public.on_reaction();

-- Keep a match's "last activity" fresh (drives the 15-day expiry).
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update matches set last_activity_at = new.created_at where id = new.match_id and last_activity_at < new.created_at;
  return new;
end $$;
drop trigger if exists message_activity on public.messages;
create trigger message_activity after insert on public.messages
  for each row execute function public.on_message();

-- ---------- Row Level Security: people only see what they should ----------
alter table public.profiles enable row level security;
alter table public.private_details enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.reactions enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.plans enable row level security;

drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or not public.is_blocked(auth.uid(), id));
drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own private details" on public.private_details;
create policy "own private details" on public.private_details for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own blocks" on public.blocks;
create policy "own blocks" on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

drop policy if exists "file reports" on public.reports;
create policy "file reports" on public.reports for insert to authenticated with check (reporter = auth.uid());

drop policy if exists "see my reactions" on public.reactions;
create policy "see my reactions" on public.reactions for select to authenticated
  using (auth.uid() in (from_id, to_id));
drop policy if exists "send reactions" on public.reactions;
create policy "send reactions" on public.reactions for insert to authenticated
  with check (from_id = auth.uid() and to_id <> auth.uid());
drop policy if exists "pass on reactions" on public.reactions;
create policy "pass on reactions" on public.reactions for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

drop policy if exists "see my matches" on public.matches;
create policy "see my matches" on public.matches for select to authenticated
  using (auth.uid() in (user_a, user_b));
drop policy if exists "end my matches" on public.matches;
create policy "end my matches" on public.matches for update to authenticated
  using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));

drop policy if exists "read chat" on public.messages;
create policy "read chat" on public.messages for select to authenticated using (public.in_match(match_id));
drop policy if exists "send chat" on public.messages;
create policy "send chat" on public.messages for insert to authenticated
  with check (public.in_match(match_id) and (from_id = auth.uid() or (from_id is null and kind = 'date'))
    and exists (select 1 from matches where id = match_id and status = 'active'));

drop policy if exists "shared plans" on public.plans;
create policy "shared plans" on public.plans for all to authenticated
  using (public.in_match(match_id)) with check (public.in_match(match_id));

-- ---------- Live updates ----------
do $$ begin
  begin alter publication supabase_realtime add table public.reactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.matches;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.plans;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles;  exception when duplicate_object then null; end;
end $$;

-- Lets a signed-in person permanently delete their own account.
-- Deleting the login removes everything linked to it (profile, private details,
-- reactions, matches, messages, plans, blocks) because every table cascades.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- =====================================================================
-- Isle v2: launch hardening. Run once in Supabase → SQL Editor, after schema.sql.
-- Safe to run more than once.
--  * Photo and voice storage
--  * Private discovery: you can only read profiles you're introduced to or connected with
--  * Server-side passes (so "Not for me" works on every device)
--  * Moderation: admins, report review, suspensions
--  * Funnel events for the north-star metric
--  * Rate limits against spam
-- =====================================================================

-- ---------- Storage for photos and voice notes ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do update set public = true;

drop policy if exists "media: upload own" on storage.objects;
create policy "media: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media: update own" on storage.objects;
create policy "media: update own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media: delete own" on storage.objects;
create policy "media: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Moderation ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists reviewed_at timestamptz;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
create or replace function public.is_suspended(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from suspensions where user_id = u);
$$;

alter table public.admins enable row level security;
alter table public.suspensions enable row level security;
drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists "see own suspension" on public.suspensions;
create policy "see own suspension" on public.suspensions for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- Passes ("Not for me"), synced across devices ----------
create table if not exists public.passes (
  user_id uuid not null references auth.users(id) on delete cascade,
  passed uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, passed)
);
alter table public.passes enable row level security;
drop policy if exists "own passes" on public.passes;
create policy "own passes" on public.passes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Private profiles ----------
-- You can read your own profile, and the profiles of people you've reacted with or matched with.
-- Everyone else is reached only through discover(), which returns just today's introductions.
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (
  id = auth.uid() or (
    not public.is_blocked(auth.uid(), id) and not public.is_suspended(id) and (
      exists (select 1 from reactions r where (r.from_id = auth.uid() and r.to_id = profiles.id) or (r.to_id = auth.uid() and r.from_id = profiles.id))
      or exists (select 1 from matches m where (m.user_a = auth.uid() and m.user_b = profiles.id) or (m.user_b = auth.uid() and m.user_a = profiles.id))
    )
  )
);

-- Today's introductions: people who fit your preferences AND whose preferences fit you,
-- excluding anyone you've passed on, reacted to, matched with or blocked, and suspended accounts.
create or replace function public.discover(max_count int default 12) returns setof public.profiles
language sql stable security definer set search_path = public as $$
  with me as (
    select p.data as d, coalesce(pd.data->'prefs', '{}'::jsonb) as prefs
    from profiles p left join private_details pd on pd.id = p.id
    where p.id = auth.uid()
  )
  select pr.*
  from profiles pr
  cross join me
  left join private_details tp on tp.id = pr.id
  where pr.id <> auth.uid()
    and not public.is_blocked(auth.uid(), pr.id)
    and not public.is_suspended(pr.id)
    and coalesce(pr.data->>'battery', 'full') <> 'low'
    and not exists (select 1 from passes where user_id = auth.uid() and passed = pr.id)
    and not exists (select 1 from reactions where from_id = auth.uid() and to_id = pr.id)
    and not exists (select 1 from matches m where (m.user_a = auth.uid() and m.user_b = pr.id) or (m.user_b = auth.uid() and m.user_a = pr.id))
    -- my preferences
    and (coalesce(me.prefs->>'interestedIn', 'everyone') = 'everyone'
         or (me.prefs->>'interestedIn' = 'women' and pr.data->>'gender' = 'woman')
         or (me.prefs->>'interestedIn' = 'men' and pr.data->>'gender' = 'man'))
    and coalesce((pr.data->>'age')::int, 0) between coalesce((me.prefs->>'ageMin')::int, 18) and coalesce((me.prefs->>'ageMax')::int, 99)
    and (me.prefs->'intents' is null or pr.data->>'intent' in (select jsonb_array_elements_text(me.prefs->'intents')))
    -- their preferences
    and (coalesce(tp.data->'prefs'->>'interestedIn', 'everyone') = 'everyone'
         or (tp.data->'prefs'->>'interestedIn' = 'women' and me.d->>'gender' = 'woman')
         or (tp.data->'prefs'->>'interestedIn' = 'men' and me.d->>'gender' = 'man'))
    and coalesce((me.d->>'age')::int, 0) between coalesce((tp.data->'prefs'->>'ageMin')::int, 18) and coalesce((tp.data->'prefs'->>'ageMax')::int, 99)
  order by pr.updated_at desc
  limit greatest(1, least(max_count, 30));
$$;
revoke all on function public.discover(int) from public, anon;
grant execute on function public.discover(int) to authenticated;

-- ---------- Funnel events (north-star: verified first dates) ----------
create table if not exists public.events (
  id bigserial primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null check (name in ('signup_completed','reaction_sent','match_created','first_message','date_confirmed','date_attended','feedback_given')),
  props jsonb,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "log own events" on public.events;
create policy "log own events" on public.events for insert to authenticated with check (user_id = auth.uid());

-- ---------- Admin tools (only work for accounts listed in public.admins) ----------
create or replace function public.admin_reports() returns table (
  id uuid, created_at timestamptz, reason text, details text, status text,
  reporter uuid, reporter_name text, reported uuid, reported_name text, reported_suspended boolean, reports_against bigint
) language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, r.reason, r.details, r.status,
         r.reporter, rp.data->>'name', r.reported, dp.data->>'name', public.is_suspended(r.reported),
         (select count(*) from reports x where x.reported = r.reported)
  from reports r
  left join profiles rp on rp.id = r.reporter
  left join profiles dp on dp.id = r.reported
  where public.is_admin()
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
$$;

create or replace function public.admin_set_report(report_id uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update reports set status = new_status, reviewed_at = now() where id = report_id;
end $$;

create or replace function public.admin_suspend(target uuid, why text, on_off boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if on_off then
    insert into suspensions (user_id, reason) values (target, why) on conflict (user_id) do update set reason = excluded.reason;
    update matches set status = 'ended', end_reason = 'suspended' where (user_a = target or user_b = target) and status = 'active';
  else
    delete from suspensions where user_id = target;
  end if;
end $$;

create or replace function public.admin_funnel() returns table (step text, people bigint, total bigint)
language sql stable security definer set search_path = public as $$
  select s.name, count(distinct e.user_id), count(e.id)
  from (values ('signup_completed',1),('reaction_sent',2),('match_created',3),('first_message',4),('date_confirmed',5),('date_attended',6),('feedback_given',7)) as s(name, ord)
  left join events e on e.name = s.name
  where public.is_admin()
  group by s.name, s.ord
  order by s.ord;
$$;

create or replace function public.admin_stats() returns table (members bigint, matches bigint, messages bigint, open_reports bigint, suspended bigint)
language sql stable security definer set search_path = public as $$
  select (select count(*) from profiles), (select count(*) from matches), (select count(*) from messages),
         (select count(*) from reports where status = 'open'), (select count(*) from suspensions)
  where public.is_admin();
$$;

revoke all on function public.admin_reports(), public.admin_set_report(uuid, text), public.admin_suspend(uuid, text, boolean), public.admin_funnel(), public.admin_stats() from public, anon;
grant execute on function public.admin_reports(), public.admin_set_report(uuid, text), public.admin_suspend(uuid, text, boolean), public.admin_funnel(), public.admin_stats() to authenticated;

-- ---------- Rate limits and suspensions, enforced by the database ----------
create or replace function public.guard_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_suspended(new.from_id) then raise exception 'account suspended'; end if;
  if (select count(*) from reactions where from_id = new.from_id and created_at > now() - interval '24 hours') >= 40 then
    raise exception 'limit: reactions';
  end if;
  return new;
end $$;
drop trigger if exists reaction_guard on public.reactions;
create trigger reaction_guard before insert on public.reactions for each row execute function public.guard_reaction();

create or replace function public.guard_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.from_id is null then return new; end if;
  if public.is_suspended(new.from_id) then raise exception 'account suspended'; end if;
  if (select count(*) from messages where from_id = new.from_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'limit: messages';
  end if;
  return new;
end $$;
drop trigger if exists message_guard on public.messages;
create trigger message_guard before insert on public.messages for each row execute function public.guard_message();

-- Make sure the delete-account function exists (also in delete-account.sql).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
