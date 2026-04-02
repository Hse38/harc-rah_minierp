-- Allow muhasebe to read payment pipeline expenses.
-- This fixes E2E + real UI where Muhasebe list queries approved_koord/paid.

alter table public.expenses enable row level security;

drop policy if exists "muhasebe_select_payment_expenses" on public.expenses;
create policy "muhasebe_select_payment_expenses"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'muhasebe'
    )
    and status in ('approved_koord', 'paid')
  );

