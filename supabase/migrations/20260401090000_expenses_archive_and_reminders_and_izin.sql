-- Soft delete (archive) + reminders + out-of-office (izin) fields

-- expenses: archive fields
alter table public.expenses
  add column if not exists archived_at timestamptz;

alter table public.expenses
  add column if not exists archived_by uuid references public.profiles(id);

alter table public.expenses
  add column if not exists previous_status text;

-- expenses: reminders
alter table public.expenses
  add column if not exists last_reminder_at timestamptz;

-- profiles: izin/tatil modu (bolge vekil)
alter table public.profiles
  add column if not exists izin_modu boolean not null default false;

alter table public.profiles
  add column if not exists izin_vekil_id uuid references public.profiles(id);

alter table public.profiles
  add column if not exists izin_baslangic timestamptz;

alter table public.profiles
  add column if not exists izin_bitis timestamptz;

-- Indexes (performance)
create index if not exists expenses_archived_at_idx on public.expenses (archived_at);
create index if not exists expenses_last_reminder_at_idx on public.expenses (last_reminder_at);
create index if not exists expenses_created_at_id_desc_idx on public.expenses (created_at desc, id desc);
create index if not exists expenses_fis_hash_idx on public.expenses (fis_hash);

create index if not exists notifications_recipient_is_read_created_at_idx
  on public.notifications (recipient_id, is_read, created_at desc);

