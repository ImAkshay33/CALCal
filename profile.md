-- 003: usernames, profiles, per-user dishes, favorites, weight/water, progress queries.
-- Run AFTER schema.sql and 002. Supabase Auth needs an email, so the app signs users up with a
-- synthetic email  <username>@<AUTH_EMAIL_DOMAIN>  and keeps the real username in profiles.

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  display_name   text,
  sex            text check (sex in ('female','male','other')),
  birth_year     int  check (birth_year between 1900 and 2100),
  height_cm      numeric check (height_cm > 0),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal           text check (goal in ('lose','maintain','gain')),
  created_at     timestamptz not null default now()
);

-- On signup: create profile (username comes from signUp options.data.username) + default goals.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id, lower(new.raw_user_meta_data->>'username'), new.raw_user_meta_data->>'username');
  insert into user_goals (user_id, energy_kcal, protein_g, carbs_g, fat_g, fiber_g)
  values (new.id, 2000, 100, 250, 65, 30) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Is a username free? (callable before signup, returns only a boolean)
create or replace function username_available(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(u));
$$;
grant execute on function username_available(text) to anon, authenticated;

-- Per-user dishes: user_foods already holds per-serving nutrition; keep the recipe so it can be edited.
alter table user_foods add column if not exists recipe jsonb;   -- {ingredients:[{food_id,grams}], pieces, yield_g}

create table if not exists favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  food_id      uuid references foods(id) on delete cascade,
  user_food_id uuid references user_foods(id) on delete cascade,
  check ((food_id is not null)::int + (user_food_id is not null)::int = 1),
  unique (user_id, food_id), unique (user_id, user_food_id)
);
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null default current_date, weight_kg numeric not null check (weight_kg > 0),
  unique (user_id, log_date)
);
create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null default current_date, ml numeric not null check (ml >= 0),
  unique (user_id, log_date)
);

alter table profiles    enable row level security;
alter table favorites   enable row level security;
alter table weight_logs enable row level security;
alter table water_logs  enable row level security;
drop policy if exists "own profile"  on profiles;    create policy "own profile"  on profiles    for all using (id = auth.uid())      with check (id = auth.uid());
drop policy if exists "own favs"     on favorites;   create policy "own favs"     on favorites   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own weights"  on weight_logs; create policy "own weights"  on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own water"    on water_logs;  create policy "own water"    on water_logs  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Log a per-user food/dish. p_qty counts servings (user_foods values are per serving).
create or replace function log_user_food(p_user_food_id uuid, p_qty numeric, p_meal text default null, p_date date default current_date)
returns food_logs language plpgsql as $$
declare u user_foods%rowtype; out_row food_logs;
begin
  select * into u from user_foods where id = p_user_food_id and user_id = auth.uid();
  if not found then raise exception 'unknown custom food %', p_user_food_id; end if;
  insert into food_logs (log_date, meal, entry_type, user_food_id, label, quantity, serving_label, grams,
                         energy_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, micros)
  values (p_date, p_meal, 'user_food', u.id, u.name, p_qty, u.serving_label, p_qty * u.serving_g,
          round(u.energy_kcal * p_qty, 1), round(u.protein_g * p_qty, 2), round(u.carbs_g * p_qty, 2),
          round(u.fat_g * p_qty, 2), round(u.fiber_g * p_qty, 2), round(u.sugar_g * p_qty, 2),
          (select coalesce(jsonb_object_agg(kv.key, round(kv.value::numeric * p_qty, 4)), '{}'::jsonb)
             from jsonb_each_text(u.micros) kv))
  returning * into out_row;
  return out_row;
end $$;

-- Progress: one row per day in the range (zeros for days with no logs) so charts have no gaps.
create or replace function daily_summary(p_from date, p_to date)
returns table (log_date date, energy_kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric, entries bigint)
language sql stable as $$
  select d::date, coalesce(sum(l.energy_kcal),0), coalesce(sum(l.protein_g),0), coalesce(sum(l.carbs_g),0),
         coalesce(sum(l.fat_g),0), coalesce(sum(l.fiber_g),0), count(l.id)
  from generate_series(p_from, p_to, interval '1 day') d
  left join food_logs l on l.log_date = d::date and l.user_id = auth.uid()
  group by d order by d;
$$;

-- Micro totals per day and nutrient for the heatmap (divide by user_goals.micro_targets in the app).
create or replace function micro_by_day(p_from date, p_to date)
returns table (log_date date, micro text, total numeric)
language sql stable as $$
  select l.log_date, kv.key, sum(kv.value::numeric)
  from food_logs l cross join lateral jsonb_each_text(l.micros) kv
  where l.user_id = auth.uid() and l.log_date between p_from and p_to
  group by l.log_date, kv.key order by 1, 2;
$$;
