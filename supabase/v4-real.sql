-- Isle v4: everything real.
-- Run once in the Supabase SQL editor after schema.sql, v2-launch.sql and v3-plus.sql. Safe to run again.
--
--  * Payments, Isle Plus, Isle credit, date bundles and the ₹99 show-up promise are recorded by the server
--    (the /api/pay route, using the service-role key). Members can read their own rows but never write them.
--  * Tables are real: members who passed the selfie check host free Tables; admins can also set a seat price.
--  * Selfie verification: the badge comes only from public.verifications, never from the profile itself.
--  * Check-in: each person has a private code for each date; scanning the other person's code checks you both in.
--  * Live location sharing for a trusted contact, through a private link that expires.
--  * Web push subscriptions.

create extension if not exists pgcrypto;

-- =====================================================================================
-- Selfie verification
-- =====================================================================================
create table if not exists public.verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'verified' check (status in ('verified','revoked')),
  selfie_path text,
  liveness jsonb,
  match_score real,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
alter table public.verifications enable row level security;
drop policy if exists "see own verification" on public.verifications;
create policy "see own verification" on public.verifications for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.is_verified(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from verifications where user_id = u and status = 'verified')
$$;

-- The "Selfie-checked" badge in a profile always mirrors public.verifications, whatever the app sends.
create or replace function public.keep_verified_honest() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{verified}', to_jsonb(public.is_verified(new.id)));
  return new;
end $$;
drop trigger if exists keep_verified_honest on public.profiles;
create trigger keep_verified_honest before insert or update on public.profiles
  for each row execute function public.keep_verified_honest();

-- Private bucket for verification selfies: only the owner and admins can read them.
insert into storage.buckets (id, name, public) values ('selfies', 'selfies', false)
  on conflict (id) do update set public = false;
drop policy if exists "selfies: upload own" on storage.objects;
create policy "selfies: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "selfies: read own or admin" on storage.objects;
create policy "selfies: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'selfies' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "selfies: delete own" on storage.objects;
create policy "selfies: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);

-- Called by the app after the on-device liveness and face-match checks pass.
create or replace function public.submit_verification(selfie_path text, liveness jsonb, match_score real) returns boolean
language plpgsql security definer set search_path = public, storage as $$
declare ok boolean;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from verifications where user_id = auth.uid() and status = 'revoked') then
    raise exception 'Your selfie check was reviewed by our team. Contact support to try again.';
  end if;
  if split_part(selfie_path, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'selfies' and o.name = selfie_path) then
    raise exception 'selfie not found';
  end if;
  ok := coalesce((liveness->>'turned')::boolean, false) and coalesce((liveness->>'smiled')::boolean, false)
        and match_score is not null and match_score >= 0.5;
  if not ok then return false; end if;
  insert into verifications (user_id, status, selfie_path, liveness, match_score)
    values (auth.uid(), 'verified', selfie_path, liveness, match_score)
    on conflict (user_id) do update set status = 'verified', selfie_path = excluded.selfie_path,
      liveness = excluded.liveness, match_score = excluded.match_score, created_at = now(), reviewed_by = null, reviewed_at = null;
  update profiles set updated_at = now() where id = auth.uid(); -- re-runs the badge trigger
  return true;
end $$;
revoke all on function public.submit_verification(text, jsonb, real) from public, anon;
grant execute on function public.submit_verification(text, jsonb, real) to authenticated;

create or replace function public.admin_verifications() returns table (
  user_id uuid, name text, status text, selfie_path text, match_score real, created_at timestamptz, photo text
) language sql stable security definer set search_path = public as $$
  select v.user_id, p.data->>'name', v.status, v.selfie_path, v.match_score, v.created_at,
         (select m->>'photoUrl' from jsonb_array_elements(p.data->'moments') m where m->>'photoUrl' is not null limit 1)
  from verifications v left join profiles p on p.id = v.user_id
  where public.is_admin()
  order by v.created_at desc limit 200;
$$;

