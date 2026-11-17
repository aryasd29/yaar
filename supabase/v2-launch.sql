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
