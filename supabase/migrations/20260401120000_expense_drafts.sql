-- Expense drafts (taslak) - one per user

create extension if not exists pgcrypto;

create table if not exists public.expense_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  form_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_drafts_user_id_idx
  on public.expense_drafts (user_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_expense_drafts_set_updated_at on public.expense_drafts;
create trigger trg_expense_drafts_set_updated_at
before update on public.expense_drafts
for each row execute function public.set_updated_at();

alter table public.expense_drafts enable row level security;

drop policy if exists "expense_drafts_select_own" on public.expense_drafts;
create policy "expense_drafts_select_own"
  on public.expense_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "expense_drafts_insert_own" on public.expense_drafts;
create policy "expense_drafts_insert_own"
  on public.expense_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "expense_drafts_update_own" on public.expense_drafts;
create policy "expense_drafts_update_own"
  on public.expense_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expense_drafts_delete_own" on public.expense_drafts;
create policy "expense_drafts_delete_own"
  on public.expense_drafts
  for delete
  to authenticated
  using (auth.uid() = user_id);

