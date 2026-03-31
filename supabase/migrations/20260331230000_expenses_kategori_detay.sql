-- Category detail fields (dynamic extras) stored as JSONB

alter table public.expenses
  add column if not exists kategori_detay jsonb;

-- optional: keep it as an object when present
alter table public.expenses
  drop constraint if exists expenses_kategori_detay_is_object;

alter table public.expenses
  add constraint expenses_kategori_detay_is_object
  check (
    kategori_detay is null
    or jsonb_typeof(kategori_detay) = 'object'
  );

