-- Master account hardening setup for galaxy-throne
-- Run this once in Supabase SQL Editor (role: postgres).

-- 1) Add master flag to profiles
alter table public.profiles
  add column if not exists is_master boolean not null default false;

comment on column public.profiles.is_master
  is 'Master/admin authority flag. true users can access master console.';

-- 2) Prevent authenticated users from self-escalating is_master
create or replace function public.prevent_profiles_master_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_master, false) is distinct from coalesce(old.is_master, false) then
    if auth.role() <> 'service_role' and current_user <> 'postgres' then
      raise exception 'is_master can only be changed by service role or postgres';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_master_escalation on public.profiles;
create trigger trg_profiles_master_escalation
before update on public.profiles
for each row
execute function public.prevent_profiles_master_escalation();

-- 3) Grant master to your account by email
update public.profiles p
set is_master = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('hdtop410@naver.com');

-- 4) Verify
select p.id, p.display_name, p.is_master, u.email
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('hdtop410@naver.com');