create or replace function public.admin_set_verification(u uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update verifications set status = new_status, reviewed_by = auth.uid(), reviewed_at = now() where user_id = u;
  update profiles set updated_at = now() where id = u;
end $$;

-- =====================================================================================
-- Payments, Isle Plus and Isle credit (written only by the server with the service-role key)
-- =====================================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  amount int not null,                 -- rupees charged to the card (after credit)
  credit_used int not null default 0,  -- rupees of Isle credit applied
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','partly_refunded')),
  provider text not null default 'test' check (provider in ('razorpay','test','free')),
  order_id text,
  payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_user on public.payments(user_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "see own payments" on public.payments;
create policy "see own payments" on public.payments for select to authenticated using (user_id = auth.uid() or public.is_admin());

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('intro','monthly','quarterly')),
  since timestamptz not null default now(),
  until timestamptz not null,
  auto_renew boolean not null default true,
  free_seat_months text[] not null default '{}',
  freeze_until timestamptz,
  sparked uuid[] not null default '{}',
  second_tide_day text,
  intro_used boolean not null default false,
  last_payment uuid references public.payments(id) on delete set null
);
alter table public.memberships enable row level security;
drop policy if exists "see own membership" on public.memberships;
create policy "see own membership" on public.memberships for select to authenticated using (user_id = auth.uid());

create or replace function public.has_plus(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = u and until > now())
$$;

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,          -- positive = earned, negative = spent (rupees)
  reason text not null,
  ref uuid,
  created_at timestamptz not null default now()
);
create index if not exists credits_user on public.credits(user_id);
alter table public.credits enable row level security;
drop policy if exists "see own credit" on public.credits;
create policy "see own credit" on public.credits for select to authenticated using (user_id = auth.uid());

create or replace function public.credit_balance(u uuid default auth.uid()) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from credits where user_id = u and (u = auth.uid() or auth.role() = 'service_role')
$$;

-- Freeze my matches: a frozen chat stays open for both people until the freeze ends.
alter table public.matches add column if not exists frozen_until timestamptz;

-- Member-controlled Plus settings
create or replace function public.plus_set_auto_renew(on_ boolean) returns void
language sql security definer set search_path = public as $$
  update memberships set auto_renew = on_ where user_id = auth.uid();
$$;

create or replace function public.plus_freeze(days int) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if not public.has_plus(auth.uid()) then raise exception 'Isle Plus needed'; end if;
  if days is null or days <= 0 then
    update matches set frozen_until = null, last_activity_at = greatest(last_activity_at, now())
      where status = 'active' and auth.uid() in (user_a, user_b) and frozen_until is not null;
    update memberships set freeze_until = null where user_id = auth.uid();
    return null;
  end if;
  t := now() + make_interval(days => least(days, 30));
  update memberships set freeze_until = t where user_id = auth.uid();
  update matches set frozen_until = t where status = 'active' and auth.uid() in (user_a, user_b);
  return t;
end $$;

create or replace function public.spark_again(m uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plus(auth.uid()) then raise exception 'Isle Plus needed'; end if;
  if not exists (select 1 from matches where id = m and auth.uid() in (user_a, user_b) and status = 'active') then return false; end if;
  if exists (select 1 from memberships where user_id = auth.uid() and m = any(sparked)) then return false; end if;
  update memberships set sparked = array_append(sparked, m) where user_id = auth.uid();
  update matches set last_activity_at = now() where id = m;
  return true;
end $$;

-- =====================================================================================
-- Tables (small group meetups)
-- =====================================================================================
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 80),
  blurb text not null default '' check (char_length(blurb) <= 600),
  circle text not null default 'New to Bengaluru',
  area text not null check (char_length(area) between 2 and 60),
  scene text not null default 'coffee',
  starts_at timestamptz not null,
  seats int not null check (seats between 2 and 20),
  price int not null default 0 check (price between 0 and 5000),
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists tables_when on public.tables(starts_at);
alter table public.tables enable row level security;

-- The exact place is only for the host and people with a seat.
create table if not exists public.table_places (
  table_id uuid primary key references public.tables(id) on delete cascade,
  place text not null check (char_length(place) between 3 and 200)
);
alter table public.table_places enable row level security;

create table if not exists public.table_seats (
  table_id uuid not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked','cancelled')),
  paid int not null default 0,
  free_plus boolean not null default false,
  payment uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (table_id, user_id)
);
alter table public.table_seats enable row level security;

