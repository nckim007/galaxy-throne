export const LEGEND_CATEGORIES = {
  "어설트": ["방갈로르", "레버넌트", "퓨즈", "매드 매기", "발리스틱"],
  "스커미셔": ["패스파인더", "레이스", "옥테인", "호라이즌", "애쉬", "알터"],
  "리콘": ["블러드하운드", "크립토", "발키리", "시어", "밴티지", "스패로우"],
  "서포트": ["지브롤터", "라이프 라인", "미라지", "로바", "뉴캐슬", "콘딧"],
  "컨트롤러": ["코스틱", "왓슨", "렘파트", "카탈리스트"]
};

export const getLegendCategoryColorHex = (cat: string) => {
  switch (cat) {
    case "어설트": return "#ff4d4d"; case "스커미셔": return "#ffcc00";
    case "리콘": return "#b14fff"; case "서포트": return "#00d2ff";
    case "컨트롤러": return "#3aff00"; default: return "#ffffff";
  }
};

export const WEAPON_CATEGORIES = {
  "에너지": ["RE-45 버스트", "하복 라이플", "네메시스 버스트 AR", "볼트 SMG", "L-STAR EMG", "디보션", "트리플 테이크"],
  "경량": ["p2020 x 1", "p2020 x 2", "R-301 카빈", "R-99 SMG", "얼터네이터 SMG", "M600 스핏파이어", "G7 스카우트"],
  "중량": ["VK-47 플랫라인", "햄록 버스트 AR", "프라울러 PDW", "C.A.R. SMG", "램페이지 LMG", "30-30 리피터"],
  "샷건 쉘": ["모잠비크 x 1", "모잠비크 x 2", "EVA-8 자동", "마스티프", "피스키퍼"],
  "스나이퍼": ["윙맨", "보섹 컴파운드 보우", "롱보우 DMR", "센티넬", "차지 라이플"],
  "특수 무기": ["투척 나이프", "크레이버 .50구경 저격총"]
};

export const ALL_LEGENDS = Object.values(LEGEND_CATEGORIES).flat();
export const ALL_WEAPONS = Object.values(WEAPON_CATEGORIES).flat();

export const getWeaponCategoryColorHex = (cat: string) => {
  switch (cat) {
    case "에너지": return "#94b11f"; case "경량": return "#ff8a00";   
    case "중량": return "#1e7e6e"; case "샷건 쉘": return "#da2115"; 
    case "스나이퍼": return "#4e4fb1"; case "특수 무기": return "#ffcc00"; 
    default: return "#ffffff";
  }
};


