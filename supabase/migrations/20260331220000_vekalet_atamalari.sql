-- Vekalet (deputyship) assignments for il/deneyap users

create extension if not exists pgcrypto;

create table if not exists public.vekalet_atamalari (
  id uuid primary key default gen_random_uuid(),
  vekil_user_id uuid not null references public.profiles(id) on delete cascade,
  asil_il text not null,
  bolge text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create unique index if not exists vekalet_atamalari_unique_vekil_il
  on public.vekalet_atamalari (vekil_user_id, asil_il);

create index if not exists vekalet_atamalari_vekil_user_id_idx
  on public.vekalet_atamalari (vekil_user_id);

alter table public.vekalet_atamalari enable row level security;

drop policy if exists "vekalet_select_own" on public.vekalet_atamalari;
create policy "vekalet_select_own"
  on public.vekalet_atamalari
  for select
  to authenticated
  using (auth.uid() = vekil_user_id);

drop policy if exists "vekalet_admin_all" on public.vekalet_atamalari;
create policy "vekalet_admin_all"
  on public.vekalet_atamalari
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

