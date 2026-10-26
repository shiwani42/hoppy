-- Slice 7: body-stage progression (prd.md > The Avatar and Body Stages).
alter table public.profiles
  add column stage_changed_at date,
  add column start_weight_kg numeric check (start_weight_kg between 20 and 350);
