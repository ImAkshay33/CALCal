-- 005: Add current_weight_kg and target_weight_kg to profiles, and ensure proper permissions
-- Run in the Supabase SQL editor

alter table profiles add column if not exists current_weight_kg numeric check (current_weight_kg > 0);
alter table profiles add column if not exists target_weight_kg numeric check (target_weight_kg > 0);

grant all on table profiles to authenticated;
grant all on table weight_logs to authenticated;
grant all on table water_logs to authenticated;
