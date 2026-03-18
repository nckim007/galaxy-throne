-- SP 컬럼 호환 패치
-- 목적:
-- 1) 구버전 클라이언트가 season_sp / season_points를 써도 실패하지 않게 함
-- 2) 신버전 클라이언트가 sp를 써도 랭킹 값이 일관되게 유지되게 함

alter table public.profiles add column if not exists sp integer not null default 0;
alter table public.profiles add column if not exists season_sp integer;
alter table public.profiles add column if not exists season_points integer;

update public.profiles
set sp = coalesce(sp, season_sp, season_points, 0),
    season_sp = coalesce(season_sp, sp, season_points, 0),
    season_points = coalesce(season_points, sp, season_sp, 0);

create or replace function public.sync_profile_season_points()
returns trigger
language plpgsql
as $$
declare
  base integer;
begin
  if tg_op = 'INSERT' then
    base := coalesce(new.sp, new.season_sp, new.season_points, 0);
  else
    if new.sp is distinct from old.sp then
      base := new.sp;
    elsif new.season_sp is distinct from old.season_sp then
      base := new.season_sp;
    elsif new.season_points is distinct from old.season_points then
      base := new.season_points;
    else
      base := coalesce(new.sp, new.season_sp, new.season_points, old.sp, 0);
    end if;
  end if;

  base := greatest(0, coalesce(base, 0));
  new.sp := base;
  new.season_sp := base;
  new.season_points := base;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_season_points on public.profiles;
create trigger trg_sync_profile_season_points
before insert or update of sp, season_sp, season_points
on public.profiles
for each row
execute function public.sync_profile_season_points();
