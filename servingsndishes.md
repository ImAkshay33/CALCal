-- 002: "1 dosa" style logging + dishes built from ingredients. Run AFTER schema.sql.

alter table foods     add column if not exists is_dish boolean not null default false;
alter table food_logs add column if not exists grams numeric;           -- resolved weight of the entry

create unique index if not exists food_servings_label_uq   on food_servings (food_id, label);
create unique index if not exists food_servings_one_default on food_servings (food_id) where is_default;

-- A dish is a normal row in `foods` (so search/logging work unchanged) whose nutrition is
-- computed from its ingredients. Nutrients are stored per 100 g of the COOKED dish, plus a
-- default serving such as "1 dosa" = cooked_yield_g / pieces grams.
create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
  food_id        uuid not null unique references foods(id) on delete cascade,
  cooked_yield_g numeric not null check (cooked_yield_g > 0),   -- total cooked weight of the whole recipe
  pieces         numeric not null default 1 check (pieces > 0), -- how many "units" it makes
  piece_label    text    not null default '1 serving'           -- e.g. '1 dosa', '1 roti', '1 katori'
);
create table if not exists recipe_ingredients (
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references foods(id),
  grams         numeric not null check (grams > 0),             -- raw weight used
  primary key (recipe_id, ingredient_id)
);
alter table recipes            enable row level security;
alter table recipe_ingredients enable row level security;
drop policy if exists "recipes readable"     on recipes;
drop policy if exists "recipe_ing readable"  on recipe_ingredients;
create policy "recipes readable"    on recipes            for select using (true);
create policy "recipe_ing readable" on recipe_ingredients for select using (true);

-- Recompute a dish's nutrition + default serving from its ingredients. Call after editing a recipe.
create or replace function rebuild_dish(p_food_id uuid) returns void language plpgsql as $$
declare r recipes%rowtype; t record; m jsonb;
begin
  select * into r from recipes where food_id = p_food_id;
  if not found then raise exception 'no recipe for food %', p_food_id; end if;

  select sum(f.energy_kcal * i.grams/100) kcal, sum(f.protein_g * i.grams/100) prot,
         sum(f.carbs_g * i.grams/100) carb,    sum(f.fat_g * i.grams/100) fat,
         sum(f.fiber_g * i.grams/100) fib,     sum(f.sugar_g * i.grams/100) sug
    into t
    from recipe_ingredients i join foods f on f.id = i.ingredient_id
   where i.recipe_id = r.id;

  -- a micro missing from some ingredient is simply not counted (underestimates, never invents)
  select coalesce(jsonb_object_agg(s.k, round(s.v, 4)), '{}'::jsonb) into m from (
    select kv.key as k, sum(kv.value::numeric * i.grams/100) as v
      from recipe_ingredients i
      join foods f on f.id = i.ingredient_id
      cross join lateral jsonb_each_text(f.micros) kv
     where i.recipe_id = r.id group by kv.key) s;

  update foods set is_dish = true,
         energy_kcal = round(t.kcal / r.cooked_yield_g * 100, 1),
         protein_g   = round(t.prot / r.cooked_yield_g * 100, 2),
         carbs_g     = round(t.carb / r.cooked_yield_g * 100, 2),
         fat_g       = round(t.fat  / r.cooked_yield_g * 100, 2),
         fiber_g     = round(t.fib  / r.cooked_yield_g * 100, 2),
         sugar_g     = round(t.sug  / r.cooked_yield_g * 100, 2),
         micros      = (select coalesce(jsonb_object_agg(kv.key, round(kv.value::numeric / r.cooked_yield_g * 100, 4)), '{}')
                          from jsonb_each_text(m) kv)
   where id = p_food_id;

  update food_servings set is_default = false where food_id = p_food_id and label <> r.piece_label;
  insert into food_servings (food_id, label, grams, is_default)
  values (p_food_id, r.piece_label, round(r.cooked_yield_g / r.pieces, 1), true)
  on conflict (food_id, label) do update set grams = excluded.grams, is_default = true;
end $$;

-- Log a food. p_serving_id => p_qty counts servings ("2 x 1 dosa"); null => p_qty is grams.
-- Stores a nutrient snapshot, so later edits to the food never change past logs.
create or replace function log_food(
  p_food_id uuid, p_qty numeric, p_serving_id uuid default null,
  p_meal text default null, p_date date default current_date
) returns food_logs language plpgsql as $$
declare f foods%rowtype; s food_servings%rowtype; g numeric; k numeric; lbl text; out_row food_logs;
begin
  select * into f from foods where id = p_food_id;
  if not found then raise exception 'unknown food %', p_food_id; end if;
  if p_serving_id is not null then
    select * into s from food_servings where id = p_serving_id and food_id = p_food_id;
    if not found then raise exception 'serving % does not belong to food %', p_serving_id, p_food_id; end if;
    g := p_qty * s.grams;  lbl := s.label;
  else
    g := p_qty;            lbl := 'g';
  end if;
  k := g / 100;
  insert into food_logs (log_date, meal, entry_type, food_id, label, quantity, serving_label, grams,
                         energy_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, micros)
  values (p_date, p_meal, 'food', f.id, f.name, p_qty, lbl, g,
          round(f.energy_kcal * k, 1), round(f.protein_g * k, 2), round(f.carbs_g * k, 2),
          round(f.fat_g * k, 2), round(f.fiber_g * k, 2), round(f.sugar_g * k, 2),
          (select coalesce(jsonb_object_agg(kv.key, round(kv.value::numeric * k, 4)), '{}'::jsonb)
             from jsonb_each_text(f.micros) kv))
  returning * into out_row;
  return out_row;
end $$;