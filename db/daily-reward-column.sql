-- Daily reward 중복 지급 방지용 컬럼 (기기/브라우저 무관 1일 1회)
alter table if exists public.profiles
  add column if not exists daily_reward_kst text;

comment on column public.profiles.daily_reward_kst is
  'KST 기준 일일 출석 보상 지급 키 (YYYY-MM-DD)';

