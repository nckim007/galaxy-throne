import { createClient } from '@supabase/supabase-js';

// .env 파일에 저장한 VITE_로 시작하는 변수들을 가져옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 값이 잘 불러와졌는지 확인 (에러 방지용)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase 설정이 누락되었습니다. .env 파일을 확인해주세요!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);