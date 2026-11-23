-- CALCal schema for Supabase (Postgres). Run in the SQL editor.
create extension if not exists pg_trgm;

-- ───────── Global, verified food database (read-only for users) ─────────
create table foods (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,                -- 'ifct2017' | 'usda_foundation' | 'usda_sr_legacy' | 'off'
  source_code     text not null,
  name            text not null,
  scientific_name text,
  food_group      text,
  diet            text check (diet in ('veg','egg','nonveg')),
  -- all nutrient values are PER 100 g edible portion
  energy_kcal     numeric,
  protein_g       numeric,
  carbs_g         numeric,
  fat_g           numeric,
  fiber_g         numeric,
  sugar_g         numeric,
  micros          jsonb not null default '{}',  -- {"iron_mg": 4.1, ...}; a missing key = not measured
  local_names     jsonb not null default '{}',  -- {"Tam": ["Pasumpaal"], "H": ["Gai ka doodh"]}
  search_text     text not null,                -- lowercase name + aliases, for fuzzy search
  verified        boolean not null default false,
  notes           text,                         -- e.g. 'energy estimated from macros'
  created_at      timestamptz not null default now(),
  unique (source, source_code)
);
create index foods_search_trgm on foods using gin (search_text gin_trgm_ops);
create index foods_group_idx   on foods (food_group);

-- Household measures: "1 roti = 40 g", "1 katori = 150 g"
create table food_servings (
  id        uuid primary key default gen_random_uuid(),
  food_id   uuid not null references foods(id) on delete cascade,
  label     text not null,
  grams     numeric not null check (grams > 0),
  is_default boolean not null default false
);

-- ───────── Per-user foods / recipes ─────────
create table user_foods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  serving_label text not null default '1 serving',
  serving_g   numeric,
  -- values PER SERVING as the user entered them
  energy_kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric, sugar_g numeric,
  micros      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ───────── Food log (stores a nutrient SNAPSHOT so edits never rewrite history) ─────────
create table food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  logged_at   timestamptz not null default now(),
  log_date    date not null default current_date,
  meal        text check (meal in ('breakfast','lunch','dinner','snack')),
  entry_type  text not null check (entry_type in ('food','user_food','quick_add')),
  food_id      uuid references foods(id)      on delete set null,
  user_food_id uuid references user_foods(id) on delete set null,
  label       text not null,                  -- what the user sees
  quantity    numeric,                        -- grams or servings, per serving_label
  serving_label text,
  energy_kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric, sugar_g numeric,
  micros      jsonb not null default '{}',
  check ( (entry_type='food'      and food_id is not null)
       or (entry_type='user_food' and user_food_id is not null)
       or (entry_type='quick_add') )
);
create index food_logs_user_date on food_logs (user_id, log_date);

create table user_goals (
  user_id     uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  energy_kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric,
  micro_targets jsonb not null default '{}'   -- {"iron_mg": 18, "calcium_mg": 1000}
);

-- ───────── Row-level security ─────────
alter table foods         enable row level security;
alter table food_servings enable row level security;
alter table user_foods    enable row level security;
alter table food_logs     enable row level security;
alter table user_goals    enable row level security;

create policy "foods readable"    on foods         for select using (true);
create policy "servings readable" on food_servings for select using (true);
create policy "own user_foods" on user_foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own food_logs"  on food_logs  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goals"      on user_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── Fuzzy food search ─────────
create or replace function search_foods(q text, lim int default 20)
returns setof foods language sql stable
set pg_trgm.word_similarity_threshold = 0.4      -- tolerate typos like 'pinapple'
as $$
  select * from foods
  where search_text ilike '%' || lower(q) || '%' or lower(q) <% search_text
  order by (lower(name) = lower(q)) desc,                      -- exact name
           (lower(name) like lower(q) || '%') desc,            -- name starts with
           (lower(name) like '%' || lower(q) || '%') desc,     -- name contains
           word_similarity(lower(q), search_text) desc, name   -- aliases / fuzzy typos
  limit lim;
$$;

-- ───────── Daily totals (macros + every micro key, summed) ─────────
create or replace view daily_totals with (security_invoker = true) as
select user_id, log_date,
       sum(energy_kcal) as energy_kcal, sum(protein_g) as protein_g, sum(carbs_g) as carbs_g,
       sum(fat_g) as fat_g, sum(fiber_g) as fiber_g, sum(sugar_g) as sugar_g
from food_logs group by user_id, log_date;

create or replace function daily_micros(d date)
returns table(micro text, total numeric) language sql stable as $$
  select e.key, sum((e.value)::numeric)
  from food_logs l, jsonb_each_text(l.micros) e
  where l.user_id = auth.uid() and l.log_date = d
  group by e.key;
$$;