-- Receipt system flags & hash for duplicate detection

alter table public.expenses
  add column if not exists manuel_giris boolean not null default false;

alter table public.expenses
  add column if not exists fis_hash text;

alter table public.expenses
  add column if not exists eski_fis boolean not null default false;