create or replace function public.has_seat(t uuid, u uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from table_seats where table_id = t and user_id = u and status = 'booked')
      or exists (select 1 from tables where id = t and host = u)
$$;

drop policy if exists "browse tables" on public.tables;
create policy "browse tables" on public.tables for select to authenticated
  using ((status = 'open' and not public.is_suspended(host)) or host = auth.uid() or public.has_seat(id) or public.is_admin());
drop policy if exists "host tables" on public.tables;
create policy "host tables" on public.tables for insert to authenticated
  with check (host = auth.uid() and (public.is_verified(auth.uid()) or public.is_admin()) and (price = 0 or public.is_admin())
              and starts_at > now() and not public.is_suspended(auth.uid()));
drop policy if exists "edit own tables" on public.tables;
create policy "edit own tables" on public.tables for update to authenticated
  using (host = auth.uid() or public.is_admin())
  with check ((host = auth.uid() or public.is_admin()) and (price = 0 or public.is_admin()));

drop policy if exists "see place when going" on public.table_places;
create policy "see place when going" on public.table_places for select to authenticated using (public.has_seat(table_id) or public.is_admin());
drop policy if exists "host sets place" on public.table_places;
create policy "host sets place" on public.table_places for all to authenticated
  using (exists (select 1 from tables where id = table_id and (host = auth.uid() or public.is_admin())))
  with check (exists (select 1 from tables where id = table_id and (host = auth.uid() or public.is_admin())));

drop policy if exists "see own seats" on public.table_seats;
create policy "see own seats" on public.table_seats for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- What everyone sees in the list: seats taken (host included) and whether I'm going.
create or replace function public.tables_list() returns table (
  id uuid, host uuid, host_name text, title text, blurb text, circle text, area text, scene text,
  starts_at timestamptz, seats int, price int, status text, taken int, going boolean, hosting boolean
) language sql stable security definer set search_path = public as $$
  select t.id, t.host, hp.data->>'name', t.title, t.blurb, t.circle, t.area, t.scene, t.starts_at, t.seats, t.price, t.status,
         (select count(*)::int from table_seats s where s.table_id = t.id and s.status = 'booked') + 1,
         public.has_seat(t.id) and t.host <> auth.uid(),
         t.host = auth.uid()
  from tables t left join profiles hp on hp.id = t.host
  where auth.uid() is not null
    and (t.status = 'open' or t.host = auth.uid() or public.has_seat(t.id))
    and t.starts_at > now() - interval '6 hours'
    and not public.is_suspended(t.host)
    and not public.is_blocked(auth.uid(), t.host)
  order by t.starts_at
  limit 200;
$$;
revoke all on function public.tables_list() from public, anon;
grant execute on function public.tables_list() to authenticated;

