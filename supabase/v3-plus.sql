-- Isle v3: Isle Plus, paid Tables seats and date bundles.
-- Run once in the Supabase SQL editor after schema.sql and v2-launch.sql. Safe to run again.
--
-- What changes:
--  * Funnel events: adds plus_started, seat_booked and bundle_bought.
--  * discover(): honours Incognito (Plus) and lifestyle filters (Plus).
--    Plus is read from the member's own private_details.plus.until (ms since epoch),
--    so an expired membership quietly stops filtering and stops hiding.
--  * Plus never ranks anyone higher or shows them to more people: ordering is unchanged.

-- ---------- Funnel events ----------
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'signup_completed','reaction_sent','match_created','first_message','date_confirmed','date_attended','feedback_given',
  'plus_started','seat_booked','bundle_bought'
));

-- ---------- Helpers ----------
create or replace function public.plus_active(pd jsonb) returns boolean
language sql immutable as $$
  select coalesce((pd->'plus'->>'until')::numeric, 0) > extract(epoch from now()) * 1000
$$;

-- A lifestyle filter passes when it's empty, or the person left that answer blank, or their answer is in the list.
create or replace function public.lifestyle_ok(wanted jsonb, value text) returns boolean
language sql immutable as $$
  select wanted is null or jsonb_typeof(wanted) <> 'array' or jsonb_array_length(wanted) = 0
         or value is null or exists (select 1 from jsonb_array_elements_text(wanted) w where w = value)
$$;

-- ---------- Today's introductions ----------
create or replace function public.discover(max_count int default 12) returns setof public.profiles
language sql stable security definer set search_path = public as $$
  with me as (
    select p.data as d, coalesce(pd.data->'prefs', '{}'::jsonb) as prefs, public.plus_active(coalesce(pd.data, '{}'::jsonb)) as plus
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
    -- Incognito (Plus): only shown to people they've already reacted to
    and (coalesce((pr.data->>'incognito')::boolean, false) = false
         or not public.plus_active(coalesce(tp.data, '{}'::jsonb))
         or exists (select 1 from reactions r where r.from_id = pr.id and r.to_id = auth.uid()))
    -- my preferences
    and (coalesce(me.prefs->>'interestedIn', 'everyone') = 'everyone'
         or (me.prefs->>'interestedIn' = 'women' and pr.data->>'gender' = 'woman')
         or (me.prefs->>'interestedIn' = 'men' and pr.data->>'gender' = 'man'))
    and coalesce((pr.data->>'age')::int, 0) between coalesce((me.prefs->>'ageMin')::int, 18) and coalesce((me.prefs->>'ageMax')::int, 99)
    and (me.prefs->'intents' is null or pr.data->>'intent' in (select jsonb_array_elements_text(me.prefs->'intents')))
    -- my lifestyle filters (Plus only); blank answers are never filtered out
    and (not me.plus or (
          public.lifestyle_ok(me.prefs->'lifestyle'->'diet', pr.data->'lifestyle'->>'diet')
      and public.lifestyle_ok(me.prefs->'lifestyle'->'drinks', pr.data->'lifestyle'->>'drinks')
      and public.lifestyle_ok(me.prefs->'lifestyle'->'smokes', pr.data->'lifestyle'->>'smokes')
      and (jsonb_array_length(coalesce(me.prefs->'lifestyle'->'languages', '[]'::jsonb)) = 0
           or pr.data->'lifestyle'->'languages' is null
           or exists (select 1 from jsonb_array_elements_text(me.prefs->'lifestyle'->'languages') l
                      where pr.data->'lifestyle'->'languages' ? l))))
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
