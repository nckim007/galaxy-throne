import React, { useEffect, useState, useRef } from 'react';
import { 
  Calendar, Users, Target, Swords, Zap, Crown, Activity, LogIn, LogOut, 
  Search, ChevronDown, ChevronUp, Copy, Check, Shield, RefreshCw, Flame, 
  Lock, Unlock, BarChart3, TrendingUp, X, Trophy, PieChart, Home, User, 
  Settings, Bell, Star, ShoppingBag, Palette
} from 'lucide-react';
import { supabase } from './supabase';

// @ts-ignore
import bgImage from './assets/bg.png'; 
import { ALL_LEGENDS, ALL_WEAPONS, LEGEND_CATEGORIES, WEAPON_CATEGORIES, getLegendCategoryColorHex, getWeaponCategoryColorHex } from './config/gameMeta';
import { getAvatarFallback, getResponsiveNameClass } from './utils/profile';
import { applyAudioSettings, playSFX, setMatchPhaseAudio } from './lib/audioManager';
const MENU_ITEMS = [
  { id: 'home', icon: Home, label: '대시보드' },
  { id: 'profile', icon: User, label: '내 정보' },
  { id: 'shop', icon: ShoppingBag, label: '상점' },
  { id: 'ranking', icon: Trophy, label: '명예의 전당' },
  { id: 'settings', icon: Settings, label: '환경 설정' }
];

