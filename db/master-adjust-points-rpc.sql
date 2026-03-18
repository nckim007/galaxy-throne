-- Master point adjust RPC (idempotent)
-- Purpose:
-- 1) Avoid client-side column probing errors (schema cache / mixed columns)
-- 2) Ensure RP/SP/GC edits always affect ranking data consistently

create or replace function public.master_adjust_points(
  p_target uuid,
  p_resource text,
  p_delta integer
)
returns table(
  id uuid,
  rp integer,
  regular_rp integer,
  sp integer,
  season_sp integer,
  season_points integer,
  gc integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_master boolean := false;
  v_res text := lower(coalesce(p_resource, ''));
  v_old_regular int := 0;
  v_old_season int := 0;
  v_old_rp_offset int := 0;
  v_old_sp_offset int := 0;
  v_old_gc int := 0;
  v_new_total int := 0;
  v_has_season_points boolean := false;
  v_delta int := coalesce(p_delta, 0);
begin
  if p_target is null then
    raise exception 'target is required';
  end if;

  select coalesce(is_master, false)
    into v_is_master
  from public.profiles
  where id = v_actor;

  if not v_is_master then
    raise exception 'master only';
  end if;

  select
    coalesce(regular_rp, 0),
    coalesce(season_sp, 0),
    coalesce(rp, 0),
    coalesce(sp, 0),
    coalesce(gc, 1000)
  into
    v_old_regular,
    v_old_season,
    v_old_rp_offset,
    v_old_sp_offset,
    v_old_gc
  from public.profiles
  where id = p_target
  for update;

  if not found then
    raise exception 'target profile not found';
  end if;

  if v_res = 'rp' then
    v_new_total := greatest(0, v_old_regular + v_delta);
    update public.profiles
       set regular_rp = v_new_total,
           rp = greatest(0, v_old_rp_offset + (v_new_total - v_old_regular))
     where id = p_target;
  elsif v_res = 'sp' then
    v_new_total := greatest(0, v_old_season + v_delta);

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'season_points'
    )
    into v_has_season_points;

    if v_has_season_points then
      execute
        'update public.profiles
            set season_sp = $1,
                season_points = $1,
                sp = greatest(0, $2 + ($1 - $3))
          where id = $4'
      using v_new_total, v_old_sp_offset, v_old_season, p_target;
    else
      execute
        'update public.profiles
            set season_sp = $1,
                sp = greatest(0, $2 + ($1 - $3))
          where id = $4'
      using v_new_total, v_old_sp_offset, v_old_season, p_target;
    end if;
  elsif v_res in ('gp', 'gc') then
    update public.profiles
       set gc = greatest(0, v_old_gc + v_delta)
     where id = p_target;
  else
    raise exception 'invalid resource %', p_resource;
  end if;

  return query
  select
    p.id,
    coalesce(p.rp, 0) as rp,
    coalesce(p.regular_rp, 0) as regular_rp,
    coalesce(p.sp, 0) as sp,
    coalesce(p.season_sp, 0) as season_sp,
    coalesce(p.season_points, coalesce(p.season_sp, 0)) as season_points,
    coalesce(p.gc, 1000) as gc
  from public.profiles p
  where p.id = p_target;
end;
$$;

grant execute on function public.master_adjust_points(uuid, text, integer) to authenticated;