-- Who's going: first name and first photo, only for people who are going themselves.
create or replace function public.table_people(t uuid) returns table (user_id uuid, name text, photo text, scene text, is_host boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.data->>'name',
         (select m->>'photoUrl' from jsonb_array_elements(p.data->'moments') m where m->>'photoUrl' is not null limit 1),
         p.data->'moments'->0->>'scene', p.id = tb.host
  from tables tb
  join profiles p on p.id = tb.host or p.id in (select s.user_id from table_seats s where s.table_id = tb.id and s.status = 'booked')
  where tb.id = t and public.has_seat(t)
  order by (p.id = tb.host) desc;
$$;
revoke all on function public.table_people(uuid) from public, anon;
grant execute on function public.table_people(uuid) to authenticated;

-- Seats: free seats are booked directly; paid seats are booked by the server after payment.
create or replace function public.seat_internal(t uuid, u uuid, paid_ int, free_plus_ boolean, pay uuid) returns void
language plpgsql security definer set search_path = public as $$
declare tb tables%rowtype; taken int;
begin
  select * into tb from tables where id = t for update;
  if not found or tb.status <> 'open' then raise exception 'This Table is no longer open.'; end if;
  if tb.starts_at < now() then raise exception 'This Table has already started.'; end if;
  if tb.host = u then raise exception 'You are hosting this Table.'; end if;
  if public.is_blocked(u, tb.host) then raise exception 'You can''t join this Table.'; end if;
  select count(*) into taken from table_seats where table_id = t and status = 'booked' and user_id <> u;
  if taken + 1 >= tb.seats then raise exception 'Sorry, this Table just filled up.'; end if;
  insert into table_seats (table_id, user_id, status, paid, free_plus, payment) values (t, u, 'booked', paid_, free_plus_, pay)
    on conflict (table_id, user_id) do update set status = 'booked', paid = excluded.paid, free_plus = excluded.free_plus, payment = excluded.payment, created_at = now();
end $$;
revoke all on function public.seat_internal(uuid, uuid, int, boolean, uuid) from public, anon, authenticated;

create or replace function public.join_free_table(t uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if public.is_suspended(auth.uid()) then raise exception 'Your account is paused.'; end if;
  if (select price from tables where id = t) <> 0 then raise exception 'This Table needs a paid seat.'; end if;
  perform public.seat_internal(t, auth.uid(), 0, false, null);
end $$;
revoke all on function public.join_free_table(uuid) from public, anon;
grant execute on function public.join_free_table(uuid) to authenticated;

-- =====================================================================================
-- Dates: show-up promise deposits, bundles and check-in
-- =====================================================================================
create table if not exists public.deposits (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null default 99,
  payment uuid references public.payments(id) on delete set null,
  status text not null default 'held' check (status in ('held','refunded','forfeited','credited')),
  settled_at timestamptz,
  primary key (plan_id, user_id)
);
alter table public.deposits enable row level security;
drop policy if exists "see deposits on my dates" on public.deposits;
create policy "see deposits on my dates" on public.deposits for select to authenticated
  using (exists (select 1 from plans p where p.id = plan_id and public.in_match(p.match_id)));

create table if not exists public.bundles (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  price int not null,
  code text not null default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  payment uuid references public.payments(id) on delete set null,
  status text not null default 'paid' check (status in ('paid','redeemed','refunded')),
  primary key (plan_id, user_id)
);
alter table public.bundles enable row level security;
drop policy if exists "see bundles on my dates" on public.bundles;
create policy "see bundles on my dates" on public.bundles for select to authenticated
  using (exists (select 1 from plans p where p.id = plan_id and public.in_match(p.match_id)));

-- Each person gets a private code for each date. Scanning the other person's code checks both of you in.
create table if not exists public.checkin_codes (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  primary key (plan_id, user_id)
);
alter table public.checkin_codes enable row level security;
drop policy if exists "see my own code" on public.checkin_codes;
create policy "see my own code" on public.checkin_codes for select to authenticated using (user_id = auth.uid());

create table if not exists public.checkins (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
alter table public.checkins enable row level security;
drop policy if exists "see check-ins on my dates" on public.checkins;
create policy "see check-ins on my dates" on public.checkins for select to authenticated
  using (exists (select 1 from plans p where p.id = plan_id and public.in_match(p.match_id)));

create or replace function public.my_checkin_code(p uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not exists (select 1 from plans where id = p and public.in_match(match_id)) then raise exception 'not your date'; end if;
  insert into checkin_codes (plan_id, user_id) values (p, auth.uid()) on conflict do nothing;
  select code into c from checkin_codes where plan_id = p and user_id = auth.uid();
  return c;
end $$;
revoke all on function public.my_checkin_code(uuid) from public, anon;
grant execute on function public.my_checkin_code(uuid) to authenticated;

create or replace function public.check_in(p uuid, their_code text) returns text
language plpgsql security definer set search_path = public as $$
declare other uuid; slot timestamptz;
begin
  if not exists (select 1 from plans where id = p and public.in_match(match_id)) then raise exception 'not your date'; end if;
  select (data->>'slot')::timestamptz into slot from plans where id = p;
  if slot is null then return 'no_time'; end if;
  if now() < slot - interval '1 hour' then return 'too_early'; end if;
  if now() > slot + interval '6 hours' then return 'too_late'; end if;
  select user_id into other from checkin_codes where plan_id = p and user_id <> auth.uid() and code = upper(trim(their_code));
  if other is null then return 'wrong_code'; end if;
  insert into checkins (plan_id, user_id) values (p, auth.uid()), (p, other) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.check_in(uuid, text) from public, anon;
grant execute on function public.check_in(uuid, text) to authenticated;

-- =====================================================================================
-- Live location sharing with a trusted contact
-- =====================================================================================
create table if not exists public.location_shares (
  token text primary key default encode(gen_random_bytes(12), 'hex'),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete cascade,
  lat double precision,
  lng double precision,
  accuracy real,
  updated_at timestamptz,
  expires_at timestamptz not null default now() + interval '6 hours',
  stopped boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.location_shares enable row level security;
drop policy if exists "own location shares" on public.location_shares;
create policy "own location shares" on public.location_shares for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- What the trusted contact sees, by link only. No account needed.
create or replace function public.view_location_share(t text) returns table (
  name text, lat double precision, lng double precision, accuracy real, updated_at timestamptz,
  expires_at timestamptz, live boolean, place text, slot text
) language sql stable security definer set search_path = public as $$
  select pr.data->>'name', s.lat, s.lng, s.accuracy, s.updated_at, s.expires_at,
         (not s.stopped and s.expires_at > now()),
         pl.data->>'venueId', pl.data->>'slot'
  from location_shares s
  join profiles pr on pr.id = s.user_id
  left join plans pl on pl.id = s.plan_id
  where s.token = t and s.created_at > now() - interval '2 days';
$$;
revoke all on function public.view_location_share(text) from public;
grant execute on function public.view_location_share(text) to anon, authenticated;

-- =====================================================================================
-- Web push
-- =====================================================================================
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================================
-- Discovery reads Plus from memberships now (incognito and lifestyle filters)
-- =====================================================================================
create or replace function public.discover(max_count int default 12) returns setof public.profiles
language sql stable security definer set search_path = public as $$
  with me as (
    select p.data as d, coalesce(pd.data->'prefs', '{}'::jsonb) as prefs, public.has_plus(auth.uid()) as plus
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
    and (coalesce((pr.data->>'incognito')::boolean, false) = false
         or not public.has_plus(pr.id)
         or exists (select 1 from reactions r where r.from_id = pr.id and r.to_id = auth.uid()))
    and (coalesce(me.prefs->>'interestedIn', 'everyone') = 'everyone'
         or (me.prefs->>'interestedIn' = 'women' and pr.data->>'gender' = 'woman')
         or (me.prefs->>'interestedIn' = 'men' and pr.data->>'gender' = 'man'))
    and coalesce((pr.data->>'age')::int, 0) between coalesce((me.prefs->>'ageMin')::int, 18) and coalesce((me.prefs->>'ageMax')::int, 99)
    and (me.prefs->'intents' is null or pr.data->>'intent' in (select jsonb_array_elements_text(me.prefs->'intents')))
    and (not me.plus or (
          public.lifestyle_ok(me.prefs->'lifestyle'->'diet', pr.data->'lifestyle'->>'diet')
      and public.lifestyle_ok(me.prefs->'lifestyle'->'drinks', pr.data->'lifestyle'->>'drinks')
      and public.lifestyle_ok(me.prefs->'lifestyle'->'smokes', pr.data->'lifestyle'->>'smokes')
      and (jsonb_array_length(coalesce(me.prefs->'lifestyle'->'languages', '[]'::jsonb)) = 0
           or pr.data->'lifestyle'->'languages' is null
           or exists (select 1 from jsonb_array_elements_text(me.prefs->'lifestyle'->'languages') l
                      where pr.data->'lifestyle'->'languages' ? l))))
    and (coalesce(tp.data->'prefs'->>'interestedIn', 'everyone') = 'everyone'
         or (tp.data->'prefs'->>'interestedIn' = 'women' and me.d->>'gender' = 'woman')
         or (tp.data->'prefs'->>'interestedIn' = 'men' and me.d->>'gender' = 'man'))
    and coalesce((me.d->>'age')::int, 0) between coalesce((tp.data->'prefs'->>'ageMin')::int, 18) and coalesce((tp.data->'prefs'->>'ageMax')::int, 99)
  order by pr.updated_at desc
  limit greatest(1, least(max_count, 30));
$$;
revoke all on function public.discover(int) from public, anon;
grant execute on function public.discover(int) to authenticated;

-- Second Tide (Plus): up to 3 more introductions after 10 PM India time, once a day.
-- The app passes the people already in today's Tide so they aren't repeated.
drop function if exists public.second_tide();
create or replace function public.second_tide(already uuid[] default '{}') returns setof public.profiles
language plpgsql security definer set search_path = public as $$
declare today text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
begin
  if not public.has_plus(auth.uid()) then raise exception 'Isle Plus needed'; end if;
  if extract(hour from now() at time zone 'Asia/Kolkata') < 22 then return; end if;
  if exists (select 1 from memberships where user_id = auth.uid() and second_tide_day = today) then return; end if;
  update memberships set second_tide_day = today where user_id = auth.uid();
  return query select d.* from public.discover(30) d where not (d.id = any(coalesce(already, '{}'))) limit 3;
end $$;
revoke all on function public.second_tide(uuid[]) from public, anon;
grant execute on function public.second_tide(uuid[]) to authenticated;

-- Funnel events used by v4
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'signup_completed','reaction_sent','match_created','first_message','date_confirmed','date_attended','feedback_given',
  'plus_started','seat_booked','bundle_bought','table_hosted','verified'
));

-- =====================================================================================
-- Pricing, orders, fulfilment, refunds and settlement.
-- Only the server (service role) can call these. Prices are decided here, never by the app.
-- =====================================================================================
create or replace function public.price_items(u uuid, items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb; lines jsonb := '[]'; total int := 0; price int; label text; extra jsonb;
  mem memberships%rowtype; plus boolean; month text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM');
  tb tables%rowtype; free_used boolean := false;
begin
  select * into mem from memberships where user_id = u;
  plus := found and mem.until > now();
  for it in select * from jsonb_array_elements(items) loop
    extra := '{}';
    case it->>'kind'
    when 'plus' then
      case it->>'plan'
        when 'intro' then
          if mem.user_id is not null then raise exception 'The ₹99 first month is for new members only.'; end if;
          price := 99; label := 'Isle Plus, first month';
        when 'monthly' then price := 199; label := 'Isle Plus, 1 month';
        when 'quarterly' then price := 499; label := 'Isle Plus, 3 months';
        else raise exception 'Unknown plan';
      end case;
    when 'seat' then
      select * into tb from tables where id = (it->>'tableId')::uuid;
      if not found or tb.status <> 'open' then raise exception 'This Table is no longer open.'; end if;
      if tb.price <= 0 then raise exception 'This Table is free to join.'; end if;
      label := 'Seat: ' || tb.title;
      if plus and tb.price <= 299 and not (month = any(mem.free_seat_months)) and not free_used then
        price := 0; free_used := true; extra := '{"freePlus":true}';
      else price := tb.price; end if;
    when 'bundle' then
      if not exists (select 1 from plans p join matches m on m.id = p.match_id where p.id = (it->>'planId')::uuid and u in (m.user_a, m.user_b)) then
        raise exception 'Date not found.'; end if;
      price := case when plus then 254 else 299 end; label := 'Coffee and dessert for two';
    when 'deposit' then
      if not exists (select 1 from plans p join matches m on m.id = p.match_id where p.id = (it->>'planId')::uuid and u in (m.user_a, m.user_b)) then
        raise exception 'Date not found.'; end if;
      price := 99; label := 'Show-up promise (refundable)';
    else raise exception 'Unknown item';
    end case;
    lines := lines || jsonb_build_array(jsonb_build_object('item', it, 'label', label, 'price', price) || extra);
    total := total + price;
  end loop;
  return jsonb_build_object('lines', lines, 'total', total, 'credit', public.credit_balance(u), 'plus', plus);
end $$;

create or replace function public.create_order(u uuid, items jsonb, use_credit boolean, provider_ text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q jsonb; total int; credit int; pid uuid; amount int;
begin
  q := public.price_items(u, items);
  total := (q->>'total')::int;
  -- deposits are never paid with credit: they must be refundable to the card
  credit := case when use_credit then least(greatest((q->>'credit')::int, 0),
            total - coalesce((select sum((l->>'price')::int) from jsonb_array_elements(q->'lines') l where l->'item'->>'kind' = 'deposit'), 0)) else 0 end;
  amount := total - credit;
  insert into payments (user_id, items, amount, credit_used, provider)
    values (u, q->'lines', amount, credit, case when amount = 0 then 'free' else provider_ end)
    returning id into pid;
  return jsonb_build_object('payment', pid, 'amount', amount, 'credit', credit, 'total', total, 'lines', q->'lines');
end $$;

create or replace function public.fulfil_payment(pid uuid, provider_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype; l jsonb; it jsonb; mem memberships%rowtype; days int; base timestamptz;
        month text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM');
begin
  select * into pay from payments where id = pid for update;
  if not found then raise exception 'payment not found'; end if;
  if pay.status = 'paid' then return jsonb_build_object('ok', true, 'already', true); end if;
  if pay.status <> 'pending' then raise exception 'payment is %', pay.status; end if;
  if pay.credit_used > 0 then
    if public.credit_balance(pay.user_id) < pay.credit_used then raise exception 'Not enough Isle credit.'; end if;
    insert into credits (user_id, amount, reason, ref) values (pay.user_id, -pay.credit_used, 'Used at checkout', pid);
  end if;
  for l in select * from jsonb_array_elements(pay.items) loop
    it := l->'item';
    case it->>'kind'
    when 'plus' then
      days := case it->>'plan' when 'quarterly' then 90 else 30 end;
      select * into mem from memberships where user_id = pay.user_id for update;
      base := greatest(coalesce(mem.until, now()), now());
      insert into memberships (user_id, plan, since, until, auto_renew, intro_used, last_payment)
        values (pay.user_id, it->>'plan', now(), now() + make_interval(days => days), true, it->>'plan' = 'intro', pid)
        on conflict (user_id) do update set plan = excluded.plan, until = base + make_interval(days => days),
          auto_renew = true, intro_used = memberships.intro_used or excluded.intro_used, last_payment = pid,
          since = case when memberships.until < now() then now() else memberships.since end;
    when 'seat' then
      perform public.seat_internal((it->>'tableId')::uuid, pay.user_id, (l->>'price')::int, coalesce((l->>'freePlus')::boolean, false), pid);
      if coalesce((l->>'freePlus')::boolean, false) then
        update memberships set free_seat_months = array_append(free_seat_months, month) where user_id = pay.user_id;
      end if;
    when 'bundle' then
      insert into bundles (plan_id, user_id, price, payment) values ((it->>'planId')::uuid, pay.user_id, (l->>'price')::int, pid)
        on conflict (plan_id, user_id) do update set price = excluded.price, payment = excluded.payment, status = 'paid';
    when 'deposit' then
      insert into deposits (plan_id, user_id, amount, payment) values ((it->>'planId')::uuid, pay.user_id, 99, pid)
        on conflict (plan_id, user_id) do update set payment = excluded.payment, status = 'held', settled_at = null;
    end case;
  end loop;
  update payments set status = 'paid', payment_id = provider_payment, paid_at = now() where id = pid;
  return jsonb_build_object('ok', true);
end $$;

-- Cancelling a seat: free seats any time; paid seats refunded if more than 24 hours before; a Plus seat comes back.
create or replace function public.cancel_seat(u uuid, t uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s table_seats%rowtype; tb tables%rowtype; refund int := 0; month text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM');
begin
  select * into s from table_seats where table_id = t and user_id = u and status = 'booked' for update;
  if not found then return jsonb_build_object('ok', true); end if;
  select * into tb from tables where id = t;
  update table_seats set status = 'cancelled' where table_id = t and user_id = u;
  if tb.status = 'cancelled' or tb.starts_at > now() + interval '24 hours' then
    refund := s.paid;
    if s.free_plus then update memberships set free_seat_months = array_remove(free_seat_months, month) where user_id = u; end if;
  end if;
  return jsonb_build_object('ok', true, 'refund', refund, 'payment', s.payment);
end $$;

-- When a host cancels a Table, everyone with a paid seat is refunded in full.
create or replace function public.cancel_table(u uuid, t uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb := '[]'; s record;
begin
  if not exists (select 1 from tables where id = t and (host = u or exists (select 1 from admins where user_id = u))) then raise exception 'not allowed'; end if;
  update tables set status = 'cancelled' where id = t;
  for s in select * from table_seats where table_id = t and status = 'booked' loop
    r := r || jsonb_build_array(public.cancel_seat(s.user_id, t));
  end loop;
  return r;
end $$;

-- Settling a date's show-up promise. Returns the refunds the server must send to the payment provider.
--   Both checked in            -> both deposits refunded in full
--   One checked in (6h later)   -> they get theirs back, plus the other deposit as Isle credit
--   Neither (6h later)          -> both refunded, minus ₹2 for the gateway fee
--   Date cancelled              -> everything refunded in full
--   Bundles are refunded unless you both turned up
create or replace function public.settle_date(p uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pl plans%rowtype; slot timestamptz; cancelled boolean; came uuid[]; d record; b record; out_ jsonb := '[]'; m matches%rowtype;
begin
  select * into pl from plans where id = p for update;
  if not found then return out_; end if;
  select * into m from matches where id = pl.match_id;
  slot := (pl.data->>'slot')::timestamptz;
  cancelled := pl.data->>'stage' = 'cancelled' or (m.status = 'ended' and now() < coalesce(slot, now()));
  select coalesce(array_agg(user_id), '{}') into came from checkins where plan_id = p;
  if not cancelled and array_length(came, 1) is distinct from 2 and (slot is null or now() < slot + interval '6 hours') then
    return out_; -- too early to settle
  end if;
  for d in select dp.*, py.payment_id as provider_id, py.provider from deposits dp left join payments py on py.id = dp.payment
           where dp.plan_id = p and dp.status = 'held' loop
    if cancelled or array_length(came, 1) = 2 or d.user_id = any(came) then
      update deposits set status = 'refunded', settled_at = now() where plan_id = p and user_id = d.user_id;
      out_ := out_ || jsonb_build_array(jsonb_build_object('user', d.user_id, 'payment', d.payment, 'provider_id', d.provider_id, 'provider', d.provider, 'amount', 99, 'why', 'deposit'));
    elsif array_length(came, 1) = 1 then
      update deposits set status = 'credited', settled_at = now() where plan_id = p and user_id = d.user_id;
      insert into credits (user_id, amount, reason, ref) values (came[1], 99, 'Show-up promise: your date didn''t come', p);
    else
      update deposits set status = 'refunded', settled_at = now() where plan_id = p and user_id = d.user_id;
      out_ := out_ || jsonb_build_array(jsonb_build_object('user', d.user_id, 'payment', d.payment, 'provider_id', d.provider_id, 'provider', d.provider, 'amount', 97, 'why', 'deposit'));
    end if;
  end loop;
  for b in select bu.*, py.payment_id as provider_id, py.provider from bundles bu left join payments py on py.id = bu.payment
           where bu.plan_id = p and bu.status = 'paid' loop
    if cancelled or coalesce(array_length(came, 1), 0) < 2 then
      update bundles set status = 'refunded' where plan_id = p and user_id = b.user_id;
      out_ := out_ || jsonb_build_array(jsonb_build_object('user', b.user_id, 'payment', b.payment, 'provider_id', b.provider_id, 'provider', b.provider, 'amount', b.price, 'why', 'bundle'));
    else
      update bundles set status = 'redeemed' where plan_id = p and user_id = b.user_id;
    end if;
  end loop;
  return out_;
end $$;

create or replace function public.mark_refunded(pid uuid, amount int) returns void
language sql security definer set search_path = public as $$
  update payments set status = case when amount >= payments.amount then 'refunded' else 'partly_refunded' end where id = pid;
$$;

do $$
declare f text;
begin
  foreach f in array array['price_items(uuid, jsonb)','create_order(uuid, jsonb, boolean, text)','fulfil_payment(uuid, text)',
    'cancel_seat(uuid, uuid)','cancel_table(uuid, uuid)','settle_date(uuid)','mark_refunded(uuid, int)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