type CosmeticCategory = 'nameColor' | 'nameStyle' | 'borderFx';
type ShopItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  cost: number;
  preview: string;
  accentClass: string;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: 'name_default', category: 'nameColor', name: '기본 화이트', description: '클래식 화이트 닉네임', cost: 0, preview: 'A', accentClass: 'text-white' },
  { id: 'name_cyan', category: 'nameColor', name: '네온 시안', description: '시원한 시안 계열 닉네임', cost: 1500, preview: 'A', accentClass: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]' },
  { id: 'name_magenta', category: 'nameColor', name: '마젠타 펄스', description: '강렬한 마젠타 계열 닉네임', cost: 1500, preview: 'A', accentClass: 'text-fuchsia-300 drop-shadow-[0_0_10px_rgba(232,121,249,0.65)]' },
  { id: 'name_gold', category: 'nameColor', name: '솔라 골드', description: '왕좌 느낌 골드 닉네임', cost: 1500, preview: 'A', accentClass: 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)]' },
  { id: 'name_emerald', category: 'nameColor', name: '에메랄드 노바', description: '선명한 에메랄드 닉네임', cost: 1500, preview: 'A', accentClass: 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]' },
  { id: 'name_royal', category: 'nameColor', name: '로열 바이올렛', description: '보랏빛 고급 닉네임', cost: 1500, preview: 'A', accentClass: 'text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.65)]' },

  { id: 'style_default', category: 'nameStyle', name: '기본 폰트', description: '기본 전투 UI 폰트', cost: 0, preview: 'Aa', accentClass: 'text-white' },
  { id: 'style_orbit', category: 'nameStyle', name: '오비트 폰트', description: 'SF 느낌의 하이테크 폰트', cost: 3500, preview: 'Aa', accentClass: 'text-cyan-300' },
  { id: 'style_rajdhani', category: 'nameStyle', name: '블레이드 폰트', description: '날렵한 전투형 폰트', cost: 3500, preview: 'Aa', accentClass: 'text-fuchsia-300' },
  { id: 'style_exo', category: 'nameStyle', name: '엑소 코어 폰트', description: '미래형 커맨드 폰트', cost: 3500, preview: 'Aa', accentClass: 'text-yellow-300' },
  { id: 'style_dohyeon', category: 'nameStyle', name: '도현 전장체', description: '굵고 강한 전투형 한글 폰트', cost: 3500, preview: 'Aa', accentClass: 'text-emerald-300' },
  { id: 'style_jua', category: 'nameStyle', name: '쥬아 네온체', description: '부드럽고 선명한 네온 한글 폰트', cost: 3500, preview: 'Aa', accentClass: 'text-sky-300' },

  { id: 'border_default', category: 'borderFx', name: '기본 링', description: '기본 아바타 테두리', cost: 0, preview: '◎', accentClass: 'text-slate-300' },
  { id: 'border_cyan', category: 'borderFx', name: '시안 플럭스', description: '네온 시안 테두리 효과', cost: 2200, preview: '◎', accentClass: 'text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]' },
  { id: 'border_violet', category: 'borderFx', name: '바이올렛 코어', description: '우주풍 바이올렛 글로우', cost: 2200, preview: '◎', accentClass: 'text-violet-300 drop-shadow-[0_0_12px_rgba(167,139,250,0.7)]' },
  { id: 'border_solar', category: 'borderFx', name: '솔라 크라운', description: '황금빛 왕좌 테두리', cost: 2200, preview: '◎', accentClass: 'text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.75)]' },
  { id: 'border_crimson', category: 'borderFx', name: '크림슨 블레이즈', description: '강렬한 붉은 플레어', cost: 2200, preview: '◎', accentClass: 'text-red-300 drop-shadow-[0_0_13px_rgba(248,113,113,0.75)]' },
  { id: 'border_aurora', category: 'borderFx', name: '오로라 프리즘', description: '다색 오로라 테두리', cost: 4200, preview: '◎', accentClass: 'text-cyan-200 drop-shadow-[0_0_16px_rgba(34,211,238,0.8)]' },
  { id: 'border_plasma', category: 'borderFx', name: '플라즈마 라인', description: '전기 플라즈마 이펙트', cost: 4200, preview: '◎', accentClass: 'text-indigo-200 drop-shadow-[0_0_16px_rgba(129,140,248,0.8)]' },
  { id: 'border_void', category: 'borderFx', name: '보이드 섀도우', description: '암흑 성운 테두리', cost: 4200, preview: '◎', accentClass: 'text-slate-200 drop-shadow-[0_0_16px_rgba(148,163,184,0.75)]' },
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('home');
  
  const [entryMode, setEntryMode] = useState<'free' | 'random'>('free');
  const [entryOpponent, setEntryOpponent] = useState('');
  const [entryLegend, setEntryLegend] = useState('');
  const [entryWeapons, setEntryWeapons] = useState<string[]>(['', '']);
  const [betAmount, setBetAmount] = useState<number>(100); 
  const [rerollCount, setRerollCount] = useState<number>(0); 

  const [matchPhase, setMatchPhase] = useState<'idle' | 'setup_mode' | 'waiting_sync' | 'picking' | 'waiting_ready' | 'scoring'>('idle');
  const [activeMatch, setActiveMatch] = useState<{ id: string, mode: string, opponent: string, legend: string, weapons: string[], oppLegend?: string, oppWeapons?: string[], isChallenger: boolean } | null>(null);
  
  const [myWins, setMyWins] = useState<number | null>(null);
  const [myLosses, setMyLosses] = useState<number | null>(null);
  const [waitingForScore, setWaitingForScore] = useState(false);
  const [homeRankingHeight, setHomeRankingHeight] = useState<number | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]); 
  const [rankers, setRankers] = useState<any[]>([]); 
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [discordOnlineUsers, setDiscordOnlineUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'details'>('overview');
  const [myProfileTab, setMyProfileTab] = useState<'overview' | 'items'>('overview');
  const [copyStatus, setCopyStatus] = useState(false);
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(['name_default', 'style_default', 'border_default']);
  const [equippedItems, setEquippedItems] = useState<{ nameColor: string; nameStyle: string; borderFx: string }>({
    nameColor: 'name_default',
    nameStyle: 'style_default',
    borderFx: 'border_default',
  });
  
  const [miniRankMode, setMiniRankMode] = useState<'free' | 'random'>('free');
  const [mainRankTab, setMainRankTab] = useState<'free' | 'random'>('free');

  const [bgmEnabled, setBgmEnabled] = useState(localStorage.getItem('bgmEnabled') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('sfxEnabled') !== 'false');
  const [bgmVolume, setBgmVolume] = useState(parseFloat(localStorage.getItem('bgmVolume') || '0.10'));
  const [sfxVolume, setSfxVolume] = useState(parseFloat(localStorage.getItem('sfxVolume') || '0.60'));

  const currentUserName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const currentUserAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
  const DISCORD_GUILD_ID = (import.meta.env.VITE_DISCORD_GUILD_ID as string | undefined)?.trim();
  const calculateRegularPoints = (wins?: number, losses?: number) =>
    Math.max(0, 1000 + (wins || 0) * 30 - (losses || 0) * 20);
  const cosmeticsStorageKey = user?.id ? `gt_cosmetics_v1_${user.id}` : null;
  const defaultOwnedIds = ['name_default', 'style_default', 'border_default'];
  const isCurrentUserDisplayName = (name?: string | null) => (name || '').trim() === (currentUserName || '').trim();

  const nameColorClassMap: Record<string, string> = {
    name_default: 'text-white',
    name_cyan: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    name_magenta: 'text-fuchsia-300 drop-shadow-[0_0_10px_rgba(232,121,249,0.65)]',
    name_gold: 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)]',
    name_emerald: 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]',
    name_royal: 'text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.65)]',
  };
  const nameStyleClassMap: Record<string, string> = {
    style_default: '',
    style_orbit: 'name-style-orbit',
    style_rajdhani: 'name-style-rajdhani',
    style_exo: 'name-style-exo',
    style_dohyeon: 'name-style-dohyeon',
    style_jua: 'name-style-jua',
  };
  const borderFxClassMap: Record<string, string> = {
    border_default: 'border-white/20 shadow-none',
    border_cyan: 'border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]',
    border_violet: 'border-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.55)]',
    border_solar: 'border-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.65)]',
    border_crimson: 'border-red-300 shadow-[0_0_16px_rgba(248,113,113,0.62)]',
    border_aurora: 'border-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.68)]',
    border_plasma: 'border-indigo-300 shadow-[0_0_18px_rgba(129,140,248,0.68)]',
    border_void: 'border-slate-300 shadow-[0_0_18px_rgba(148,163,184,0.58)]',
  };
  const rankCardFxByTier = (idx: number) => {
    if (idx === 0) return 'border border-yellow-300/85 shadow-[0_0_32px_rgba(250,204,21,0.3)] bg-[linear-gradient(140deg,rgba(250,204,21,0.09),rgba(0,0,0,0.58)_45%,rgba(0,0,0,0.8))]';
    if (idx < 4) return 'border border-violet-300/80 shadow-[0_0_26px_rgba(167,139,250,0.28)] bg-[linear-gradient(140deg,rgba(167,139,250,0.08),rgba(0,0,0,0.58)_45%,rgba(0,0,0,0.8))]';
    if (idx < 9) return 'border border-cyan-300/75 shadow-[0_0_22px_rgba(34,211,238,0.25)] bg-[linear-gradient(140deg,rgba(34,211,238,0.08),rgba(0,0,0,0.58)_45%,rgba(0,0,0,0.8))]';
    if (idx < 16) return 'border border-emerald-300/70 shadow-[0_0_20px_rgba(110,231,183,0.22)] bg-[linear-gradient(140deg,rgba(110,231,183,0.07),rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.82))]';
    if (idx < 25) return 'border border-amber-300/70 shadow-[0_0_18px_rgba(252,211,77,0.2)] bg-[linear-gradient(140deg,rgba(252,211,77,0.07),rgba(0,0,0,0.62)_45%,rgba(0,0,0,0.82))]';
    return 'border border-slate-300/50 shadow-[0_0_16px_rgba(148,163,184,0.16)] bg-[linear-gradient(140deg,rgba(148,163,184,0.06),rgba(0,0,0,0.64)_45%,rgba(0,0,0,0.84))]';
  };
  const seasonCardFxByTier = (idx: number) => {
    if (idx === 0) return 'border border-yellow-300/80 shadow-[0_0_30px_rgba(250,204,21,0.28)] bg-[linear-gradient(140deg,rgba(250,204,21,0.08),rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.84))]';
    if (idx < 6) return 'border border-fuchsia-300/75 shadow-[0_0_24px_rgba(232,121,249,0.25)] bg-[linear-gradient(140deg,rgba(232,121,249,0.08),rgba(0,0,0,0.62)_45%,rgba(0,0,0,0.84))]';
    if (idx < 12) return 'border border-cyan-300/72 shadow-[0_0_21px_rgba(34,211,238,0.23)] bg-[linear-gradient(140deg,rgba(34,211,238,0.08),rgba(0,0,0,0.62)_45%,rgba(0,0,0,0.84))]';
    if (idx < 20) return 'border border-sky-300/68 shadow-[0_0_18px_rgba(125,211,252,0.2)] bg-[linear-gradient(140deg,rgba(125,211,252,0.07),rgba(0,0,0,0.62)_45%,rgba(0,0,0,0.84))]';
    return 'border border-indigo-300/62 shadow-[0_0_16px_rgba(165,180,252,0.18)] bg-[linear-gradient(140deg,rgba(165,180,252,0.07),rgba(0,0,0,0.62)_45%,rgba(0,0,0,0.84))]';
  };

  const equippedNameColorClass = nameColorClassMap[equippedItems.nameColor] || nameColorClassMap.name_default;
  const equippedNameStyleClass = nameStyleClassMap[equippedItems.nameStyle] || nameStyleClassMap.style_default;
  const equippedNameClass = `${equippedNameColorClass} ${equippedNameStyleClass}`.trim();
  const equippedBorderFxClass = borderFxClassMap[equippedItems.borderFx] || borderFxClassMap.border_default;
  const normalizePlayerName = (value?: string | null) => (value || '').trim().toLowerCase();
  const getCosmeticStateForUser = (name?: string | null) => {
    if (isCurrentUserDisplayName(name)) {
      return equippedItems;
    }
    const found = rankers.find((r) => normalizePlayerName(r.display_name) === normalizePlayerName(name));
    if (!found) {
      return { nameColor: 'name_default', nameStyle: 'style_default', borderFx: 'border_default' };
    }
    return {
      nameColor: found.equipped_name_color || 'name_default',
      nameStyle: found.equipped_name_style || 'style_default',
      borderFx: found.equipped_border_fx || 'border_default',
    };
  };
  const getNameClassForUser = (name?: string | null) => {
    const cosmetic = getCosmeticStateForUser(name);
    const colorClass = nameColorClassMap[cosmetic.nameColor] || nameColorClassMap.name_default;
    const styleClass = nameStyleClassMap[cosmetic.nameStyle] || '';
    return `${colorClass} ${styleClass}`.trim();
  };
  const getAvatarBorderFxForUser = (name?: string | null) => {
    const cosmetic = getCosmeticStateForUser(name);
    return borderFxClassMap[cosmetic.borderFx] || borderFxClassMap.border_default;
  };

  const isOwnedItem = (itemId: string) => defaultOwnedIds.includes(itemId) || ownedItemIds.includes(itemId);

  const activeMatchRef = useRef(activeMatch);
  const matchPhaseRef = useRef(matchPhase);
  const waitingForScoreRef = useRef(waitingForScore);
  const recentLogsBoardRef = useRef<HTMLDivElement | null>(null);
  const rankingBoardRef = useRef<HTMLDivElement | null>(null);
  const cosmeticSyncWarnedRef = useRef(false);

  useEffect(() => { activeMatchRef.current = activeMatch; }, [activeMatch]);
  useEffect(() => { matchPhaseRef.current = matchPhase; }, [matchPhase]);
  useEffect(() => { waitingForScoreRef.current = waitingForScore; }, [waitingForScore]);

  useEffect(() => {
    localStorage.setItem('bgmEnabled', bgmEnabled.toString());
    localStorage.setItem('sfxEnabled', sfxEnabled.toString());
    localStorage.setItem('bgmVolume', bgmVolume.toString());
    localStorage.setItem('sfxVolume', sfxVolume.toString());

    applyAudioSettings({ bgmEnabled, sfxEnabled, bgmVolume, sfxVolume });
  }, [bgmEnabled, sfxEnabled, bgmVolume, sfxVolume]);

  useEffect(() => {
    setMatchPhaseAudio(matchPhase);
  }, [matchPhase]);

  const checkActiveChallenge = async (username: string) => {
    if (!username) return;
    const { data: cData } = await supabase.from('challenges').select('*').eq('challenger_name', username).maybeSingle();
    const { data: tData } = await supabase.from('challenges').select('*').eq('target_name', username).maybeSingle();
    const data = cData || tData;

    if (data) {
      const isC = data.challenger_name === username;
      const opp = isC ? data.target_name : data.challenger_name;
      const amIReady = isC ? data.c_ready : data.t_ready;
      
      let localLegend = isC ? (data.legend || '') : (data.t_legend || '');
      let localWeapons = isC ? (data.weapons || ['', '']) : (data.t_weapons || ['', '']);

      if (data.mode.includes('random') && data.mode.includes('_accepted') && !amIReady && (!localLegend || localLegend === '')) {
          localLegend = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
          localWeapons = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
          setEntryLegend(localLegend); setEntryWeapons(localWeapons);
      } else {
          setEntryLegend(localLegend); setEntryWeapons(localWeapons);
      }

      setActiveMatch({ id: data.id, mode: data.mode, opponent: opp, legend: localLegend, weapons: localWeapons, oppLegend: isC ? data.t_legend : data.legend, oppWeapons: isC ? data.t_weapons : data.weapons, isChallenger: isC });
      setEntryOpponent(opp); setEntryMode(data.mode.replace('_accepted', '') as 'free' | 'random'); setBetAmount(data.bet_gc || 0);

      if (data.c_ready && data.t_ready) { setMatchPhase('scoring'); } 
      else if (data.mode.includes('_accepted')) { setMatchPhase(amIReady ? 'waiting_ready' : 'picking'); } 
      else { setMatchPhase(isC ? 'waiting_sync' : 'setup_mode'); }
    } else {
      if (matchPhaseRef.current !== 'idle') { setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false); }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    fetchData(); fetchRankers(); return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cosmeticsStorageKey) {
      setOwnedItemIds([...defaultOwnedIds]);
      setEquippedItems({ nameColor: 'name_default', nameStyle: 'style_default', borderFx: 'border_default' });
      return;
    }

    try {
      const raw = localStorage.getItem(cosmeticsStorageKey);
      if (!raw) {
        setOwnedItemIds([...defaultOwnedIds]);
        setEquippedItems({ nameColor: 'name_default', nameStyle: 'style_default', borderFx: 'border_default' });
        return;
      }

      const parsed = JSON.parse(raw) as { owned?: string[]; equipped?: { nameColor?: string; nameStyle?: string; borderFx?: string } };
      const mergedOwned = Array.from(new Set([...(parsed.owned || []), ...defaultOwnedIds]));
      setOwnedItemIds(mergedOwned);
      setEquippedItems({
        nameColor: parsed.equipped?.nameColor || 'name_default',
        nameStyle: parsed.equipped?.nameStyle || 'style_default',
        borderFx: parsed.equipped?.borderFx || 'border_default',
      });
    } catch {
      setOwnedItemIds([...defaultOwnedIds]);
      setEquippedItems({ nameColor: 'name_default', nameStyle: 'style_default', borderFx: 'border_default' });
    }
  }, [cosmeticsStorageKey]);

  useEffect(() => {
    if (!cosmeticsStorageKey) return;
    localStorage.setItem(
      cosmeticsStorageKey,
      JSON.stringify({
        owned: Array.from(new Set([...ownedItemIds, ...defaultOwnedIds])),
        equipped: equippedItems,
      })
    );
  }, [cosmeticsStorageKey, ownedItemIds, equippedItems]);

  useEffect(() => {
    if (!profile) return;

    const dbOwned = Array.isArray((profile as any).owned_cosmetics) ? (profile as any).owned_cosmetics : [];
    const mergedOwned = Array.from(new Set([...dbOwned, ...defaultOwnedIds]));
    setOwnedItemIds(mergedOwned);
    setEquippedItems({
      nameColor: (profile as any).equipped_name_color || 'name_default',
      nameStyle: (profile as any).equipped_name_style || 'style_default',
      borderFx: (profile as any).equipped_border_fx || 'border_default',
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!user || !profile) return;
    const timer = window.setTimeout(async () => {
      const payload = {
        owned_cosmetics: Array.from(new Set([...ownedItemIds, ...defaultOwnedIds])),
        equipped_name_color: equippedItems.nameColor,
        equipped_name_style: equippedItems.nameStyle,
        equipped_border_fx: equippedItems.borderFx,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error && !cosmeticSyncWarnedRef.current) {
        cosmeticSyncWarnedRef.current = true;
        console.warn('[cosmetics-sync] profiles 컬럼이 없거나 권한 문제로 동기화 실패:', error.message);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [user?.id, profile?.id, ownedItemIds, equippedItems]);

  useEffect(() => { if (currentUserName) { checkActiveChallenge(currentUserName); } }, [currentUserName]);

  useEffect(() => {
    if (!DISCORD_GUILD_ID) {
      setDiscordOnlineUsers(new Set());
      return;
    }

    let isMounted = true;

    const fetchDiscordPresence = async () => {
      try {
        const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Discord widget fetch failed: ${res.status}`);

        const data = await res.json();
        const members = Array.isArray(data?.members) ? data.members : [];
        const nextUsers = new Set<string>();

        members.forEach((member: any) => {
          [member?.username, member?.global_name, member?.nick, member?.display_name].forEach((candidate) => {
            if (typeof candidate === 'string' && candidate.trim()) {
              nextUsers.add(candidate.trim().toLowerCase());
            }
          });
        });

        if (isMounted) setDiscordOnlineUsers(nextUsers);
      } catch {
        if (isMounted) setDiscordOnlineUsers(new Set());
      }
    };

    fetchDiscordPresence();
    const timer = window.setInterval(fetchDiscordPresence, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      setDiscordOnlineUsers(new Set());
    };
  }, [DISCORD_GUILD_ID]);

  useEffect(() => {
    if (!currentUserName?.trim()) {
      setOnlineUsers(new Set());
      return;
    }

    const normalizedSelf = currentUserName.trim();
    const onlineChannel = supabase.channel('online_presence_board', {
      config: { presence: { key: normalizedSelf } },
    });

    const syncOnlineUsers = () => {
      const state = onlineChannel.presenceState() as Record<string, any[]>;
      const nextOnlineUsers = new Set<string>();

      Object.values(state).forEach((entries) => {
        entries?.forEach((entry: any) => {
          const trackedName =
            (typeof entry?.name === 'string' && entry.name.trim()) ||
            (typeof entry?.display_name === 'string' && entry.display_name.trim()) ||
            '';

          if (trackedName) nextOnlineUsers.add(trackedName);
        });
      });

      nextOnlineUsers.add(normalizedSelf);
      setOnlineUsers(nextOnlineUsers);
    };

    onlineChannel
      .on('presence', { event: 'sync' }, syncOnlineUsers)
      .on('presence', { event: 'join' }, syncOnlineUsers)
      .on('presence', { event: 'leave' }, syncOnlineUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await onlineChannel.track({
            name: normalizedSelf,
            joined_at: new Date().toISOString(),
          });
          syncOnlineUsers();
        }
      });

    return () => {
      onlineChannel.untrack();
      supabase.removeChannel(onlineChannel);
      setOnlineUsers(new Set());
    };
  }, [currentUserName]);

  useEffect(() => {
    const updateHomeRankingHeight = () => {
      if (window.innerWidth < 1280) {
        setHomeRankingHeight(null);
        return;
      }

      const logsEl = recentLogsBoardRef.current;
      const rankEl = rankingBoardRef.current;
      if (!logsEl || !rankEl) return;

      const logsRect = logsEl.getBoundingClientRect();
      const rankRect = rankEl.getBoundingClientRect();
      const desiredHeight = Math.round(logsRect.bottom - rankRect.top);
      if (desiredHeight > 320) {
        setHomeRankingHeight((prev) => (prev === desiredHeight ? prev : desiredHeight));
      } else {
        setHomeRankingHeight(null);
      }
    };

    if (activeMenu === 'home') {
      const raf = window.requestAnimationFrame(updateHomeRankingHeight);
      const resizeObserver = new ResizeObserver(() => updateHomeRankingHeight());
      if (recentLogsBoardRef.current) resizeObserver.observe(recentLogsBoardRef.current);
      if (rankingBoardRef.current) resizeObserver.observe(rankingBoardRef.current);
      window.addEventListener('resize', updateHomeRankingHeight);

      return () => {
        window.cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateHomeRankingHeight);
      };
    }

    setHomeRankingHeight(null);
    return;
  }, [activeMenu, matchPhase, logs.length, rankers.length, miniRankMode, searchQuery]);

  useEffect(() => {
    const matchLogChannel = supabase.channel('matches_realtime_sync').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, payload => { fetchData(); fetchRankers(); }).subscribe();
    return () => { supabase.removeChannel(matchLogChannel); };
  }, []);

  useEffect(() => {
    if (!currentUserName) return;
    const channel = supabase.channel('unified_challenge_sync_' + currentUserName.replace(/[^a-zA-Z0-9]/g, ''))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, payload => {
           const currentMatch = activeMatchRef.current; const currentPhase = matchPhaseRef.current; const isWaiting = waitingForScoreRef.current;
           if (payload.eventType === 'INSERT') {
              const newChallenge = payload.new;
              if (newChallenge.target_name.trim() === currentUserName.trim()) {
                 playSFX('matchStart'); setEntryOpponent(newChallenge.challenger_name); setEntryMode(newChallenge.mode.replace('_accepted', '') as 'free' | 'random'); setBetAmount(newChallenge.bet_gc || 0); setMatchPhase('setup_mode');
              }
           }
           if (payload.eventType === 'UPDATE') {
               const updated = payload.new;
               if (currentMatch && updated.id === currentMatch.id) {
                   if (currentPhase === 'waiting_sync' && updated.mode.includes('_accepted')) {
                       playSFX('matchStart'); setMatchPhase('picking'); if (updated.mode.includes('random')) handleModeChange('random');
                   }
                   if ((currentPhase === 'picking' || currentPhase === 'waiting_ready') && updated.c_ready && updated.t_ready) {
                       playSFX('success'); setActiveMatch(prev => prev ? { ...prev, oppLegend: prev.isChallenger ? updated.t_legend : updated.legend, oppWeapons: prev.isChallenger ? updated.t_weapons : updated.weapons } : prev); setMatchPhase('scoring');
                   }
                   if (updated.c_win === null && updated.t_win === null && isWaiting) {
                       playSFX('error'); alert("상대방과 입력한 스코어가 일치하지 않아 초기화되었습니다.\n다시 합의 후 정확히 입력해주세요!"); setWaitingForScore(false); setMyWins(null); setMyLosses(null);
                   }
               }
               checkActiveChallenge(currentUserName);
           }
           if (payload.eventType === 'DELETE') {
               const deletedRow = payload.old;
               if (currentMatch && deletedRow.id === currentMatch.id) {
                   if (currentPhase === 'scoring' || isWaiting) {
                       playSFX('success'); alert("전투 결과 및 랭크가 성공적으로 업데이트 되었습니다."); setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false); setMyWins(null); setMyLosses(null); setEntryOpponent(''); setEntryLegend(''); setEntryWeapons(['', '']); fetchData(); fetchRankers(); if(user) fetchProfile(user.id);
                   } else if (currentPhase !== 'idle') {
                       playSFX('click'); alert("매치가 취소되었거나 정상적으로 종료되었습니다."); setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false);
                   }
               }
           }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserName]); 

  const fetchData = async () => {
    const { data: matches } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (matches) setLogs([...matches]);
  };

  const fetchRankers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (profiles) {
      const processed = profiles.map((r, i) => ({
        ...r, rankIndex: i, display_name: r.display_name || 'GUEST', wins: r.wins || 0, losses: r.losses || 0,
        win_rate: (r.wins + r.losses) > 0 ? (((r.wins) / (r.wins + r.losses)) * 100).toFixed(1) + '%' : '0.0%',
        avatar_url: r.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        defense_stack: r.defense_stack || 0,
        rp: r.rp || 1000,
        regular_rp:
          typeof r.regular_rp === 'number'
            ? r.regular_rp
            : calculateRegularPoints(r.wins || 0, r.losses || 0),
        gc: r.gc || 0,
        win_streak: r.win_streak || 0,
        owned_cosmetics: Array.isArray(r.owned_cosmetics) ? r.owned_cosmetics : [...defaultOwnedIds],
        equipped_name_color: r.equipped_name_color || 'name_default',
        equipped_name_style: r.equipped_name_style || 'style_default',
        equipped_border_fx: r.equipped_border_fx || 'border_default',
      }));
      setRankers(processed);
    }
  };

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
  };

  const handleLogin = async () => { playSFX('click'); await supabase.auth.signInWithOAuth({ provider: 'discord' }); };
  const handleLogout = async () => { playSFX('click'); await supabase.auth.signOut(); setProfile(null); };

  const equipCosmeticItem = (item: ShopItem) => {
    if (item.category === 'nameColor') {
      setEquippedItems((prev) => ({ ...prev, nameColor: item.id }));
    } else if (item.category === 'nameStyle') {
      setEquippedItems((prev) => ({ ...prev, nameStyle: item.id }));
    } else {
      setEquippedItems((prev) => ({ ...prev, borderFx: item.id }));
    }
    if (user?.id) {
      setRankers((prev) =>
        prev.map((r) =>
          r.id === user.id
            ? {
                ...r,
                equipped_name_color: item.category === 'nameColor' ? item.id : r.equipped_name_color,
                equipped_name_style: item.category === 'nameStyle' ? item.id : r.equipped_name_style,
                equipped_border_fx: item.category === 'borderFx' ? item.id : r.equipped_border_fx,
              }
            : r
        )
      );
    }
    playSFX('success');
  };

  const handlePurchaseOrEquip = async (item: ShopItem) => {
    if (!user || !profile) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (isOwnedItem(item.id) || item.cost === 0) {
      equipCosmeticItem(item);
      return;
    }

    if ((profile.gc || 0) < item.cost) {
      playSFX('error');
      alert(`GC가 부족합니다. (필요: ${item.cost} / 보유: ${profile.gc || 0})`);
      return;
    }

    playSFX('click');
    const nextGc = (profile.gc || 0) - item.cost;
    const { error } = await supabase.from('profiles').update({ gc: nextGc }).eq('id', user.id);
    if (error) {
      playSFX('error');
      alert(`구매 실패: ${error.message}`);
      return;
    }

    const nextOwned = Array.from(new Set([...ownedItemIds, item.id]));
    setOwnedItemIds(nextOwned);
    equipCosmeticItem(item);
    setRankers((prev) =>
      prev.map((r) =>
        r.id === user.id
          ? {
              ...r,
              gc: nextGc,
              owned_cosmetics: nextOwned,
            }
          : r
      )
    );
    fetchProfile(user.id);
    fetchRankers();
  };

  const handleTargetLock = (name = entryOpponent) => {
      if (!user) return alert("로그인이 필요합니다!");
      if (!name.trim()) return alert("상대방 닉네임을 입력하세요!");
      if (name.trim() === currentUserName?.trim()) return alert("자기 자신에게는 도전할 수 없습니다!");
      playSFX('click'); setEntryOpponent(name); setMatchPhase('setup_mode');
  };

  const handleModeChange = (mode: 'free' | 'random') => {
    playSFX('click'); setEntryMode(mode); setEntryLegend(''); setEntryWeapons(['', '']);
    if (mode === 'free') {
      if (betAmount < 100) setBetAmount(100);
    } else {
      setBetAmount(0);
    }
  };

  const handleReroll = async () => {
    playSFX('click');
    if (rerollCount > 0) {
       if (!profile || profile.gc < 50) return alert("GC가 부족합니다! (50 GC 필요)");
       await supabase.from('profiles').update({ gc: profile.gc - 50 }).eq('id', user.id); if(user) fetchProfile(user.id);
    }
    setRerollCount(r => r + 1); setEntryLegend(ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)]); setEntryWeapons([...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2));
  };

  const handleStartMatch = async () => {
    if (entryMode === 'free' && betAmount < 100) { playSFX('error'); return alert("자유대전 배팅 금액은 최소 100 GC 이상이어야 합니다."); }
    if (betAmount > 0 && (!profile || profile.gc < betAmount)) { playSFX('error'); return alert(`GC가 부족합니다! (보유: ${profile?.gc || 0} GC)`); }

    playSFX('click');
    const { data: existing } = await supabase.from('challenges').select('*').eq('challenger_name', entryOpponent.trim()).eq('target_name', currentUserName.trim()).limit(1).maybeSingle();
    
    if (existing) {
      const dbMode = existing.mode.replace('_accepted', '').trim();
      if (dbMode !== entryMode.trim()) { playSFX('error'); return alert(`상대방이 [${existing.mode.includes('free') ? '자유' : '랜덤'}대전]을 신청했습니다. 모드를 맞춰주세요!`); }
      if (existing.bet_gc !== betAmount) { playSFX('error'); return alert(`상대방이 배팅금 [${existing.bet_gc} GC]를 걸었습니다. 배팅금을 맞춰주세요!`); }

      let updatePayload: any = { mode: existing.mode + '_accepted' };
      
      if (entryMode === 'random') {
          const a_leg = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)]; const a_wep = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
          const b_leg = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)]; const b_wep = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
          updatePayload.legend = a_leg; updatePayload.weapons = a_wep; updatePayload.t_legend = b_leg; updatePayload.t_weapons = b_wep;
          setEntryLegend(b_leg); setEntryWeapons(b_wep);
          setActiveMatch({ id: existing.id, mode: entryMode, opponent: entryOpponent.trim(), legend: b_leg, weapons: b_wep, isChallenger: false });
      } else {
          setActiveMatch({ id: existing.id, mode: entryMode, opponent: entryOpponent.trim(), legend: '', weapons: ['', ''], isChallenger: false });
      }
      await supabase.from('challenges').update(updatePayload).eq('id', existing.id); setMatchPhase('picking');
    } else {
      const { data: newChall } = await supabase.from('challenges').insert([{ challenger_name: currentUserName.trim(), target_name: entryOpponent.trim(), mode: entryMode, bet_gc: betAmount }]).select().single();
      if (newChall) { setActiveMatch({ id: newChall.id, mode: entryMode, opponent: entryOpponent.trim(), legend: '', weapons: ['', ''], isChallenger: true }); setMatchPhase('waiting_sync'); }
    }
  };

  const handlePickReady = async () => {
    if (!entryLegend || !entryWeapons[0] || !entryWeapons[1]) { playSFX('error'); return alert("레전드와 무기를 모두 선택해주세요!"); }
    playSFX('click'); if (!activeMatch) return;
    const updatePayload = activeMatch.isChallenger ? { legend: entryLegend, weapons: entryWeapons, c_ready: true } : { t_legend: entryLegend, t_weapons: entryWeapons, t_ready: true };
    setActiveMatch({ ...activeMatch, legend: entryLegend, weapons: entryWeapons });
    await supabase.from('challenges').update(updatePayload).eq('id', activeMatch.id); setMatchPhase('waiting_ready');
  };

  const handleCancelMatch = async () => {
    playSFX('click'); await supabase.from('challenges').delete().or(`challenger_name.eq."${currentUserName?.trim()}",target_name.eq."${currentUserName?.trim()}"`);
    setMatchPhase('idle'); setActiveMatch(null);
  };

  const handleReportScore = async () => {
    if (myWins === null || myLosses === null || !activeMatch) { playSFX('error'); return alert("승리 및 패배 횟수를 모두 선택하세요!"); }
    playSFX('click'); setWaitingForScore(true);
    
    const isC = activeMatch.isChallenger;
    const updatePayload = isC ? { c_win: myWins, c_lose: myLosses } : { t_win: myWins, t_lose: myLosses };
    
    const { data: updatedData, error } = await supabase.from('challenges').update(updatePayload).eq('id', activeMatch.id).select().maybeSingle();
    
    if (error) { alert("점수 제출 중 오류: " + error.message); setWaitingForScore(false); return; }

    if (updatedData) {
        const hasC = updatedData.c_win !== null && updatedData.c_lose !== null; const hasT = updatedData.t_win !== null && updatedData.t_lose !== null;
        if (hasC && hasT) {
            if (updatedData.c_win === updatedData.t_lose && updatedData.c_lose === updatedData.t_win) {
                const challengerName = isC ? currentUserName : activeMatch.opponent; const targetName = isC ? activeMatch.opponent : currentUserName;
                const winnerName = updatedData.c_win > updatedData.c_lose ? challengerName : targetName;
                const winnerRankNum = rankers.findIndex(r => r.display_name === winnerName) + 1 || 99;
                
                const matchPayload = {
                    match_type: String(updatedData.mode.replace('_accepted', '')),
                    left_player: challengerName, right_player: targetName,    
                    left_player_name: challengerName, right_player_name: targetName,
                    left_legend: String(updatedData.legend || '미선택'), left_weapons: Array.isArray(updatedData.weapons) ? updatedData.weapons : ['미선택', '미선택'],
                    right_legend: String(updatedData.t_legend || '미선택'), right_weapons: Array.isArray(updatedData.t_weapons) ? updatedData.t_weapons : ['미선택', '미선택'],
                    score_left: Number(updatedData.c_win), score_right: Number(updatedData.t_win), winner_name: String(winnerName), winner_rank_num: Number(winnerRankNum)
                };

                const { error: matchErr } = await supabase.from('matches').insert([matchPayload]);
                if (matchErr) { alert(`🚨 데이터베이스 저장 실패!\n원인: ${matchErr.message}`); setWaitingForScore(false); return; }

                const challengerWon = updatedData.c_win > updatedData.c_lose;
                const { data: cProfile } = await supabase.from('profiles').select('*').eq('display_name', challengerName).single();
                const { data: tProfile } = await supabase.from('profiles').select('*').eq('display_name', targetName).single();

                if (cProfile && tProfile) {
                    let cUpdates: any = { wins: cProfile.wins + (challengerWon ? 1 : 0), losses: cProfile.losses + (challengerWon ? 0 : 1) };
                    let tUpdates: any = { wins: tProfile.wins + (challengerWon ? 0 : 1), losses: tProfile.losses + (challengerWon ? 1 : 0) };

                    if (updatedData.mode.includes('free')) {
                        const bet = updatedData.bet_gc || 0;
                        if (challengerWon) { cUpdates.defense_stack = 0; tUpdates.defense_stack = 0; cUpdates.gc = (cProfile.gc || 0) + bet; tUpdates.gc = (tProfile.gc || 0) - bet; } 
                        else { tUpdates.defense_stack = (tProfile.defense_stack || 0) + 1; cUpdates.defense_stack = 0; cUpdates.gc = (cProfile.gc || 0) - bet; tUpdates.gc = (tProfile.gc || 0) + bet; }
                    } else {
                        const calcRP = (prof: any, won: boolean, oppProf: any) => {
                            let rpChg = won ? 50 : -20; let nStreak = won ? (prof.win_streak || 0) + 1 : 0;
                            if (won) { if (nStreak === 2) rpChg = 60; else if (nStreak === 3) rpChg = 75; else if (nStreak >= 4) rpChg = 100; if ((oppProf.rp || 1000) - (prof.rp || 1000) > 300) rpChg += 100; }
                            const bet = updatedData.bet_gc || 0; const gcChg = (won ? 100 : 30) + (won ? bet : -bet);
                            return { rp: (prof.rp || 1000) + rpChg, streak: nStreak, gc: (prof.gc || 0) + gcChg };
                        };
                        const cRes = calcRP(cProfile, challengerWon, tProfile); const tRes = calcRP(tProfile, !challengerWon, cProfile);
                        cUpdates.rp = cRes.rp; cUpdates.win_streak = cRes.streak; cUpdates.gc = cRes.gc;
                        tUpdates.rp = tRes.rp; tUpdates.win_streak = tRes.streak; tUpdates.gc = tRes.gc;
                    }
                    await supabase.from('profiles').update(cUpdates).eq('id', cProfile.id); await supabase.from('profiles').update(tUpdates).eq('id', tProfile.id);
                }
                await supabase.from('challenges').delete().eq('id', activeMatch.id);
            } else {
                playSFX('error'); alert(`스코어가 일치하지 않습니다!\n(도전자: ${updatedData.c_win}승 ${updatedData.c_lose}패 / 타겟: ${updatedData.t_win}승 ${updatedData.t_lose}패)\n초기화됩니다.`);
                setWaitingForScore(false); setMyWins(null); setMyLosses(null); await supabase.from('challenges').update({ c_win: null, c_lose: null, t_win: null, t_lose: null }).eq('id', activeMatch.id);
            }
        }
    } else { playSFX('success'); setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false); setMyWins(null); setMyLosses(null); }
  };

  const copyPlayerName = (name: string) => {
    if (!name) return; playSFX('click'); navigator.clipboard.writeText(name); setCopyStatus(true); 
    setEntryOpponent(name); setActiveMenu('home'); setMatchPhase('setup_mode'); setTimeout(() => { setCopyStatus(false); setSelectedPlayer(null); }, 500);
  };

  const handleProfileClick = (name: string) => {
    const profile = rankers.find(r => r.display_name === name);
    if (profile) { playSFX('click'); setSelectedPlayer(profile); setProfileTab('overview'); }
  };

  let favLegend = "미선택"; let favWeapon = "미선택"; let legendStatsArray: any[] = []; let weaponStatsArray: any[] = [];

  if (selectedPlayer) {
    const pMatches = logs.filter(m => m.left_player_name === selectedPlayer.display_name || m.right_player_name === selectedPlayer.display_name || m.left_player === selectedPlayer.display_name || m.right_player === selectedPlayer.display_name);
    const lStats: any = {}; const wStats: any = {};
    pMatches.forEach(m => {
      const leftP = m.left_player_name || m.left_player; const rightP = m.right_player_name || m.right_player;
      const isWin = m.winner_name === selectedPlayer.display_name; const isLeft = leftP === selectedPlayer.display_name;
      const myLeg = isLeft ? m.left_legend : m.right_legend; const myWep = isLeft ? m.left_weapons : m.right_weapons;
      if (myLeg && myLeg !== '미선택') { if (!lStats[myLeg]) lStats[myLeg] = { name: myLeg, matches: 0, wins: 0 }; lStats[myLeg].matches += 1; if (isWin) lStats[myLeg].wins += 1; }
      if (myWep && Array.isArray(myWep)) { myWep.forEach((w: string) => { if (!w || w === '미선택') return; if (!wStats[w]) wStats[w] = { name: w, matches: 0, wins: 0 }; wStats[w].matches += 1; if (isWin) wStats[w].wins += 1; }); }
    });
    legendStatsArray = Object.values(lStats).map((d: any) => ({ ...d, wr: d.matches > 0 ? d.wins / d.matches : 0 })).sort((a, b) => b.wr - a.wr || b.matches - a.matches);
    weaponStatsArray = Object.values(wStats).map((d: any) => ({ ...d, wr: d.matches > 0 ? d.wins / d.matches : 0 })).sort((a, b) => b.wr - a.wr || b.matches - a.matches);
    if (legendStatsArray.length > 0) favLegend = legendStatsArray[0].name; if (weaponStatsArray.length > 0) favWeapon = weaponStatsArray[0].name;
  }

  const rankAssetVersion = '20260315';
  const getRankAssetPath = (name: string, ext: 'png' | 'webp' = 'png') =>
    `${import.meta.env.BASE_URL}ranks/${name}.${ext}?v=${rankAssetVersion}`;

  const getGrandRankInfo = (idx: number) => {
    const badgeImage = (name: string, alt: string, fallbackName?: string) => (
      <img
        src={getRankAssetPath(name, 'png')}
        alt={alt}
        className="w-10 h-10 object-contain shrink-0"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          const current = target.getAttribute('data-fallback-step') || 'png';
          if (current === 'png') {
            target.src = getRankAssetPath(name, 'webp');
            target.setAttribute('data-fallback-step', 'webp');
            return;
          }
          if (fallbackName && current !== 'fallback') {
            target.src = getRankAssetPath(fallbackName, 'png');
            target.setAttribute('data-fallback-step', 'fallback');
            return;
          }
          target.style.display = 'none';
        }}
      />
    );

    if (idx === 0) return { title: "프레데터", num: 1, color: "text-[#ff5a5a]", glow: "shadow-[0_0_18px_rgba(255,90,90,0.45)]", bg: "bg-[#ff5a5a]/20", icon: badgeImage('predator', 'predator badge') };
    if (idx < 4) return { title: "마스터", num: idx + 1, color: "text-[#c67cff]", glow: "shadow-[0_0_14px_rgba(198,124,255,0.4)]", bg: "bg-[#c67cff]/20", icon: badgeImage('master', 'master badge') };
    if (idx < 9) return { title: "다이아몬드", num: idx + 1, color: "text-[#4fd8ff]", glow: "shadow-[0_0_12px_rgba(79,216,255,0.35)]", bg: "bg-[#4fd8ff]/20", icon: badgeImage('diamond', 'diamond badge') };
    if (idx < 16) return { title: "플래티넘", num: idx + 1, color: "text-[#61ff90]", glow: "shadow-[0_0_10px_rgba(97,255,144,0.3)]", bg: "bg-[#61ff90]/20", icon: badgeImage('platinum', 'platinum badge') };
    if (idx < 25) return { title: "골드", num: idx + 1, color: "text-[#ffd84d]", glow: "shadow-[0_0_8px_rgba(255,216,77,0.28)]", bg: "bg-[#ffd84d]/20", icon: badgeImage('gold', 'gold badge') };
    if (idx < 36) return { title: "실버", num: idx + 1, color: "text-[#d0d8e6]", glow: "", bg: "bg-[#d0d8e6]/18", icon: badgeImage('silver', 'silver badge') };
    if (idx < 50) return { title: "브론즈", num: idx + 1, color: "text-[#d39a6a]", glow: "", bg: "bg-[#d39a6a]/18", icon: badgeImage('bronze', 'bronze badge') };
    return { title: "루키", num: idx + 1, color: "text-[#a3acb9]", glow: "", bg: "bg-[#a3acb9]/18", icon: badgeImage('rookie', 'rookie badge', 'bronze') };
  };

  const seasonBadgeIcon = (fileName: string, alt: string, glowClass: string) => (
    <span className="relative inline-flex items-center justify-center w-12 h-12">
      <span className={`absolute inset-0 blur-[10px] opacity-65 ${glowClass}`}></span>
      <img
        src={getRankAssetPath(fileName, 'png')}
        alt={alt}
        className="relative w-11 h-11 object-contain"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          const step = target.getAttribute('data-fallback-step') || 'png';
          if (step === 'png') {
            target.src = getRankAssetPath(fileName, 'webp');
            target.setAttribute('data-fallback-step', 'webp');
            return;
          }
          if (step === 'webp') {
            target.src = getRankAssetPath('void', 'png');
            target.setAttribute('data-fallback-step', 'void');
            return;
          }
          target.style.display = 'none';
        }}
      />
    </span>
  );

  const getRPTierInfo = (idx: number) => {
    const makeTier = (
      name: string,
      tierRank: number,
      color: string,
      glow: string,
      bg: string,
      imageFile: string,
      glowClass: string
    ) => ({
      name,
      tierRank,
      color,
      glow,
      bg,
      icon: seasonBadgeIcon(imageFile, `${name} badge`, glowClass),
    });

    if (idx === 0) {
      return makeTier(
        '이클립스',
        1,
        'text-[#ff5a5a]',
        'shadow-[0_0_18px_rgba(255,90,90,0.45)]',
        'bg-[#ff5a5a]/20',
        'eclipse',
        'bg-red-500/50'
      );
    }
    if (idx < 4) {
      return makeTier(
        '퀘이사',
        idx,
        'text-[#c67cff]',
        'shadow-[0_0_16px_rgba(198,124,255,0.4)]',
        'bg-[#c67cff]/20',
        'quasar',
        'bg-violet-500/45'
      );
    }
    if (idx < 9) {
      return makeTier(
        '수퍼노바',
        idx - 3,
        'text-[#67d7ff]',
        'shadow-[0_0_14px_rgba(103,215,255,0.38)]',
        'bg-[#67d7ff]/20',
        'supernova',
        'bg-sky-500/45'
      );
    }
    if (idx < 16) {
      return makeTier(
        '네뷸라',
        idx - 8,
        'text-[#9df5ff]',
        'shadow-[0_0_12px_rgba(157,245,255,0.34)]',
        'bg-[#9df5ff]/20',
        'nebula',
        'bg-cyan-500/40'
      );
    }
    if (idx < 25) {
      return makeTier(
        '메테오',
        idx - 15,
        'text-[#ffd84d]',
        'shadow-[0_0_10px_rgba(255,216,77,0.32)]',
        'bg-[#ffd84d]/20',
        'meteor',
        'bg-amber-500/40'
      );
    }
    if (idx < 36) {
      return makeTier(
        '아스테로이드',
        idx - 24,
        'text-[#d7dee8]',
        'shadow-[0_0_10px_rgba(215,222,232,0.3)]',
        'bg-[#d7dee8]/20',
        'asteroid',
        'bg-slate-500/35'
      );
    }
    if (idx < 50) {
      return makeTier(
        '더스트',
        idx - 35,
        'text-[#c47a4a]',
        'shadow-[0_0_9px_rgba(196,122,74,0.28)]',
        'bg-[#c47a4a]/20',
        'dust',
        'bg-orange-600/35'
      );
    }
    return makeTier(
      '보이드',
      idx - 49,
      'text-[#a3acb9]',
      'shadow-[0_0_8px_rgba(163,172,185,0.24)]',
      'bg-[#a3acb9]/20',
      'void',
      'bg-slate-500/30'
    );
  };

  const rpRankers = [...rankers].sort((a, b) => (b.rp || 0) - (a.rp || 0));
  const normalizeName = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const regularRankMap = new Map(rankers.map((r) => [normalizeName(r.display_name), r]));

  const getRegularRankInfoByName = (name?: string | null) => {
    const found = regularRankMap.get(normalizeName(name));
    if (!found || typeof found.rankIndex !== 'number') return null;
    return getGrandRankInfo(found.rankIndex);
  };

  const getRegularRankLabelByName = (name?: string | null) => {
    const found = regularRankMap.get(normalizeName(name));
    if (!found || typeof found.rankIndex !== 'number') return '미집계';
    const info = getGrandRankInfo(found.rankIndex);
    return `${info.title} ${found.rankIndex + 1}`;
  };

  const getSeasonRankInfoByName = (name?: string | null) => {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const idx = rpRankers.findIndex((r) => normalizeName(r.display_name) === normalized);
    if (idx < 0) return null;
    return { index: idx, ...getRPTierInfo(idx) };
  };

  const getSeasonRankLabelByName = (name?: string | null) => {
    const info = getSeasonRankInfoByName(name);
    return info ? `${info.name} ${info.index + 1}위` : '미집계';
  };

  const getRegularRankIndexByName = (name?: string | null) => {
    const found = regularRankMap.get(normalizeName(name));
    if (!found || typeof found.rankIndex !== 'number') return null;
    return found.rankIndex;
  };

  const currentUserRegularInfo = getRegularRankInfoByName(currentUserName);
  const currentUserRegularIndex = getRegularRankIndexByName(currentUserName);
  const currentUserSeasonIndex = rpRankers.findIndex(
    (r) =>
      (user?.id && r.id === user.id) ||
      normalizeName(r.display_name) === normalizeName(currentUserName)
  );
  const currentUserSeasonInfo =
    currentUserSeasonIndex >= 0 ? { index: currentUserSeasonIndex, ...getRPTierInfo(currentUserSeasonIndex) } : null;
  const currentUserRegularPoints =
    typeof profile?.regular_rp === 'number'
      ? profile.regular_rp
      : calculateRegularPoints(profile?.wins || 0, profile?.losses || 0);
  const currentUserSeasonPoints = profile?.rp || 1000;

  const onlineRankers = rankers.filter((r) => {
    if (DISCORD_GUILD_ID) {
      const candidates = [
        r.display_name,
        r.discord_name,
        r.discord_username,
        r.discord_nick,
        r.discord_global_name,
        r.discord_display_name,
      ];
      return candidates.some((candidate) => {
        const normalized = normalizeName(candidate);
        return normalized && discordOnlineUsers.has(normalized);
      });
    }
    return onlineUsers.has((r.display_name || '').trim());
  });
  const onlineBoardEmptyText = DISCORD_GUILD_ID
    ? '디스코드 접속 중인 클랜원이 없습니다.'
    : '현재 접속 중인 클랜원이 없습니다.';

  const selectedPlayerRegularInfo = selectedPlayer ? getRegularRankInfoByName(selectedPlayer.display_name) : null;
  const selectedPlayerRegularLabel = selectedPlayer ? getRegularRankLabelByName(selectedPlayer.display_name) : '미집계';
  const selectedPlayerSeasonInfo = selectedPlayer ? getSeasonRankInfoByName(selectedPlayer.display_name) : null;

  // 🌟 V4.6: 전투기록 UI 완벽 분리 구현 (WIN/LOSE 직관적 스티커 형태 도입)
  const renderCombatLogItem = (log: any, index: number) => {
    const leftP = log.left_player_name || log.left_player;
    const rightP = log.right_player_name || log.right_player;
    const leftRegularInfo = getRegularRankInfoByName(leftP);
    const rightRegularInfo = getRegularRankInfoByName(rightP);
    const leftRegularLabel = getRegularRankLabelByName(leftP);
    const rightRegularLabel = getRegularRankLabelByName(rightP);
    const leftSeasonInfo = getSeasonRankInfoByName(leftP);
    const rightSeasonInfo = getSeasonRankInfoByName(rightP);
    
    const isLeftWinner = log.winner_name === leftP;
    const modeLabel = log.match_type === 'free' ? '자유 대전' : '랜덤 대전';
    const leftResult = isLeftWinner ? 'WIN' : 'LOSE';
    const rightResult = isLeftWinner ? 'LOSE' : 'WIN';
    const leftScore = log.score_left ?? 0;
    const rightScore = log.score_right ?? 0;

    return (
      <div
        key={index}
        onMouseEnter={() => playSFX('hover')}
        className="bg-black/65 border border-white/10 rounded-2xl px-2 sm:px-3 py-2 hover:border-cyan-500/50 transition-colors shadow-md"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-start">
          <button onClick={() => handleProfileClick(leftP)} className={`text-left min-w-0 cursor-pointer ${isLeftWinner ? 'opacity-100' : 'opacity-55'}`}>
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <img src={getAvatarFallback(leftP, rankers)} className={`w-8 h-8 rounded-full border shrink-0 ${getAvatarBorderFxForUser(leftP)}`} alt="left-player" />
              <span className={`font-bold text-lg sm:text-xl truncate ${getNameClassForUser(leftP)}`}>{leftP}</span>
              <span title={`정규 ${leftRegularLabel}`} className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center shrink-0">
                {leftRegularInfo?.icon || <Shield size={11} className="text-slate-300" />}
              </span>
              <span title={`시즌 ${leftSeasonInfo?.name || '미집계'}`} className="w-11 h-11 flex items-center justify-center leading-none shrink-0">
                {leftSeasonInfo?.icon || <Star size={18} className="text-slate-300" />}
              </span>
            </div>
            <p className="text-sm font-bold text-pink-400 truncate">{log.left_legend || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.left_weapons?.[0] || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.left_weapons?.[1] || '미선택'}</p>
          </button>

          <div className="flex flex-col items-center py-1">
            <span className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest ${log.match_type === 'free' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-black'}`}>
              {modeLabel}
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className={`text-sm font-black px-3 py-1 rounded-md shadow-md ${leftResult === 'WIN' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white opacity-55'}`}>{leftResult}</span>
              <span className={`text-4xl sm:text-5xl font-black leading-none ${isLeftWinner ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]' : 'text-slate-500/65'}`}>{leftScore}</span>
              <span className="text-3xl sm:text-4xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]">VS</span>
              <span className={`text-4xl sm:text-5xl font-black leading-none ${!isLeftWinner ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]' : 'text-slate-500/65'}`}>{rightScore}</span>
              <span className={`text-sm font-black px-3 py-1 rounded-md shadow-md ${rightResult === 'WIN' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white opacity-55'}`}>{rightResult}</span>
            </div>
          </div>

          <button onClick={() => handleProfileClick(rightP)} className={`text-right min-w-0 cursor-pointer ${!isLeftWinner ? 'opacity-100' : 'opacity-55'}`}>
            <div className="flex items-center justify-end gap-2 mb-0.5 min-w-0">
              <span title={`시즌 ${rightSeasonInfo?.name || '미집계'}`} className="w-11 h-11 flex items-center justify-center leading-none shrink-0">
                {rightSeasonInfo?.icon || <Star size={18} className="text-slate-300" />}
              </span>
              <span title={`정규 ${rightRegularLabel}`} className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center shrink-0">
                {rightRegularInfo?.icon || <Shield size={11} className="text-slate-300" />}
              </span>
              <span className={`font-bold text-lg sm:text-xl truncate ${getNameClassForUser(rightP)}`}>{rightP}</span>
              <img src={getAvatarFallback(rightP, rankers)} className={`w-8 h-8 rounded-full border shrink-0 ${getAvatarBorderFxForUser(rightP)}`} alt="right-player" />
            </div>
            <p className="text-sm font-bold text-pink-400 truncate">{log.right_legend || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.right_weapons?.[0] || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.right_weapons?.[1] || '미선택'}</p>
          </button>
        </div>
      </div>
    );
  };

  const globalFontStyle = (
    <style>{`
      @import url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff');
      @import url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff');
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Rajdhani:wght@600;700&family=Exo+2:wght@700;800&family=Do+Hyeon&family=Jua&display=swap');
      
      body, div, span, p, h1, h2, h3, h4, button, input, select {
        font-family: 'GmarketSansMedium', sans-serif !important;
        letter-spacing: -0.02em;
      }
      .font-black, .font-bold, h1, h2, h3, h4 {
        font-family: 'GmarketSansBold', sans-serif !important;
      }
      
      .custom-scrollbar::-webkit-scrollbar { width: 5px; } 
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; } 
      optgroup { font-style: normal; font-weight: 700; background: #000; color: #fff; } 
      option { background-color: #000; color: #fff; padding: 10px; }
      
      .grid-glow-fix { padding: 20px; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .rank-glow-buffer { padding: 4px 2px; scrollbar-gutter: stable; }
      .rank-card-stable { transform: translateZ(0); backface-visibility: hidden; will-change: transform; }
      .name-style-orbit { font-family: 'Orbitron', 'GmarketSansBold', sans-serif !important; letter-spacing: 0.02em; }
      .name-style-rajdhani { font-family: 'Rajdhani', 'GmarketSansBold', sans-serif !important; letter-spacing: 0.01em; }
      .name-style-exo { font-family: 'Exo 2', 'GmarketSansBold', sans-serif !important; letter-spacing: 0.01em; }
      .name-style-dohyeon { font-family: 'Do Hyeon', 'GmarketSansBold', sans-serif !important; letter-spacing: 0.01em; }
      .name-style-jua { font-family: 'Jua', 'GmarketSansBold', sans-serif !important; letter-spacing: 0.01em; }
      .board-soft-glow {
        box-shadow:
          0 0 0 1px rgba(34, 211, 238, 0.28),
          0 0 26px rgba(34, 211, 238, 0.2),
          0 0 52px rgba(167, 139, 250, 0.12);
      }
    `}</style>
  );

  return (
    <div className="flex h-screen bg-black text-slate-300 overflow-hidden relative select-none">
      {globalFontStyle}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 brightness-[0.76] contrast-[1.08] saturate-[1.04]" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.30),rgba(2,6,23,0.62))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_80%_22%,rgba(217,70,239,0.08),transparent_42%)]"></div>
        <div className="absolute inset-0 backdrop-blur-[1.2px]"></div>
      </div>
      
      <aside className="w-14 sm:w-16 lg:w-20 bg-black/20 backdrop-blur-md border-r border-cyan-500/30 shadow-2xl flex flex-col items-center py-6 sm:py-8 lg:py-10 gap-6 sm:gap-8 lg:gap-10 z-20 shrink-0 h-screen fixed left-0">
        <div onMouseEnter={() => playSFX('hover')} className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg cursor-pointer">
          <Star className="text-cyan-400 animate-pulse" size={20}/>
        </div>
        <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10 text-slate-500 w-full items-center">
          {MENU_ITEMS.map((item) => (
            <div key={item.id} title={item.label} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setActiveMenu(item.id); }} className={`cursor-pointer transition-all ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300'}`}>
              <item.icon size={20}/>
            </div>
          ))}
        </div>
        <div onMouseEnter={() => playSFX('hover')} className="mt-auto mb-4 sm:mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout}>
          <LogOut size={20}/>
        </div>
      </aside>

      <div className="flex-1 flex flex-col z-10 relative ml-14 sm:ml-16 lg:ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="px-3 sm:px-4 lg:px-10 py-3 sm:py-4 lg:py-6 flex justify-between items-center flex-wrap gap-3 sm:gap-4 shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md">
          <div onMouseEnter={() => playSFX('hover')} className="min-w-0 flex-1 cursor-pointer" onClick={() => setActiveMenu('home')}>
            <div className="flex items-end gap-2 sm:gap-3 lg:gap-6 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="flex flex-col min-w-0 shrink-0">
                <p className="text-[10px] sm:text-[11px] lg:text-[13px] font-bold text-white/90 italic tracking-tight leading-tight mb-1 max-w-[200px] sm:max-w-[260px] lg:max-w-[340px]">
                  "우주 먼지(Dust)로 시작해 별을 지우는 그림자(Eclipse)가 되십시오."
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white italic tracking-tighter drop-shadow-[0_0_20px_purple] leading-none">은하단</h1>
              </div>
              <div className="h-8 sm:h-10 lg:h-12 w-[2px] sm:w-[3px] bg-gradient-to-b from-cyan-400 to-purple-400 mx-1 sm:mx-2 lg:mx-3 shadow-lg"></div>
              <div className="flex flex-col justify-end min-w-0">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase tracking-wider sm:tracking-widest whitespace-nowrap">별들의 전쟁 : 시즌 1</p>
                <p className="hidden sm:block text-[10px] lg:text-[12px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.25em] lg:tracking-[0.4em] mt-1 uppercase italic">SEASON 01 BATTLE FOR THE STAR THRONE</p>
              </div>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-end flex-wrap">
                <div className="flex flex-col items-start min-w-0 w-full sm:w-auto sm:min-w-[300px] lg:min-w-[350px] pr-0 sm:pr-1">
                    <div className="flex items-center gap-3 w-full">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center shrink-0">{currentUserRegularInfo?.icon || <Shield size={34} className="text-slate-300" />}</span>
                      <span className={`text-[1.1rem] sm:text-[1.35rem] lg:text-[1.95rem] font-black leading-tight whitespace-nowrap drop-shadow-[0_0_10px_rgba(250,204,21,0.4)] ${currentUserRegularInfo?.color || 'text-yellow-300'}`}>
                        {currentUserRegularIndex !== null ? `${currentUserRegularIndex + 1}위 ${currentUserRegularInfo?.title || '미집계'}` : '미집계'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-full mt-1.5">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center leading-none shrink-0">{currentUserSeasonInfo?.icon || '🪐'}</span>
                      <span className={`text-[1.1rem] sm:text-[1.35rem] lg:text-[1.95rem] font-black leading-tight whitespace-nowrap drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] ${currentUserSeasonInfo?.color || 'text-slate-300'}`}>
                        {currentUserSeasonInfo ? `${currentUserSeasonInfo.name} ${currentUserSeasonInfo.index + 1}위` : '미집계'}
                      </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-black/45 px-3 py-3 rounded-2xl border border-white/10 shadow-inner w-full sm:w-auto min-w-0 sm:min-w-[280px]">
                    <div className="col-span-2 bg-black/45 rounded-xl border border-emerald-400/25 px-3 py-2 text-center">
                      <p className="text-[11px] font-black text-emerald-300 tracking-widest">GC (상점)</p>
                      <p className="text-[1.3rem] sm:text-[1.5rem] lg:text-[1.7rem] font-black text-emerald-300 leading-tight">{profile?.gc || 0}</p>
                    </div>
                    <div className="bg-black/45 rounded-xl border border-yellow-400/25 px-3 py-2 text-center">
                      <p className="text-[11px] font-black text-yellow-300 tracking-widest">RP (명예)</p>
                      <p className="text-[1.2rem] sm:text-[1.35rem] lg:text-[1.5rem] font-black text-yellow-300 leading-tight">{currentUserRegularPoints}</p>
                    </div>
                    <div className="bg-black/45 rounded-xl border border-fuchsia-400/25 px-3 py-2 text-center">
                      <p className="text-[11px] font-black text-fuchsia-300 tracking-widest">SP (시즌)</p>
                      <p className="text-[1.2rem] sm:text-[1.35rem] lg:text-[1.5rem] font-black text-fuchsia-300 leading-tight">{currentUserSeasonPoints}</p>
                    </div>
                </div>
                <div onMouseEnter={() => playSFX('hover')} onClick={handleLogout} className="flex items-center gap-3 sm:gap-4 bg-black/60 p-2.5 sm:p-3.5 rounded-full border border-white/10 pr-6 sm:pr-10 border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all w-full sm:w-auto justify-center sm:justify-start">
                  <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border-2 ${equippedBorderFxClass}`} alt="profile"/>
                  <div className="flex flex-col">
                    <span className={`text-[1.2rem] sm:text-[1.45rem] lg:text-[1.9rem] leading-tight font-black ${equippedNameClass}`}>{currentUserName || "GUEST"}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">Logout</span>
                  </div>
                </div>
            </div>
          ) : (
            <button onMouseEnter={() => playSFX('hover')} onClick={handleLogin} className="flex items-center gap-3 bg-cyan-600/20 border-2 border-cyan-400 py-2.5 px-8 rounded-full shadow-[0_0_20px_cyan] hover:bg-cyan-400 hover:text-black font-bold text-sm cursor-pointer">
              <LogIn size={20}/> LOGIN
            </button>
          )}
        </header>

        {activeMenu === 'home' && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 grid grid-cols-12 gap-4 lg:gap-8 items-start xl:items-stretch pb-20 animate-in fade-in duration-500 h-full">
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-4 lg:gap-8 h-auto xl:h-full relative order-1 xl:order-1">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-8 items-start">
                <div className="flex flex-col h-auto relative">
               <section className="board-soft-glow bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 rounded-[2rem] lg:rounded-[2.5rem] p-4 sm:p-5 lg:p-6 flex flex-col h-full overflow-hidden shadow-lg relative z-10">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 lg:mb-6 border-b border-white/5 pb-3 lg:pb-4">
                    접속 현황 (Online Board)
                  </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-1 sm:pr-2 pt-2 animate-in fade-in">
                       {onlineRankers.length > 0 ? onlineRankers.map((ou, i) => {
                          const rankInfo = getGrandRankInfo(ou.rankIndex);
                          const seasonInfo = getSeasonRankInfoByName(ou.display_name);
                          return (
                            <div key={i} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-white/10 p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-between hover:border-cyan-400/50 transition-all group gap-2">
                               <div className="flex items-center gap-2 sm:gap-4 cursor-pointer group/profile flex-1 min-w-0 mr-1 sm:mr-2" onClick={() => handleProfileClick(ou.display_name)}>
                                  <div className="relative shrink-0">
                                     <img src={ou.avatar_url} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border transition-colors group-hover/profile:border-cyan-400 ${getAvatarBorderFxForUser(ou.display_name)}`} alt="profile"/>
                                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                     <span className={`group-hover/profile:text-cyan-400 text-base sm:text-lg font-bold truncate ${getNameClassForUser(ou.display_name)}`}>{ou.display_name}</span>
                                     <span className={`text-[11px] font-bold mt-1 ${rankInfo?.color || ''}`}>{rankInfo ? `${rankInfo.title} ${rankInfo.num}위` : '미집계'}</span>
                                     <span className={`text-[11px] font-bold mt-0.5 ${seasonInfo?.color || 'text-slate-400'}`}>{seasonInfo ? `${seasonInfo.name} ${seasonInfo.index + 1}위` : '미집계'}</span>
                                  </div>
                               </div>
                               {ou.display_name.trim() === currentUserName?.trim() ? (
                                   <div className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 border border-blue-500/50 text-blue-400 shrink-0">나</div>
                               ) : (
                                  <button 
                                    onMouseEnter={() => playSFX('hover')} 
                                    onClick={() => { playSFX('click'); handleTargetLock(ou.display_name); }} 
                                    disabled={matchPhase !== 'idle'} 
                                     className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer ${matchPhase === 'idle' ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black' : 'bg-slate-800/50 border border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                  >
                                    {matchPhase === 'idle' ? '도전' : '대전 중'}
                                  </button>
                               )}
                            </div>
                          )
                       }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">{onlineBoardEmptyText}</div>)}
                    </div>
               </section>
                </div>

                <div className="flex flex-col h-auto relative">
               <section className="board-soft-glow bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-2xl rounded-[2rem] lg:rounded-[3rem] p-4 sm:p-5 flex flex-col h-auto shrink-0 relative z-10 overflow-visible">
                  <div className="flex flex-col relative z-10">
                      <h3 onMouseEnter={() => playSFX('hover')} className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 border-b border-white/5 pb-3">
                         {(matchPhase === 'idle' || matchPhase === 'setup_mode') && '대전 신청 (Match Entry)'}
                         {(matchPhase === 'waiting_sync' || matchPhase === 'picking' || matchPhase === 'waiting_ready') && '대전 준비 (Match Prep)'}
                         {matchPhase === 'scoring' && '결과 제출 (Submit Score)'}
                      </h3>
                      
                      {matchPhase === 'idle' && (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-4">
                           <div className="flex flex-col items-center text-center mb-1">
                               <Target size={46} className="text-cyan-400 drop-shadow-[0_0_15px_cyan] mb-3" />
                               <h4 className="text-xl sm:text-2xl font-bold text-white tracking-widest">타겟을 설정하세요</h4>
                              <p className="text-slate-400 text-sm mt-2">좌측 접속 현황에서 선택하거나 직접 입력하세요.</p>
                           </div>
                           <div className="bg-black/60 p-4 rounded-2xl border border-white/10 shadow-inner mt-1">
                              <p className="text-xs text-slate-500 font-bold mb-2 pl-2">TARGET NICKNAME</p>
                               <input value={entryOpponent} onChange={(e) => setEntryOpponent(e.target.value)} placeholder="상대방 닉네임 직접 입력" className="w-full bg-transparent outline-none text-white font-bold text-lg sm:text-xl select-text pl-2" />
                           </div>
                           <button onMouseEnter={() => playSFX('hover')} onClick={() => handleTargetLock()} className="w-full py-4 rounded-[1.5rem] font-bold text-xl text-white bg-cyan-600 shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:bg-cyan-500 transition-all border border-cyan-400 cursor-pointer mt-2">다음 단계 (Next)</button>
                        </div>
                      )}

                      {matchPhase === 'setup_mode' && (
                        <div className="flex flex-col pt-2 pb-2 animate-in fade-in gap-5">
                           <div className="flex items-center justify-between bg-black/40 p-5 rounded-[2rem] border border-white/10 shadow-inner mb-2">
                              <div className="flex flex-col cursor-pointer group/target flex-1 min-w-0 pr-4" onClick={() => handleProfileClick(entryOpponent)}>
                                 <p className="text-xs text-slate-500 font-bold mb-1">SELECTED TARGET</p>
                                 <h4 className={`text-pink-400 italic group-hover/target:text-cyan-400 text-2xl truncate font-bold`}>{entryOpponent}</h4>
                              </div>
                              <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMatchPhase('idle'); }} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-base font-bold border border-white/10 transition-colors cursor-pointer shrink-0">변경</button>
                           </div>
                           
                           <div className="flex gap-2 p-1.5 bg-black/50 rounded-2xl border border-white/5">
                              <button onMouseEnter={() => playSFX('hover')} onClick={() => handleModeChange('free')} className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all cursor-pointer ${entryMode === 'free' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>자유대전 (정규)</button>
                              <button onMouseEnter={() => playSFX('hover')} onClick={() => handleModeChange('random')} className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all cursor-pointer ${entryMode === 'random' ? 'bg-cyan-600 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>랜덤대전 (시즌)</button>
                           </div>
                           
                           <div className="bg-black/60 p-5 rounded-2xl border border-white/5 mt-2 flex flex-col gap-4">
                              <div className="flex justify-between items-center">
                                 <p className="text-base text-pink-400 font-bold">배팅 금액 (GC) <span className="text-slate-500 ml-2 text-xs">{entryMode === 'free' ? '최소 100' : '0 가능'}</span></p>
                                 <input 
                                   type="number" 
                                   min={entryMode === 'free' ? 100 : 0} 
                                   value={betAmount} 
                                   onChange={(e) => setBetAmount(Number(e.target.value))} 
                                   onBlur={() => {
                                     if (entryMode === 'free' && betAmount < 100) setBetAmount(100);
                                     if (entryMode === 'random' && betAmount < 0) setBetAmount(0);
                                   }}
                                   className="w-28 bg-white/5 border border-white/10 p-2.5 rounded-xl outline-none text-white font-bold text-right text-lg select-text cursor-pointer" 
                                 />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                 <div className="grid grid-cols-3 gap-1 min-w-0">
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(entryMode === 'free' ? 100 : 0, p - 50)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-50</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(entryMode === 'free' ? 100 : 0, p - 100)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-100</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(entryMode === 'free' ? 100 : 0, p - 500)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-500</button>
                                 </div>
                                 <div className="grid grid-cols-3 gap-1 min-w-0">
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 50); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+50</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 100); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+100</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 500); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+500</button>
                                 </div>
                              </div>
                           </div>

                           <button onMouseEnter={() => playSFX('hover')} onClick={handleStartMatch} className="w-full py-5 mt-6 rounded-[2rem] font-bold text-2xl text-white bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:bg-blue-500 transition-all border border-blue-400 cursor-pointer">
                              매칭 신청 및 수락
                           </button>
                        </div>
                      )}

                      {matchPhase === 'waiting_sync' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                           <div className="w-24 h-24 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-10 shadow-lg"></div>
                           <h4 className="text-3xl font-bold text-cyan-400 tracking-widest">타겟 접속 대기중</h4>
                           <p className="text-base text-slate-300 mt-5 text-center leading-relaxed">
                             상대방(<span className="text-pink-400 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleProfileClick(entryOpponent)}>{entryOpponent}</span>)이 당신을 지목하여<br/>수락하면 픽창으로 이동합니다.
                           </p>
                           <button onMouseEnter={() => playSFX('hover')} onClick={handleCancelMatch} className="mt-12 px-10 py-4 rounded-full border-2 border-pink-500/50 text-pink-400 font-bold text-lg hover:bg-pink-500 hover:text-white transition-all shadow-md cursor-pointer">매칭 취소 (Cancel)</button>
                        </div>
                      )}

                      {matchPhase === 'picking' && (
                        <div className="flex flex-col pt-2 pb-2 animate-in fade-in gap-5">
                           <h4 className="text-center text-xl font-bold text-pink-400 mb-2 mt-2">매치 성사! 무기를 선택하세요</h4>
                           {entryMode === 'free' ? (
                              <div className="space-y-4 flex flex-col">
                                 <select onMouseEnter={() => playSFX('hover')} value={entryLegend} onChange={(e) => { setEntryLegend(e.target.value); playSFX('click'); }} className="w-full min-w-0 bg-black/60 border border-white/10 py-5 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate">
                                    <option value="" disabled hidden>👉 레전드 선택</option>
                                    {Object.entries(LEGEND_CATEGORIES).map(([cat, list]) => (
                                      <optgroup key={cat} label={`■ ${cat}`} style={{color: getLegendCategoryColorHex(cat), backgroundColor: '#000'}}>
                                        {list.map(l => <option key={l} value={l} style={{color: '#fff'}}>{l}</option>)}
                                      </optgroup>
                                    ))}
                                 </select>
                                 <div className="flex gap-3 w-full">
                                   <select onMouseEnter={() => playSFX('hover')} value={entryWeapons[0]} onChange={(e) => {const w = [...entryWeapons]; w[0] = e.target.value; setEntryWeapons(w); playSFX('click');}} className="flex-1 min-w-0 bg-black/60 border border-white/10 py-5 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate">
                                      <option value="" disabled hidden>👉 무기 선택</option>
                                      {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (
                                        <optgroup key={cat} label={`■ ${cat}`} style={{color: getWeaponCategoryColorHex(cat), backgroundColor: '#000'}}>
                                          {list.map(w => <option key={w} value={w} style={{color: '#fff'}}>{w}</option>)}
                                        </optgroup>
                                      ))}
                                   </select>
                                   <select onMouseEnter={() => playSFX('hover')} value={entryWeapons[1]} onChange={(e) => {const w = [...entryWeapons]; w[1] = e.target.value; setEntryWeapons(w); playSFX('click');}} className="flex-1 min-w-0 bg-black/60 border border-white/10 py-5 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate">
                                      <option value="" disabled hidden>👉 무기 선택</option>
                                      {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (
                                        <optgroup key={cat} label={`■ ${cat}`} style={{color: getWeaponCategoryColorHex(cat), backgroundColor: '#000'}}>
                                          {list.map(w => <option key={w} value={w} style={{color: '#fff'}}>{w}</option>)}
                                        </optgroup>
                                      ))}
                                   </select>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex flex-col gap-4 mt-2">
                                 <button onMouseEnter={() => playSFX('hover')} onClick={handleReroll} className={`py-5 rounded-2xl font-bold text-lg transition-all border cursor-pointer ${rerollCount === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-black shadow-[0_0_15px_emerald]' : 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500 hover:text-black shadow-[0_0_15px_amber]'}`}>
                                    {rerollCount === 0 ? '🎁 1회 무료 리롤 돌리기' : '🔄 50 GC 소모하여 리롤'}
                                 </button>
                                 <div className="flex flex-col gap-3 mt-3">
                                    <div className="bg-black/60 p-5 rounded-2xl text-center text-xl font-bold text-cyan-400 border border-white/10 shadow-inner">{entryLegend || '랜덤 레전드 대기중...'}</div>
                                    <div className="flex gap-3">
                                       <span className="flex-1 bg-black/60 p-5 rounded-2xl text-center text-base font-bold text-pink-400 border border-white/10 truncate shadow-inner">{entryWeapons[0] || '랜덤 무기 대기중...'}</span>
                                       <span className="flex-1 bg-black/60 p-5 rounded-2xl text-center text-base font-bold text-pink-400 border border-white/10 truncate shadow-inner">{entryWeapons[1] || '랜덤 무기 대기중...'}</span>
                                    </div>
                                 </div>
                              </div>
                           )}
                           <button onMouseEnter={() => playSFX('hover')} onClick={handlePickReady} className="w-full py-5 mt-6 rounded-[2rem] font-bold text-2xl text-black bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] hover:bg-yellow-300 transition-all cursor-pointer">준비 완료 (Ready)</button>
                        </div>
                      )}

                      {matchPhase === 'waiting_ready' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                           <div className="w-24 h-24 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-10 shadow-lg"></div>
                           <h4 className="text-3xl font-bold text-yellow-400 tracking-widest">상대방 픽 대기중</h4>
                           <p className="text-base text-slate-300 mt-5 text-center leading-relaxed">상대방이 무기를 고르고 준비 완료를 누르면<br/>전투 결과 창으로 이동합니다.</p>
                        </div>
                      )}

                       {matchPhase === 'scoring' && activeMatch && (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-4 mt-2">
                           <div onMouseEnter={() => playSFX('hover')} className={`p-5 rounded-[2.5rem] border-2 shadow-2xl flex flex-col gap-4 ${activeMatch.mode.includes('random') ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-pink-400/50 bg-pink-400/5'}`}>
                             <div className="flex items-center justify-center mb-1">
                               <span className={`px-3 py-1 rounded-lg text-[11px] font-black tracking-widest ${activeMatch.mode.includes('random') ? 'bg-cyan-600 text-black' : 'bg-pink-600 text-white'}`}>
                                 {activeMatch.mode.includes('random') ? '랜덤 대전' : '자유 대전'}
                               </span>
                             </div>

                             <div className="flex items-center justify-center gap-2 whitespace-nowrap px-1">
                                 <span className="text-3xl font-black text-yellow-400">{myWins ?? '-'}</span>
                                 <span className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.75)]">VS</span>
                                 <span className="text-3xl font-black text-yellow-400">{myLosses ?? '-'}</span>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                               <div className="min-w-0 bg-black/55 rounded-2xl border border-white/10 px-4 py-3">
                                 <div className="flex items-center gap-3 min-w-0 mb-2">
                                   <img src={currentUserAvatar || getAvatarFallback(currentUserName, rankers)} className="w-10 h-10 rounded-full border border-cyan-300 shrink-0" alt="my-avatar"/>
                                   <p className={`${getResponsiveNameClass(currentUserName || 'GUEST', 'medium')} leading-none`}>{currentUserName || 'GUEST'}</p>
                                 </div>
                                 <div className="space-y-1">
                                   <p className="text-sm font-bold text-pink-400 leading-snug whitespace-normal break-words">{activeMatch.legend || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{activeMatch.weapons[0] || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{activeMatch.weapons[1] || '?'}</p>
                                 </div>
                               </div>

                               <div className="min-w-0 bg-black/55 rounded-2xl border border-white/10 px-4 py-3">
                                 <div className="flex items-center justify-end gap-3 min-w-0 mb-2">
                                   <p className={`${getResponsiveNameClass(activeMatch.opponent || 'OPPONENT', 'medium')} leading-none`}>{activeMatch.opponent || 'OPPONENT'}</p>
                                   <img src={getAvatarFallback(activeMatch.opponent, rankers)} className="w-10 h-10 rounded-full border border-pink-300 shrink-0" alt="opponent-avatar"/>
                                 </div>
                                 <div className="space-y-1 text-right">
                                   <p className="text-sm font-bold text-pink-400 leading-snug whitespace-normal break-words">{activeMatch.oppLegend || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{activeMatch.oppWeapons?.[0] || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{activeMatch.oppWeapons?.[1] || '?'}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                           
                           <div className="flex flex-col gap-4 pt-4 mt-2">
                              <div className="flex items-center justify-between px-3">
                                <span className="text-cyan-400 font-bold text-xl tracking-widest">나의 승리</span>
                                <div className="flex gap-3">
                                  {[0, 1, 2, 3].map(num => (
                                    <button key={`w${num}`} onMouseEnter={() => playSFX('hover')} onClick={() => { setMyWins(num); playSFX('click'); }} className={`w-14 h-14 rounded-2xl font-bold text-2xl transition-all border-2 cursor-pointer ${myWins === num ? 'bg-cyan-500 border-white text-black shadow-[0_0_20px_cyan]' : 'bg-black/60 border-white/10 text-white hover:border-cyan-400/50'}`}>{num}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-3 mb-3">
                                <span className="text-pink-400 font-bold text-xl tracking-widest">나의 패배</span>
                                <div className="flex gap-3">
                                  {[0, 1, 2, 3].map(num => (
                                    <button key={`l${num}`} onMouseEnter={() => playSFX('hover')} onClick={() => { setMyLosses(num); playSFX('click'); }} className={`w-14 h-14 rounded-2xl font-bold text-2xl transition-all border-2 cursor-pointer ${myLosses === num ? 'bg-pink-500 border-white text-black shadow-[0_0_20px_pink]' : 'bg-black/60 border-white/10 text-white hover:border-pink-400/50'}`}>{num}</button>
                                  ))}
                                </div>
                              </div>
                              <button onMouseEnter={() => playSFX('hover')} onClick={handleReportScore} disabled={myWins === null || myLosses === null || waitingForScore} className={`w-full py-5 mt-2 rounded-[1.5rem] font-bold text-2xl transition-all uppercase ${waitingForScore ? 'text-yellow-400 border-2 border-yellow-400/50 cursor-wait animate-pulse' : (myWins !== null && myLosses !== null) ? 'text-cyan-400 border-2 border-cyan-400/50 shadow-md cursor-pointer hover:bg-cyan-500 hover:text-black' : 'text-slate-500 border-2 border-slate-700 bg-slate-800/50 cursor-not-allowed'}`}>
                                {waitingForScore ? '상대방의 결과 입력을 대기중입니다...' : '결과 검증 및 제출'}
                              </button>
                           </div>
                        </div>
                      )}
                  </div>
               </section>
                </div>
              </div>

            <div ref={recentLogsBoardRef} className="flex flex-col h-[72vh] sm:h-[80vh] xl:h-[90vh] relative">
               <section className="board-soft-glow bg-black/45 backdrop-blur-2xl border-2 border-cyan-400/80 rounded-[2rem] lg:rounded-[2.5rem] p-3 sm:p-4 lg:p-5 flex flex-col h-full overflow-hidden shadow-xl relative z-10">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 lg:mb-6 border-b border-white/5 pb-3 lg:pb-4">
                    최근 기록 (Battle Logs)
                  </h3>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 sm:pr-2 space-y-1">
                    {logs.length > 0 ? logs.slice(0, 20).map((log, i) => renderCombatLogItem(log, i)) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">전투 기록이 없습니다</div>)}
                  </div>
               </section>
            </div>
            </div>

            <div
              ref={rankingBoardRef}
              className="col-span-12 xl:col-span-4 flex flex-col h-[78vh] sm:h-[84vh] xl:h-auto relative order-2 xl:order-2"
              style={homeRankingHeight ? { height: `${homeRankingHeight}px` } : undefined}
            >
               <section className="board-soft-glow bg-[#060b18]/95 border-2 border-cyan-400 shadow-xl rounded-[2.4rem] sm:rounded-[3rem] lg:rounded-[3.5rem] p-4 sm:p-5 lg:p-6 flex flex-col h-full shrink-0 relative z-10 overflow-hidden">
                  <div className="pt-2 flex flex-col relative z-10 h-full">
                      
                      <div onMouseEnter={() => playSFX('hover')} className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-5 mb-4 lg:mb-6 mt-1">
                        <Trophy className="text-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,0.65)]" size={44}/>
                        <div className="flex flex-col text-center">
                          <h3 className="text-[1.8rem] sm:text-[2.15rem] lg:text-[2.55rem] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter pt-1">은하단 랭킹</h3>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                        <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMiniRankMode('free'); }} className={`flex-1 py-3 rounded-xl text-base font-bold transition-all border cursor-pointer ${miniRankMode === 'free' ? 'bg-pink-600/20 text-pink-400 border-pink-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>⚔️ 정규 랭킹</button>
                        <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMiniRankMode('random'); }} className={`flex-1 py-3 rounded-xl text-base font-bold transition-all border cursor-pointer ${miniRankMode === 'random' ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🎲 시즌 랭킹</button>
                      </div>
                      
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 rank-glow-buffer">
                          {miniRankMode === 'free' ? (
                            rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).map((r) => {
                              const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                              return (
                                <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`rank-card-stable w-full h-[148px] sm:h-[156px] p-3 sm:p-4 rounded-[1.3rem] sm:rounded-[1.45rem] cursor-pointer transition-all relative overflow-hidden ${rankCardFxByTier(r.rankIndex)}`}>
                                  <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]">
                                    {r.rankIndex + 1}위
                                  </span>
                                  <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                                    <div className="flex items-center justify-center min-w-[68px] h-[46px]">
                                      {grandRank.icon}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between w-full px-1 gap-3 pt-9 sm:pt-10">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                                      <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${isCurrentUserDisplayName(r.display_name) ? getAvatarBorderFxForUser(r.display_name) : (r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_14px_gold]' : 'border-cyan-200/40')} shrink-0`} alt="p"/>
                                      <span className={`font-bold text-base sm:text-[1.2rem] leading-tight whitespace-normal break-all ${getNameClassForUser(r.display_name)}`}>{r.display_name}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      {r.rankIndex === 0 && (<span className="font-bold text-[9px] px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-400 mb-1">방어전: {r.defense_stack || 0}</span>)}
                                      <span className="font-black text-yellow-300 text-[1.15rem] sm:text-[1.5rem] tracking-tight drop-shadow-[0_0_8px_rgba(250,204,21,0.38)]">{r.regular_rp || 1000} RP</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400 mt-10 text-lg">랭커가 없습니다</div>)
                          ) : (
                            rpRankers.length > 0 ? rpRankers.filter(r => r.display_name?.includes(searchQuery)).slice(0, 10).map((r, i) => {
                              const tier = getRPTierInfo(i);
                              return (
                                <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => handleProfileClick(r.display_name)} className={`rank-card-stable w-full h-[148px] sm:h-[156px] p-3 sm:p-4 rounded-[1.3rem] sm:rounded-[1.45rem] cursor-pointer transition-all relative overflow-hidden ${seasonCardFxByTier(i)}`}>
                                  <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]">
                                    {i + 1}위
                                  </span>
                                  <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                                    <div className="flex items-center justify-center min-w-[68px] h-[46px]">
                                      {tier.icon}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between w-full px-1 gap-3 pt-9 sm:pt-10">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${isCurrentUserDisplayName(r.display_name) ? getAvatarBorderFxForUser(r.display_name) : (i < 3 ? 'border-red-500 shadow-[0_0_10px_red]' : 'border-cyan-200/40')} shrink-0`} alt="p"/>
                                      <span className={`font-bold text-base sm:text-[1.2rem] leading-tight whitespace-normal break-all ${getNameClassForUser(r.display_name)}`}>{r.display_name}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      {(r.win_streak || 0) >= 2 && <span className="font-bold text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">🔥 {r.win_streak} 연승</span>}
                                      <span className="font-black text-fuchsia-400 text-[1.15rem] sm:text-[1.5rem]">{r.rp || 1000} SP</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400 mt-10 text-lg">데이터가 없습니다.</div>)
                          )}
                      </div>

                      <div className="relative px-2 mt-4 shrink-0">
                        <Search className="absolute left-6 top-4 text-slate-500" size={20}/>
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색..." className="w-full bg-white/5 border border-white/10 pl-14 pr-8 py-4 rounded-full text-base font-bold outline-none focus:border-cyan-400 text-white select-text"/>
                      </div>
                  </div>
               </section>
            </div>
          </main>
        )}

        {activeMenu === 'shop' && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
              <h2 onMouseEnter={() => playSFX('hover')} className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-fuchsia-400 tracking-widest flex items-center gap-3">
                <ShoppingBag size={36} className="text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]" />
                상점 (Galaxy Shop)
              </h2>

              <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400/70 rounded-[2rem] p-4 sm:p-6 shadow-[0_0_24px_rgba(34,211,238,0.28)]">
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base">
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold">
                      보유 GC: {profile?.gc || 0}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold">
                      닉네임: {SHOP_ITEMS.find((item) => item.id === equippedItems.nameColor)?.name || '기본 화이트'}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 font-bold">
                      폰트: {SHOP_ITEMS.find((item) => item.id === equippedItems.nameStyle)?.name || '기본 폰트'}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-300 font-bold">
                      테두리: {SHOP_ITEMS.find((item) => item.id === equippedItems.borderFx)?.name || '기본 링'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold">
                    구매 또는 장착하면 바로 UI에 적용됩니다.
                  </p>
                </div>
              </section>

              {(['nameColor', 'nameStyle', 'borderFx'] as CosmeticCategory[]).map((category) => {
                const sectionTitle =
                  category === 'nameColor'
                    ? '닉네임 컬러'
                    : category === 'nameStyle'
                      ? '닉네임 폰트'
                      : '프로필 테두리 이펙트';
                const sectionDesc =
                  category === 'nameColor'
                    ? '닉네임 색상을 변경해 전장 존재감을 높이세요.'
                    : category === 'nameStyle'
                      ? '닉네임 전용 폰트를 장착해 개성을 강조하세요.'
                      : '아바타 주변 글로우/테두리로 티어 감성을 강조하세요.';
                const items = SHOP_ITEMS.filter((item) => item.category === category);

                return (
                  <section key={category} className="bg-black/45 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 flex items-center gap-2">
                          <Palette size={22} className="text-cyan-300" />
                          {sectionTitle}
                        </h3>
                        <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">{sectionDesc}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                      {items.map((item) => {
                        const owned = isOwnedItem(item.id);
                        const equipped =
                          item.category === 'nameColor'
                            ? equippedItems.nameColor === item.id
                            : item.category === 'nameStyle'
                              ? equippedItems.nameStyle === item.id
                              : equippedItems.borderFx === item.id;

                        return (
                          <div
                            key={item.id}
                            onMouseEnter={() => playSFX('hover')}
                            className={`rounded-[1.3rem] border p-4 sm:p-5 bg-black/60 transition-all ${
                              equipped ? 'border-cyan-400/70 shadow-[0_0_18px_rgba(34,211,238,0.3)]' : 'border-white/10'
                            }`}
                          >
                            <div className="h-20 sm:h-24 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-3 sm:mb-4">
                              {item.category === 'nameColor' ? (
                                <span className={`text-4xl sm:text-5xl font-black ${item.accentClass}`}>닉</span>
                              ) : item.category === 'nameStyle' ? (
                                <span className={`text-3xl sm:text-4xl font-black ${item.accentClass} ${nameStyleClassMap[item.id] || ''}`}>Aa</span>
                              ) : (
                                <span
                                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${
                                    borderFxClassMap[item.id] || 'border-white/20'
                                  }`}
                                ></span>
                              )}
                            </div>
                            <h4 className="text-base sm:text-lg font-black text-white">{item.name}</h4>
                            <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1 min-h-[32px]">{item.description}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className={`text-sm sm:text-base font-black ${item.cost === 0 ? 'text-slate-300' : 'text-yellow-300'}`}>
                                {item.cost === 0 ? '기본 지급' : `${item.cost} GC`}
                              </span>
                              <button
                                onClick={() => handlePurchaseOrEquip(item)}
                                disabled={equipped}
                                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                  equipped
                                    ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 cursor-default'
                                    : owned
                                      ? 'bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500 hover:text-white'
                                      : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500 hover:text-black'
                                }`}
                              >
                                {equipped ? '장착 중' : owned ? '장착하기' : '구매하기'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </main>
        )}

        {activeMenu === 'ranking' && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto flex flex-col h-full relative">
               
               <div className="flex flex-col items-center justify-center gap-4 mb-12">
                  <Trophy className="text-yellow-400 drop-shadow-[0_0_30px_gold]" size={80}/>
                  <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                    은하단 랭킹
                  </h2>
               </div>

               <div className="flex justify-center gap-6 mb-12">
                  <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMainRankTab('free'); }} className={`px-16 py-5 rounded-full font-black text-2xl transition-all border-4 cursor-pointer ${mainRankTab === 'free' ? 'bg-pink-600/20 text-pink-400 border-pink-500 shadow-[0_0_30px_pink] scale-105' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-pink-500/50'}`}>⚔️ 정규 랭킹</button>
                  <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMainRankTab('random'); }} className={`px-16 py-5 rounded-full font-black text-2xl transition-all border-4 cursor-pointer ${mainRankTab === 'random' ? 'bg-cyan-600/20 text-cyan-400 border-cyan-400 shadow-[0_0_30px_cyan] scale-105' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🎲 시즌 랭킹</button>
               </div>

               {mainRankTab === 'free' ? (
                 <>
                   <div className="flex justify-end mb-8 max-w-7xl mx-auto w-full px-4">
                     <div className="relative w-96">
                       <Search className="absolute left-6 top-4.5 text-slate-500" size={24}/>
                       <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-16 pr-8 py-5 rounded-full text-lg font-bold outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                     </div>
                   </div>

                   <div className="grid grid-cols-12 gap-10 pb-20 justify-center px-4 grid-glow-fix">
                       {rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).map((r) => {
                            const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                           const idx = r.rankIndex;

                           const regularPyramidPattern = [
                             "col-span-12 flex justify-center",
                             "col-span-6", "col-span-6",
                             "col-span-4", "col-span-4", "col-span-4",
                             "col-span-3", "col-span-3", "col-span-3", "col-span-3",
                             "col-span-4", "col-span-4", "col-span-4",
                             "col-span-6", "col-span-6",
                           ];

                           let spanClass = regularPyramidPattern[idx] || "col-span-3";
                           let cardClass = "h-[172px] p-5 pt-9 pb-5 rounded-[1.3rem]";
                           let badgeClass = "px-7 py-2 text-[15px] -top-5";
                           let avatarClass = "w-14 h-14";
                           let nameSize = "text-lg";
                           let statSize = "text-xl";

                           if (idx === 0) {
                             spanClass = "col-span-12 flex justify-center";
                             cardClass = "w-full max-w-5xl p-12 pt-16 pb-12 rounded-[3.5rem] shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:shadow-[0_0_50px_rgba(250,204,21,0.7)] hover:scale-[1.03]";
                             badgeClass = "px-12 py-4 text-[26px] -top-10";
                             avatarClass = "w-32 h-32";
                             statSize = "text-5xl";
                             nameSize = "text-5xl";
                           } else if (idx <= 2) {
                             spanClass = "col-span-6";
                             cardClass = "p-8 pt-12 pb-8 rounded-[2rem]";
                             badgeClass = "px-10 py-3 text-[20px] -top-7";
                             avatarClass = "w-20 h-20";
                             statSize = "text-3xl";
                             nameSize = "text-2xl";
                           } else if (idx <= 5) {
                             spanClass = "col-span-4";
                             cardClass = "h-[178px] p-6 pt-10 pb-6 rounded-[1.6rem]";
                             badgeClass = "px-8 py-2.5 text-[18px] -top-6";
                             avatarClass = "w-16 h-16";
                             statSize = "text-2xl";
                             nameSize = "text-xl";
                           } else if (idx <= 9) {
                             spanClass = "col-span-3";
                           } else if (idx <= 15) {
                             spanClass = regularPyramidPattern[idx] || "col-span-4";
                             cardClass = "h-[168px] p-5 pt-9 pb-5 rounded-[1.2rem]";
                           }

                           return (
                             <div key={r.id} className={spanClass}>
                                <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`${cardClass} transition-all cursor-pointer group relative flex flex-col justify-center items-center ${rankCardFxByTier(r.rankIndex)} hover:brightness-110 mt-10`}>
                                   {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}

                                   <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] z-20">
                                     {r.rankIndex + 1}위
                                   </span>
                                   <div className="absolute w-full flex justify-center z-20 pointer-events-none" style={{top: 0}}>
                                      <div className={`${badgeClass} absolute flex items-center justify-center`}>
                                        {grandRank.icon}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full mt-8 px-2 relative z-10 gap-4">
                                      <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
                                        <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_20px_gold]' : 'border-white/20'} shrink-0`} alt="p"/>
                                        <span className={`group-hover:text-cyan-400 font-bold text-white truncate ${nameSize}`}>{r.display_name}</span>
                                     </div>
                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                        {(r.defense_stack || 0) > 0 && (<span className="font-bold text-xs px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/40 mb-1">방어전: {r.defense_stack}</span>)}
                                        <span className={`font-black text-yellow-300 tracking-tight ${statSize}`}>{r.regular_rp || 1000} RP</span>
                                      </div>
                                    </div>
                                </div>
                             </div>
                           );
                        }) : (<div className="col-span-12 flex items-center justify-center h-[300px] opacity-50 text-2xl font-bold text-cyan-400 tracking-widest">해당하는 랭커가 없습니다.</div>)}
                   </div>
                 </>
               ) : (
                 <>
                   <div className="flex justify-end mb-8 max-w-7xl mx-auto w-full px-4 mt-8">
                     <div className="relative w-96">
                       <Search className="absolute left-6 top-4.5 text-slate-500" size={24}/>
                       <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-16 pr-8 py-5 rounded-full text-lg font-bold outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-12 gap-10 pb-20 justify-center px-4 grid-glow-fix">
                      {rpRankers.length > 0 ? rpRankers.filter(r => r.display_name?.includes(searchQuery)).map((r, i) => {
                           const tier = getRPTierInfo(i);
                           const isRank1 = i === 0;
                           const isRank2_3 = i === 1 || i === 2;
                           const isRank4_6 = i >= 3 && i <= 5;
                           
                           let spanClass = "col-span-6";
                           let cardClass = "p-8 pt-12 pb-8 rounded-[2rem]";
                           let badgeClass = "px-10 py-3 text-[18px] -top-7";
                           let avatarClass = "w-20 h-20";
                           let nameSize = i === 0 ? 'text-4xl' : 'text-2xl';
                           let statSize = "text-3xl";

                           if (isRank1) { spanClass = "col-span-12 flex justify-center"; cardClass = "w-full max-w-5xl p-12 pt-16 pb-12 rounded-[3.5rem] shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_50px_rgba(239,68,68,0.7)] hover:scale-[1.03]"; badgeClass = "px-12 py-4 text-[24px] -top-10"; avatarClass = "w-32 h-32"; statSize = "text-5xl"; nameSize = 'text-5xl'; }
                           else if (isRank2_3) { spanClass = "col-span-6"; }
                           else if (isRank4_6) { spanClass = "col-span-4"; cardClass = "p-6 pt-10 pb-6 rounded-[1.5rem]"; badgeClass = "px-8 py-2.5 text-[16px] -top-6"; avatarClass = "w-16 h-16"; statSize = "text-2xl"; nameSize = 'text-xl'; }
                           else { spanClass = "col-span-3"; cardClass = "p-5 pt-8 pb-5 rounded-xl"; badgeClass = "px-6 py-2 text-[14px] -top-5"; avatarClass = "w-14 h-14"; statSize = "text-xl"; nameSize = 'text-lg'; }

                           return (
                             <div key={r.id} className={spanClass}>
                                <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`${cardClass} transition-all cursor-pointer group relative flex flex-col justify-center items-center ${seasonCardFxByTier(i)} hover:brightness-110 mt-10`}>
                                   {i === 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}
                                   
                                   <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] z-20">
                                     {i + 1}위
                                   </span>
                                   <div className="absolute w-full flex justify-center z-20 pointer-events-none" style={{top: 0}}>
                                      <div className={`${badgeClass} absolute flex items-center justify-center`}>
                                        {tier.icon}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full mt-8 px-2 relative z-10 gap-4">
                                      <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
                                        <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${i < 3 ? 'border-red-500 shadow-[0_0_20px_red]' : 'border-white/20'} shrink-0`} alt="p"/>
                                        <span className={`group-hover:text-cyan-400 font-bold text-white truncate ${nameSize}`}>{r.display_name}</span>
                                      </div>
                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                       <span className={`font-black text-fuchsia-400 tracking-tight ${statSize}`}>{r.rp || 1000} SP</span>
                                       {(r.win_streak || 0) >= 2 && (<span className="font-bold text-base px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mt-2 shadow-[0_0_10px_emerald]">🔥 {r.win_streak} 연승</span>)}
                                     </div>
                                   </div>
                                </div>
                             </div>
                           );
                        }) : (<div className="col-span-12 flex items-center justify-center h-[300px] opacity-50 text-2xl font-bold text-cyan-400 tracking-widest">데이터가 없습니다.</div>)}
                   </div>
                 </>
               )}
            </div>
          </main>
        )}

        {activeMenu === 'profile' && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 onMouseEnter={() => playSFX('hover')} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-10 text-left drop-shadow-[0_0_10px_cyan]">내 정보 (Profile)</h2>
            <div className="max-w-5xl space-y-5">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => { playSFX('click'); setMyProfileTab('overview'); }}
                  className={`px-5 sm:px-7 py-2.5 rounded-full text-sm sm:text-base font-bold border transition-all cursor-pointer ${
                    myProfileTab === 'overview'
                      ? 'bg-cyan-500/25 border-cyan-400/70 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.38)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  기본 정보
                </button>
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => { playSFX('click'); setMyProfileTab('items'); }}
                  className={`px-5 sm:px-7 py-2.5 rounded-full text-sm sm:text-base font-bold border transition-all cursor-pointer ${
                    myProfileTab === 'items'
                      ? 'bg-fuchsia-500/25 border-fuchsia-400/70 text-fuchsia-300 shadow-[0_0_14px_rgba(232,121,249,0.38)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  구매 아이템
                </button>
              </div>

              {myProfileTab === 'overview' ? (
                <div onMouseEnter={() => playSFX('hover')} className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 cursor-default">
                  <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className={`w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full border-4 shrink-0 ${equippedBorderFxClass}`} alt="profile"/>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className={`italic uppercase mb-2 font-black text-3xl sm:text-4xl lg:text-5xl truncate ${equippedNameClass}`}>{currentUserName || "GUEST PILOT"}</h3>
                    <p className="text-cyan-400 font-bold text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 lg:mb-10 tracking-widest truncate">{user?.email || "로그인이 필요합니다"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-8">
                      <div className="bg-white/5 p-5 sm:p-6 lg:p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 tracking-widest font-bold">TOTAL WINS</p><p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">{profile?.wins || 0}</p></div>
                      <div className="bg-white/5 p-5 sm:p-6 lg:p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 tracking-widest font-bold">SEASON POINTS</p><p className="text-3xl sm:text-4xl lg:text-5xl font-black text-fuchsia-400">{profile?.rp || 1000}</p></div>
                      <div className="bg-white/5 p-5 sm:p-6 lg:p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 tracking-widest font-bold">GALAXY CREDITS</p><p className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-400">{profile?.gc || 0}</p></div>
                    </div>
                  </div>
                </div>
              ) : (
                <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400/70 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 shadow-[0_0_22px_rgba(34,211,238,0.24)]">
                  <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400 mb-2">
                    내가 구매한 아이템
                  </h3>
                  <p className="text-slate-400 text-sm font-bold mb-4 sm:mb-6">
                    장착 버튼을 누르면 즉시 전체 UI에 반영됩니다.
                  </p>

                  {(['nameColor', 'nameStyle', 'borderFx'] as CosmeticCategory[]).map((category) => {
                    const ownedItems = SHOP_ITEMS.filter((item) => item.category === category && isOwnedItem(item.id));
                    return (
                      <div key={category} className="mb-5 sm:mb-6 last:mb-0">
                        <h4 className="text-base sm:text-lg font-black text-cyan-300 mb-3">
                          {category === 'nameColor' ? '닉네임 컬러' : category === 'nameStyle' ? '닉네임 폰트' : '프로필 테두리 이펙트'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {ownedItems.map((item) => {
                            const equipped =
                              item.category === 'nameColor'
                                ? equippedItems.nameColor === item.id
                                : item.category === 'nameStyle'
                                  ? equippedItems.nameStyle === item.id
                                  : equippedItems.borderFx === item.id;
                            return (
                              <div key={item.id} className={`rounded-2xl border p-4 bg-black/55 ${equipped ? 'border-cyan-400/70 shadow-[0_0_14px_rgba(34,211,238,0.25)]' : 'border-white/10'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                  {item.category === 'nameColor' ? (
                                    <span className={`text-3xl font-black ${item.accentClass}`}>닉</span>
                                  ) : item.category === 'nameStyle' ? (
                                    <span className={`text-2xl font-black ${item.accentClass} ${nameStyleClassMap[item.id] || ''}`}>Aa</span>
                                  ) : (
                                    <span className={`w-10 h-10 rounded-full border-2 ${borderFxClassMap[item.id] || 'border-white/20'}`}></span>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-white font-bold truncate">{item.name}</p>
                                    <p className="text-xs text-slate-400 font-bold truncate">{item.description}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handlePurchaseOrEquip(item)}
                                  disabled={equipped}
                                  className={`w-full mt-2 py-2 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                                    equipped
                                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 cursor-default'
                                      : 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-300 hover:bg-fuchsia-500 hover:text-white'
                                  }`}
                                >
                                  {equipped ? '장착 중' : '장착하기'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          </main>
        )}

        {activeMenu === 'settings' && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 onMouseEnter={() => playSFX('hover')} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 uppercase tracking-widest mb-10 text-left flex items-center gap-4 drop-shadow-[0_0_10px_white]">
              <Settings size={40} className="text-slate-400"/> 환경 설정 (Settings)
            </h2>
            <div className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-16 max-w-4xl space-y-12">
              <div className="flex items-center gap-10 border-b border-white/10 pb-12 cursor-default">
                <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-32 h-32 rounded-full border-4 border-cyan-400 shadow-[0_0_20px_cyan]" alt="profile"/>
                <div onMouseEnter={() => playSFX('hover')} className="flex-1 min-w-0">
                  <h3 className={`italic uppercase font-black text-4xl text-white truncate mb-2`}>{currentUserName || "GUEST PILOT"}</h3>
                  <p className="text-cyan-400 font-bold tracking-widest text-lg truncate">{user?.email || "디스코드 로그인이 필요합니다"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-10">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h4 onMouseEnter={() => playSFX('hover')} className="text-2xl font-bold text-white tracking-widest cursor-default">배경음악 (BGM)</h4>
                    <div onMouseEnter={() => playSFX('hover')} onClick={() => { setBgmEnabled(!bgmEnabled); playSFX('click'); }} className={`w-16 h-8 rounded-full relative cursor-pointer transition-all ${bgmEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${bgmEnabled ? 'right-1' : 'left-1'}`}></div></div>
                  </div>
                  <p className="text-base text-slate-400 font-bold mb-6">로비 및 대기 화면의 배경음악을 재생합니다.</p>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-slate-500">0</span>
                    <input onMouseEnter={() => playSFX('hover')} type="range" min="0" max="1" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-3 rounded-lg cursor-pointer volume-slider" disabled={!bgmEnabled}/>
                    <span className="text-sm font-bold text-cyan-400 w-10 text-right">{Math.round(bgmVolume * 100)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-10">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h4 onMouseEnter={() => playSFX('hover')} className="text-2xl font-bold text-white tracking-widest cursor-default">효과음 (SFX)</h4>
                    <div onMouseEnter={() => playSFX('hover')} onClick={() => { setSfxEnabled(!sfxEnabled); playSFX('click'); }} className={`w-16 h-8 rounded-full relative cursor-pointer transition-all ${sfxEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${sfxEnabled ? 'right-1' : 'left-1'}`}></div></div>
                  </div>
                  <p className="text-base text-slate-400 font-bold mb-6">버튼 클릭 및 매칭 시 효과음을 재생합니다.</p>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-slate-500">0</span>
                    <input onMouseEnter={() => playSFX('hover')} type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-3 rounded-lg cursor-pointer volume-slider" disabled={!sfxEnabled}/>
                    <span className="text-sm font-bold text-cyan-400 w-10 text-right">{Math.round(sfxVolume * 100)}</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300 cursor-pointer" onClick={() => { setSelectedPlayer(null); playSFX('click'); }}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-3xl rounded-[2rem] sm:rounded-[3rem] lg:rounded-[4rem] p-4 sm:p-8 lg:p-12 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => { setSelectedPlayer(null); playSFX('click'); }} className="absolute top-4 sm:top-8 lg:top-10 right-4 sm:right-8 lg:right-10 text-slate-500 hover:text-white cursor-pointer">
               <X size={32}/>
             </button>
              
             <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 lg:gap-10 mb-6 sm:mb-8 mt-2">
                <img src={selectedPlayer.avatar_url} className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3rem] border-4 ${isCurrentUserDisplayName(selectedPlayer.display_name) ? equippedBorderFxClass : (selectedPlayer.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_20px_gold]' : 'border-cyan-400 shadow-[0_0_20px_cyan]')} shrink-0`} alt="p" />
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex flex-col items-center sm:items-start gap-2 pb-2 min-w-0">
                      <h2 className={`italic font-black text-3xl sm:text-4xl lg:text-5xl truncate ${getNameClassForUser(selectedPlayer.display_name)}`}>{selectedPlayer.display_name}</h2>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${selectedPlayerRegularInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                          {selectedPlayerRegularInfo?.icon}
                          정규랭킹 {selectedPlayerRegularLabel}
                        </span>
                        <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${selectedPlayerSeasonInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                           <span>{selectedPlayerSeasonInfo?.icon || '🪐'}</span>
                           시즌랭킹 {selectedPlayerSeasonInfo ? `${selectedPlayerSeasonInfo.name} ${selectedPlayerSeasonInfo.index + 1}위` : '미집계'}
                        </span>
                      </div>
                    </div>
                 </div>
             </div>

             <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 justify-center">
                <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setProfileTab('overview'); }} className={`px-5 sm:px-8 lg:px-10 py-2.5 sm:py-3.5 rounded-full font-bold text-sm sm:text-base lg:text-lg transition-all cursor-pointer ${profileTab === 'overview' ? 'bg-cyan-500 text-black shadow-[0_0_20px_cyan]' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                  요약 정보
                </button>
                <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setProfileTab('details'); }} className={`px-5 sm:px-8 lg:px-10 py-2.5 sm:py-3.5 rounded-full font-bold text-sm sm:text-base lg:text-lg transition-all cursor-pointer ${profileTab === 'details' ? 'bg-pink-500 text-white shadow-[0_0_20px_pink] border border-pink-500' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                  상세 전적 (모스트)
                </button>
             </div>

              <div className="min-h-[250px]">
                 {profileTab === 'overview' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-400 mb-2">RECORD (W/L)</p>
                          <p className="text-3xl font-black text-white">{selectedPlayer.wins}승 {selectedPlayer.losses}패</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-400 mb-2">WIN RATE</p>
                          <p className="text-3xl font-black text-pink-400">{selectedPlayer.win_rate || "0.0%"}</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-400 mb-2">RANK POINTS</p>
                          <p className="text-3xl font-black text-fuchsia-400">{selectedPlayer.rp || 1000}</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center col-span-1">
                          <p className="text-xs font-bold text-slate-400 mb-2">GALAXY CREDITS</p>
                          <p className="text-3xl font-black text-emerald-400">{selectedPlayer.gc || 0}</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-400 mb-2">FAVORITE LEGEND</p>
                          <p className="text-xl font-bold text-cyan-400 truncate px-2">{favLegend}</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-400 mb-2">FAVORITE WEAPON</p>
                          <p className="text-xl font-bold text-cyan-400 truncate px-2">{favWeapon}</p>
                        </div>
                     </div>
                 ) : (
                     <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 h-auto lg:h-[250px] overflow-hidden mb-6">
                         <div className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] p-5 flex flex-col">
                             <h4 className="text-cyan-400 font-bold text-base mb-4 text-center tracking-widest border-b border-white/10 pb-3">LEGEND 승률</h4>
                             <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3">
                                {legendStatsArray.map(l => (
                                    <div key={l.name} onMouseEnter={() => playSFX('hover')} className="bg-black/40 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                                        <span className="text-white font-bold text-base truncate max-w-[150px]">{l.name}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-slate-400 text-xs">{l.wins}승 {l.matches - l.wins}패</span>
                                            <span className="text-cyan-400 font-bold text-lg w-12 text-right">{(l.wr * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {legendStatsArray.length === 0 && <p className="text-slate-500 text-sm text-center mt-12">데이터가 없습니다.</p>}
                             </div>
                         </div>
                         <div className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] p-5 flex flex-col">
                             <h4 className="text-pink-400 font-bold text-base mb-4 text-center tracking-widest border-b border-white/10 pb-3">WEAPON 승률</h4>
                             <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-3">
                                {/* 🌟 V4.6 오타 완벽 수정됨 (l.wins -> w.wins) */}
                                {weaponStatsArray.map(w => (
                                    <div key={w.name} onMouseEnter={() => playSFX('hover')} className="bg-black/40 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                                        <span className="text-white font-bold text-base flex-1 truncate pr-3">{w.name}</span>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <span className="text-slate-400 text-xs">{w.wins}승 {w.matches - w.wins}패</span>
                                            <span className="text-pink-400 font-bold text-lg w-12 text-right">{(w.wr * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {weaponStatsArray.length === 0 && <p className="text-slate-500 text-sm text-center mt-12">데이터가 없습니다.</p>}
                             </div>
                         </div>
                     </div>
                 )}
             </div>

             <button 
               onMouseEnter={() => playSFX('hover')} 
               onClick={() => copyPlayerName(selectedPlayer.display_name)} 
               className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border-2 border-cyan-400/50 text-cyan-400 py-4 sm:py-6 rounded-[1.4rem] sm:rounded-[2rem] font-bold text-lg sm:text-2xl flex items-center justify-center gap-3 sm:gap-4 active:scale-95 shadow-lg cursor-pointer transition-all mt-4"
              >
               {copyStatus ? <Check size={24}/> : <Copy size={24}/>}
               {copyStatus ? 'NICKNAME COPIED & READY!' : `COPY NICKNAME & BATTLE`}
             </button>
             
             {profileTab === 'details' && (
               <p className="text-center text-xs text-slate-500 mt-4 font-bold">
                 * 전적 통계는 모든 경기(승/패)를 기준으로 집계됩니다.
               </p>
             )}
          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;

