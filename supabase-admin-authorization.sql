-- Canonical live admin authorization: authenticated, confirmed user + private allowlist.
create or replace function public.is_xv_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.xv_admins a
      on lower(trim(a.email)) = lower(trim(u.email))
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_xv_admin() from public;
grant execute on function public.is_xv_admin() to authenticated;
