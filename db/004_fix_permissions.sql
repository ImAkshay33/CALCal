-- 004: Fix permissions for Supabase anon and authenticated roles.
-- Run in the Supabase SQL editor if getting "permission denied for table ..."

grant usage on schema public to anon, authenticated;

grant select on table foods to anon, authenticated;
grant select on table food_servings to anon, authenticated;

grant all on table food_logs to authenticated;
grant all on table user_foods to authenticated;
grant all on table user_goals to authenticated;
grant all on table profiles to authenticated, anon;
grant all on table favorites to authenticated;
grant all on table weight_logs to authenticated;
grant all on table water_logs to authenticated;

grant select, insert, update, delete on table recipes to authenticated;
grant select, insert, update, delete on table recipe_ingredients to authenticated;

grant execute on all functions in schema public to anon, authenticated;
