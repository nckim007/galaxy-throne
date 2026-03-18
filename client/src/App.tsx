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
import discordCustomIcon from './assets/discord-custom.svg';
import { ALL_LEGENDS, ALL_WEAPONS, LEGEND_CATEGORIES, WEAPON_CATEGORIES, getLegendCategoryColorHex, getWeaponCategoryColorHex } from './config/gameMeta';
import { getAvatarFallback, getResponsiveNameClass } from './utils/profile';
import { applyAudioSettings, playSFX, setMatchPhaseAudio } from './lib/audioManager';
const BASE_MENU_ITEMS = [
  { id: 'home', icon: Home, label: '대시보드' },
  { id: 'shop', icon: ShoppingBag, label: '상점' },
  { id: 'ranking', icon: Trophy, label: '명예의 전당' },
  { id: 'settings', icon: Settings, label: '환경 설정' }
];
const MASTER_MENU_ITEM = { id: 'master', icon: Shield, label: '마스터' };
// fallback only: real authority should be controlled by profiles.is_master
const MASTER_ACCOUNT_EMAILS = ['hdtop410@naver.com'];
const DEFAULT_DISCORD_INVITE_URL = 'https://discord.com/channels/146930111478890496/1469829921630064721';

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
type EventShopItem = {
  id: string;
  name: string;
  cost: number;
  image: string;
};

type RegularChallengeMode = 'free';
type SeasonChallengeMode = 'random' | 'season_free' | 'season_watson_melee' | 'season_vantage_sniper' | 'season_wraith_knife';
type ChallengeMode = RegularChallengeMode | SeasonChallengeMode;
type IngamePlatform = 'steam' | 'ea';
type WinTarget = 3 | 5 | 11 | 21;

type IncomingChallengeRequest = {
  id: string;
  challengerName: string;
  mode: ChallengeMode;
  betGc: number;
};

type RewardChestReason = 'first_daily_random' | 'every_three_random';
type PendingRewardChest = {
  id: string;
  reason: RewardChestReason;
  sourceMatchId: string;
  createdAt: string;
};
type RandomRewardState = {
  version: 1;
  seeded: boolean;
  lastFirstDailyDate: string;
  postFirstMatchCount: number;
  processedMatchIds: string[];
  pendingChests: PendingRewardChest[];
};

const SHOP_ITEMS: ShopItem[] = [
  { id: 'name_default', category: 'nameColor', name: '기본 화이트', description: '클래식 화이트 닉네임', cost: 0, preview: 'A', accentClass: 'text-white' },
  { id: 'name_cyan', category: 'nameColor', name: '네온 시안', description: '시원한 시안 계열 닉네임', cost: 1500, preview: 'A', accentClass: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]' },
  { id: 'name_magenta', category: 'nameColor', name: '마젠타 펄스', description: '강렬한 마젠타 계열 닉네임', cost: 1500, preview: 'A', accentClass: 'text-fuchsia-300 drop-shadow-[0_0_10px_rgba(232,121,249,0.65)]' },
  { id: 'name_gold', category: 'nameColor', name: '솔라 골드', description: '왕좌 느낌 골드 닉네임', cost: 1500, preview: 'A', accentClass: 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)]' },
  { id: 'name_emerald', category: 'nameColor', name: '에메랄드 노바', description: '선명한 에메랄드 닉네임', cost: 1500, preview: 'A', accentClass: 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]' },
  { id: 'name_royal', category: 'nameColor', name: '로열 바이올렛', description: '보랏빛 고급 닉네임', cost: 1500, preview: 'A', accentClass: 'text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.65)]' },
  { id: 'name_grad_solar', category: 'nameColor', name: '솔라 스펙트럼', description: '금빛-핑크 그라데이션 닉네임', cost: 7600, preview: 'A', accentClass: 'bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]' },
  { id: 'name_grad_nebula', category: 'nameColor', name: '네뷸라 플로우', description: '시안-보라 성운 그라데이션 닉네임', cost: 7600, preview: 'A', accentClass: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]' },
  { id: 'name_grad_eclipse', category: 'nameColor', name: '이클립스 블러드', description: '붉은-보라 하이엔드 그라데이션 닉네임', cost: 7600, preview: 'A', accentClass: 'bg-gradient-to-r from-red-400 via-fuchsia-400 to-indigo-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]' },

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
  { id: 'border_grad_prism', category: 'borderFx', name: '프리즘 레일', description: '시안-바이올렛 듀얼 링 이펙트', cost: 8300, preview: '◎', accentClass: 'text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.82)]' },
  { id: 'border_grad_crown', category: 'borderFx', name: '크라운 아크', description: '골드-핑크 왕좌 그라데이션 링', cost: 8300, preview: '◎', accentClass: 'text-yellow-200 drop-shadow-[0_0_18px_rgba(250,204,21,0.82)]' },
  { id: 'border_grad_abyss', category: 'borderFx', name: '어비스 코일', description: '로즈-바이올렛 심연 링 이펙트', cost: 8300, preview: '◎', accentClass: 'text-rose-200 drop-shadow-[0_0_18px_rgba(244,63,94,0.76)]' },
];

const buildEventItemImage = (emoji: string, bgA: string, bgB: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='${bgA}'/>
          <stop offset='100%' stop-color='${bgB}'/>
        </linearGradient>
      </defs>
      <rect width='320' height='180' rx='24' fill='url(#g)'/>
      <circle cx='66' cy='90' r='42' fill='rgba(255,255,255,0.15)'/>
      <text x='66' y='104' font-size='56' text-anchor='middle'>${emoji}</text>
      <text x='132' y='82' font-size='25' font-weight='900' fill='white'>EVENT</text>
      <text x='132' y='116' font-size='22' font-weight='700' fill='white'>${label}</text>
    </svg>`
  )}`;

const EVENT_SHOP_ITEMS: EventShopItem[] = [
  {
    id: 'event_burger_set',
    name: '햄버거 세트',
    cost: 50000,
    image: buildEventItemImage('🍔', '#0f172a', '#0ea5e9', 'Burger Set'),
  },
  {
    id: 'event_chicken',
    name: '치킨',
    cost: 100000,
    image: buildEventItemImage('🍗', '#3f1d2e', '#fb7185', 'Chicken'),
  },
  {
    id: 'event_gift_30000',
    name: '3만원 상품권',
    cost: 150000,
    image: buildEventItemImage('🎁', '#312e81', '#a855f7', 'Gift Card'),
  },
];

const SEASON_MODE_MENU: { mode: SeasonChallengeMode; label: string; description: string }[] = [
  { mode: 'random', label: '랜덤 대전', description: '레전드/무기 랜덤 선택' },
  { mode: 'season_free', label: '자유 대전', description: '레전드/무기 자유 선택' },
  { mode: 'season_watson_melee', label: '왓슨 근접전', description: '왓슨 고정 · 무기 없음' },
  { mode: 'season_vantage_sniper', label: '벤티지 스나이퍼전', description: '벤티지 · 크레이버/센티넬 고정' },
  { mode: 'season_wraith_knife', label: '레이스 투척 나이프전', description: '레이스 · 투척 나이프 고정' },
];

const KNOWN_CHALLENGE_MODES: ChallengeMode[] = ['free', 'random', 'season_free', 'season_watson_melee', 'season_vantage_sniper', 'season_wraith_knife'];
const WIN_TARGET_OPTIONS: WinTarget[] = [3, 5, 11, 21];
type MasterUiPrefs = {
  headerTitle: string;
  seasonTitle: string;
  titleScalePercent: number;
  showDiscordEntry: boolean;
  discordInviteUrl: string;
  discordButtonTopPx: number;
  discordButtonLeftPx: number;
  showSeasonTitle: boolean;
  headerBadges: string[];
  homeGapPx: number;
  homeTopOffsetPx: number;
  showOnlineBoard: boolean;
  showMatchBoard: boolean;
  showRecentBoard: boolean;
  showRankingBoard: boolean;
};
const MASTER_UI_PREFS_KEY = 'gt_master_ui_prefs_v1';
const DEFAULT_MASTER_UI_PREFS: MasterUiPrefs = {
  headerTitle: '은하단',
  seasonTitle: '별들의 전쟁 : 시즌 1',
  titleScalePercent: 100,
  showDiscordEntry: true,
  discordInviteUrl: DEFAULT_DISCORD_INVITE_URL,
  discordButtonTopPx: -4,
  discordButtonLeftPx: 12,
  showSeasonTitle: true,
  headerBadges: [],
  homeGapPx: 24,
  homeTopOffsetPx: 0,
  showOnlineBoard: true,
  showMatchBoard: true,
  showRecentBoard: true,
  showRankingBoard: true,
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('home');
  
  const [entryMode, setEntryMode] = useState<ChallengeMode>('free');
  const [seasonSubMode, setSeasonSubMode] = useState<SeasonChallengeMode>('random');
  const [entryOpponent, setEntryOpponent] = useState('');
  const [showRecentOpponentsDropdown, setShowRecentOpponentsDropdown] = useState(false);
  const [entryLegend, setEntryLegend] = useState('');
  const [entryWeapons, setEntryWeapons] = useState<string[]>(['', '']);
  const [betAmount, setBetAmount] = useState<number>(0); 
  const [rerollCount, setRerollCount] = useState<number>(0); 

  const [matchPhase, setMatchPhase] = useState<'idle' | 'waiting_sync' | 'scoring'>('idle');
  const [activeMatch, setActiveMatch] = useState<{ id: string, mode: string, opponent: string, legend: string, weapons: string[], oppLegend?: string, oppWeapons?: string[], isChallenger: boolean } | null>(null);
  
  const [myWins, setMyWins] = useState<number | null>(null);
  const [myLosses, setMyLosses] = useState<number | null>(null);
  const [winTarget, setWinTarget] = useState<WinTarget>(3);
  const [waitingForScore, setWaitingForScore] = useState(false);
  const [homeRankingHeight, setHomeRankingHeight] = useState<number | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]); 
  const [rankers, setRankers] = useState<any[]>([]); 
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [discordOnlineUsers, setDiscordOnlineUsers] = useState<Set<string>>(new Set());
  const [miniSearchQuery, setMiniSearchQuery] = useState('');
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'details'>('overview');
  const [myProfileTab, setMyProfileTab] = useState<'overview' | 'items'>('overview');
  const [copyStatus, setCopyStatus] = useState(false);
  const [ingameNicknameDraft, setIngameNicknameDraft] = useState('');
  const [ingamePlatformDraft, setIngamePlatformDraft] = useState<IngamePlatform>('steam');
  const [savingIngameProfile, setSavingIngameProfile] = useState(false);
  const [showIngameSetupModal, setShowIngameSetupModal] = useState(false);
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(['name_default', 'style_default', 'border_default']);
  const [equippedItems, setEquippedItems] = useState<{ nameColor: string; nameStyle: string; borderFx: string }>({
    nameColor: 'name_default',
    nameStyle: 'style_default',
    borderFx: 'border_default',
  });
  
  const [miniRankMode, setMiniRankMode] = useState<'free' | 'random'>('free');
  const [mainRankTab, setMainRankTab] = useState<'free' | 'random'>('free');
  const [regularRankMoves, setRegularRankMoves] = useState<Record<string, number>>({});
  const [seasonRankMoves, setSeasonRankMoves] = useState<Record<string, number>>({});
  const [resultFx, setResultFx] = useState<{ type: 'win' | 'lose'; message: string } | null>(null);
  const [resultVictoryStars, setResultVictoryStars] = useState<
    { id: number; left: number; delay: number; duration: number; size: number; drift: number; hue: number; glyph: string }[]
  >([]);
  const [resultLoseTaunts, setResultLoseTaunts] = useState<
    { id: number; left: number; delay: number; duration: number; size: number; drift: number; rotate: number; label: string }[]
  >([]);
  const [resultFxTexts, setResultFxTexts] = useState<
    {
      id: number;
      left: number;
      delay: number;
      duration: number;
      size: number;
      drift: number;
      rotate: number;
      label: string;
      tone: 'win' | 'lose';
    }[]
  >([]);
  const [resultBursts, setResultBursts] = useState<
    { id: number; left: string; top: string; size: number; delay: string }[]
  >([]);
  const [statusPopup, setStatusPopup] = useState<
    { type: 'success' | 'error' | 'info' | 'victory'; title: string; message: string; autoCloseMs?: number; hideConfirm?: boolean } | null
  >(null);
  const [statusPopupFading, setStatusPopupFading] = useState(false);
  const [selectedProfileNameFontSize, setSelectedProfileNameFontSize] = useState(56);
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallengeRequest | null>(null);
  const [rewardChestQueue, setRewardChestQueue] = useState<PendingRewardChest[]>([]);
  const [activeRewardChest, setActiveRewardChest] = useState<PendingRewardChest | null>(null);
  const [rewardChestOpening, setRewardChestOpening] = useState(false);
  const [rewardChestClaiming, setRewardChestClaiming] = useState(false);
  const [rewardChestRewardGc, setRewardChestRewardGc] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollTopButtonPos, setScrollTopButtonPos] = useState<{ left: number; top: number; transform: string } | null>(null);
  const [starRainActive, setStarRainActive] = useState(false);
  const [starRainParticles, setStarRainParticles] = useState<
    { id: number; left: number; delay: number; duration: number; size: number; drift: number; kind: 'star' | 'meteor' }[]
  >([]);

  const [bgmEnabled, setBgmEnabled] = useState(localStorage.getItem('bgmEnabled') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('sfxEnabled') !== 'false');
  const [bgmVolume, setBgmVolume] = useState(parseFloat(localStorage.getItem('bgmVolume') || '0.10'));
  const [sfxVolume, setSfxVolume] = useState(parseFloat(localStorage.getItem('sfxVolume') || '0.60'));
  const [eventItemCounts, setEventItemCounts] = useState<Record<string, number>>({});
  const [ownedMetaEntries, setOwnedMetaEntries] = useState<string[]>([]);
  const [masterUiEditorOpen, setMasterUiEditorOpen] = useState(true);
  const [masterNewBadgeText, setMasterNewBadgeText] = useState('');
  const [masterDiscordUrlDraft, setMasterDiscordUrlDraft] = useState(DEFAULT_MASTER_UI_PREFS.discordInviteUrl);
  const [masterPointDrafts, setMasterPointDrafts] = useState<{ rp: string; sp: string; gp: string }>({
    rp: '100',
    sp: '100',
    gp: '100',
  });
  const [masterUiPrefs, setMasterUiPrefs] = useState<MasterUiPrefs>(() => {
    try {
      const raw = localStorage.getItem(MASTER_UI_PREFS_KEY);
      if (!raw) return DEFAULT_MASTER_UI_PREFS;
      const parsed = JSON.parse(raw);
      const parsedBadges = Array.isArray(parsed?.headerBadges)
        ? parsed.headerBadges.filter((v: unknown) => typeof v === 'string').map((v: string) => v.trim()).filter(Boolean).slice(0, 8)
        : DEFAULT_MASTER_UI_PREFS.headerBadges;
      return {
        ...DEFAULT_MASTER_UI_PREFS,
        ...parsed,
        titleScalePercent: Math.max(70, Math.min(140, Number(parsed?.titleScalePercent ?? DEFAULT_MASTER_UI_PREFS.titleScalePercent))),
        homeGapPx: Math.max(8, Math.min(48, Number(parsed?.homeGapPx ?? DEFAULT_MASTER_UI_PREFS.homeGapPx))),
        homeTopOffsetPx: Math.max(-80, Math.min(120, Number(parsed?.homeTopOffsetPx ?? DEFAULT_MASTER_UI_PREFS.homeTopOffsetPx))),
        discordInviteUrl:
          typeof parsed?.discordInviteUrl === 'string' && parsed.discordInviteUrl.trim()
            ? parsed.discordInviteUrl.trim()
            : DEFAULT_MASTER_UI_PREFS.discordInviteUrl,
        discordButtonTopPx: Math.max(-18, Math.min(28, Number(parsed?.discordButtonTopPx ?? DEFAULT_MASTER_UI_PREFS.discordButtonTopPx))),
        discordButtonLeftPx: Math.max(0, Math.min(40, Number(parsed?.discordButtonLeftPx ?? DEFAULT_MASTER_UI_PREFS.discordButtonLeftPx))),
        headerBadges: parsedBadges,
      };
    } catch {
      return DEFAULT_MASTER_UI_PREFS;
    }
  });
  const updateMasterUiPrefs = <K extends keyof MasterUiPrefs>(key: K, value: MasterUiPrefs[K]) => {
    setMasterUiPrefs((prev) => ({ ...prev, [key]: value }));
  };
  const addMasterHeaderBadge = () => {
    const next = masterNewBadgeText.trim();
    if (!next) return;
    updateMasterUiPrefs('headerBadges', [...masterUiPrefs.headerBadges, next].slice(0, 8));
    setMasterNewBadgeText('');
  };
  const updateMasterHeaderBadge = (index: number, value: string) => {
    updateMasterUiPrefs(
      'headerBadges',
      masterUiPrefs.headerBadges.map((badge, idx) => (idx === index ? value : badge))
    );
  };
  const removeMasterHeaderBadge = (index: number) => {
    updateMasterUiPrefs(
      'headerBadges',
      masterUiPrefs.headerBadges.filter((_, idx) => idx !== index)
    );
  };
  const moveMasterHeaderBadge = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= masterUiPrefs.headerBadges.length) return;
    const next = [...masterUiPrefs.headerBadges];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    updateMasterUiPrefs('headerBadges', next);
  };

  const currentUserName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const currentUserAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
  const currentUserEmail = String(user?.email || '').trim().toLowerCase();
  const hasDbMasterGrant = Boolean((profile as any)?.is_master);
  const isMasterFallback = MASTER_ACCOUNT_EMAILS.includes(currentUserEmail);
  const isMasterAccount = hasDbMasterGrant || isMasterFallback;
  const visibleMenuItems = isMasterAccount ? [...BASE_MENU_ITEMS, MASTER_MENU_ITEM] : BASE_MENU_ITEMS;
  const lastOpponentStorageKey = user?.id ? `gt_last_opponent_v1_${user.id}` : null;
  const manualLoadoutStorageKey = user?.id ? `gt_manual_loadout_v2_${user.id}` : null;
  const eventShopStorageKey = user?.id ? `gt_event_shop_v1_${user.id}` : null;
  const DISCORD_GUILD_ID = (import.meta.env.VITE_DISCORD_GUILD_ID as string | undefined)?.trim();
  const REGULAR_TICKET_COST = 200;
  const SEASON_TICKET_COST = 0;
  const REGULAR_INACTIVE_GRACE_DAYS = 3;
  const REGULAR_INACTIVE_DECAY_PER_DAY = 30;
  const calcSeasonWinReward = (opts: {
    winnerScore: number;
    isHigherRankWin: boolean;
  }) => {
    const winnerScore = Math.max(0, Math.floor(Number(opts.winnerScore || 0)));
    const extraWins = Math.max(0, winnerScore - 3);
    const higherRankBonusWins = opts.isHigherRankWin ? winnerScore : 0;
    const baseSp = 30 + extraWins * 10 + higherRankBonusWins * 10;
    const baseGc = 60 + extraWins * 20 + higherRankBonusWins * 20;
    return {
      sp: Math.round(baseSp),
      gc: Math.round(baseGc),
    };
  };
  const calcSeasonLoseReward = (opts: { loserScore: number; isHigherRankLoss: boolean }) => {
    const safeLoserScore = Math.max(0, Math.floor(Number(opts.loserScore || 0)));
    const higherRankBonusWins = opts.isHigherRankLoss ? safeLoserScore : 0;
    return {
      sp: 10 + (safeLoserScore > 0 ? safeLoserScore * 5 : 0) + higherRankBonusWins * 5,
      gc: 20 + (safeLoserScore > 0 ? safeLoserScore * 10 : 0) + higherRankBonusWins * 10,
    };
  };
  const calcRegularWinGain = (opts: { winnerScore: number; isHigherRankWin: boolean }) => {
    const winnerScore = Math.max(0, Math.floor(Number(opts.winnerScore || 0)));
    const extraWins = Math.max(0, winnerScore - 3);
    return 30 + extraWins * 10 + (opts.isHigherRankWin ? winnerScore * 10 : 0);
  };
  const calcRegularLoseDelta = (opts: { loserScore: number; winnerScore: number; isHigherRankLoss: boolean }) => {
    const loserScore = Math.max(0, Math.floor(Number(opts.loserScore || 0)));
    const winnerScore = Math.max(0, Math.floor(Number(opts.winnerScore || 0)));
    const basePenalty =
      20 +
      Math.max(0, winnerScore - 3) * 5 -
      loserScore * 5 -
      (opts.isHigherRankLoss ? 10 : 0);
    return -Math.max(0, basePenalty);
  };
  const cosmeticsStorageKey = user?.id ? `gt_cosmetics_v1_${user.id}` : null;
  const purchaseHistoryStorageKey = user?.id ? `gt_purchase_history_v1_${user.id}` : null;
  const purchaseRecoveryStorageKey = user?.id ? `gt_purchase_recovery_v1_${user.id}` : null;
  const defaultOwnedIds = ['name_default', 'style_default', 'border_default'];
  const eventOwnedPrefix = 'event_owned:';
  const legacyCompensationMarker = 'meta:legacy_shop_compensation_v1';
  const LEGACY_SHOP_COMPENSATION_GC = 12000;
  const parseEventCountsFromOwnedCosmetics = (ownedRaw: unknown): Record<string, number> => {
    const owned = Array.isArray(ownedRaw) ? (ownedRaw as string[]) : [];
    const next: Record<string, number> = {};
    owned.forEach((entry) => {
      const value = String(entry || '').trim();
      if (!value.startsWith(eventOwnedPrefix)) return;
      const [_, eventId = '', countRaw = '0'] = value.split(':');
      const count = Math.max(0, Math.floor(Number(countRaw || 0)));
      if (!eventId || !count) return;
      next[eventId] = Math.max(next[eventId] || 0, count);
    });
    return next;
  };
  const encodeEventCountsIntoOwnedCosmetics = (
    cosmeticOwnedRaw: string[],
    eventCountsRaw: Record<string, number>,
    metaEntriesRaw: string[] = []
  ) => {
    const shopIdSet = new Set(SHOP_ITEMS.map((item) => item.id));
    const cosmeticOwned = Array.from(new Set((cosmeticOwnedRaw || []).filter((id) => shopIdSet.has(id))));
    const metaEntries = Array.from(
      new Set(
        (metaEntriesRaw || [])
          .map((entry) => String(entry || '').trim())
          .filter((entry) => entry.startsWith('meta:'))
      )
    );
    const cleanedEventCounts = Object.entries(eventCountsRaw || {}).reduce<Record<string, number>>((acc, [eventId, countRaw]) => {
      const count = Math.max(0, Math.floor(Number(countRaw || 0)));
      if (!eventId || !count) return acc;
      acc[eventId] = count;
      return acc;
    }, {});
    const encodedEventEntries = Object.entries(cleanedEventCounts).map(([eventId, count]) => `${eventOwnedPrefix}${eventId}:${count}`);
    return Array.from(new Set([...cosmeticOwned, ...defaultOwnedIds, ...encodedEventEntries, ...metaEntries]));
  };
  const readLocalCosmeticSnapshot = () => {
    try {
      if (!user?.id) return { owned: [...defaultOwnedIds], hasAnyHint: false };
      const keyCandidates = [
        `gt_cosmetics_v1_${user.id}`,
        `gt_cosmetics_v0_${user.id}`,
        `gt_cosmetics_${user.id}`,
      ];
      let mergedOwnedRaw: string[] = [];
      let hasAnyHint = false;
      keyCandidates.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        hasAnyHint = true;
        try {
          const parsed = JSON.parse(raw) as { owned?: string[] };
          if (Array.isArray(parsed?.owned)) mergedOwnedRaw = [...mergedOwnedRaw, ...parsed.owned];
        } catch {
          // ignore parse failure
        }
      });
      const shopIdSet = new Set(SHOP_ITEMS.map((item) => item.id));
      const owned = Array.from(new Set([...(mergedOwnedRaw || []), ...defaultOwnedIds])).filter((id) => shopIdSet.has(id));
      return { owned, hasAnyHint };
    } catch {
      return { owned: [...defaultOwnedIds], hasAnyHint: false };
    }
  };
  const readLocalEventSnapshot = () => {
    try {
      if (!user?.id) return { counts: {}, hasAnyHint: false };
      const keyCandidates = [
        `gt_event_shop_v1_${user.id}`,
        `gt_event_shop_v0_${user.id}`,
        `gt_event_shop_${user.id}`,
      ];
      const merged: Record<string, number> = {};
      let hasAnyHint = false;
      keyCandidates.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        hasAnyHint = true;
        try {
          const parsed = JSON.parse(raw) as Record<string, number>;
          if (!parsed || typeof parsed !== 'object') return;
          Object.entries(parsed).forEach(([eventId, countRaw]) => {
            const count = Math.max(0, Math.floor(Number(countRaw || 0)));
            if (!eventId || !count) return;
            merged[eventId] = Math.max(merged[eventId] || 0, count);
          });
        } catch {
          // ignore parse failure
        }
      });
      return { counts: merged, hasAnyHint };
    } catch {
      return { counts: {}, hasAnyHint: false };
    }
  };
  const isCurrentUserDisplayName = (name?: string | null) => (name || '').trim() === (currentUserName || '').trim();
  const normalizeChallengeMode = (modeRaw: unknown): ChallengeMode => {
    const raw = String(modeRaw || '').trim();
    const base = raw.replace(/_(accepted|accepting|settling|refunding)$/i, '').trim();
    if (base === 'free' || base === 'random' || base === 'season_free' || base === 'season_watson_melee' || base === 'season_vantage_sniper' || base === 'season_wraith_knife') {
      return base as ChallengeMode;
    }
    return 'free';
  };
  const isRegularMode = (mode: ChallengeMode | string) => normalizeChallengeMode(mode) === 'free';
  const isRandomSeasonMode = (mode: ChallengeMode | string) => normalizeChallengeMode(mode) === 'random';
  const isFreePickMode = (mode: ChallengeMode | string) => {
    const m = normalizeChallengeMode(mode);
    return m === 'free' || m === 'season_free';
  };
  const getModeDisplayName = (mode: ChallengeMode | string) => {
    const m = normalizeChallengeMode(mode);
    if (m === 'free') return '정규 대전';
    if (m === 'random') return '시즌 대전 · 랜덤';
    if (m === 'season_free') return '시즌 대전 · 자유';
    if (m === 'season_watson_melee') return '시즌 대전 · 왓슨 근접전';
    if (m === 'season_vantage_sniper') return '시즌 대전 · 벤티지 스나이퍼전';
    if (m === 'season_wraith_knife') return '시즌 대전 · 레이스 투척 나이프전';
    return '정규 대전';
  };
  const getFixedSeasonLoadout = (mode: ChallengeMode | string): { legend: string; weapons: [string, string] } | null => {
    const m = normalizeChallengeMode(mode);
    if (m === 'season_watson_melee') return { legend: '왓슨', weapons: ['없음', '없음'] };
    if (m === 'season_vantage_sniper') return { legend: '벤티지', weapons: ['크레이버', '센티넬'] };
    if (m === 'season_wraith_knife') return { legend: '레이스', weapons: ['투척 나이프', '투척 나이프'] };
    return null;
  };
  const resolveModeLoadout = (mode: ChallengeMode | string, legend: string, weapons: string[]) => {
    const fixed = getFixedSeasonLoadout(mode);
    if (fixed) return { legend: fixed.legend, weapons: [...fixed.weapons] as [string, string] };
    return {
      legend: String(legend || '').trim(),
      weapons: [String(weapons?.[0] || '').trim(), String(weapons?.[1] || '').trim()] as [string, string],
    };
  };
  const rememberManualLoadout = (mode: ChallengeMode | string, legendRaw: string, weaponsRaw: string[]) => {
    const modeKey = normalizeChallengeMode(mode);
    if (modeKey !== 'free' && modeKey !== 'season_free') return;
    const legend = String(legendRaw || '').trim();
    const weapons: [string, string] = [String(weaponsRaw?.[0] || '').trim(), String(weaponsRaw?.[1] || '').trim()];
    if (!legend && !weapons[0] && !weapons[1]) return;
    manualLoadoutRef.current[modeKey] = { legend, weapons };
    if (manualLoadoutStorageKey) {
      try {
        localStorage.setItem(manualLoadoutStorageKey, JSON.stringify(manualLoadoutRef.current));
      } catch {
        // ignore storage failures
      }
    }
  };
  const getManualLoadout = (mode: ChallengeMode | string): { legend: string; weapons: [string, string] } | null => {
    const modeKey = normalizeChallengeMode(mode);
    if (modeKey !== 'free' && modeKey !== 'season_free') return null;
    const loadout = manualLoadoutRef.current[modeKey];
    if (!loadout.legend && !loadout.weapons[0] && !loadout.weapons[1]) return null;
    return { legend: loadout.legend, weapons: [...loadout.weapons] as [string, string] };
  };
  const applyDefaultLoadoutForMode = (mode: ChallengeMode | string) => {
    const fixed = getFixedSeasonLoadout(mode);
    if (fixed) {
      setEntryLegend(fixed.legend);
      setEntryWeapons([...fixed.weapons]);
      return;
    }
    const saved = getManualLoadout(mode);
    setEntryLegend(saved?.legend || '');
    setEntryWeapons(saved ? [...saved.weapons] : ['', '']);
  };
  const inferWinTargetFromScores = (...scoreValues: Array<number | null | undefined>): WinTarget => {
    const numeric = scoreValues.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
    const maxScore = numeric.length > 0 ? Math.max(...numeric) : 0;
    if (maxScore >= 21) return 21;
    if (maxScore >= 11) return 11;
    if (maxScore >= 5) return 5;
    return 3;
  };
  const isSubmittedScorePair = (winRaw: number | null | undefined, loseRaw: number | null | undefined) => {
    const win = Number(winRaw);
    const lose = Number(loseRaw);
    return Number.isFinite(win) && Number.isFinite(lose) && win >= 0 && lose >= 0 && (win + lose > 0);
  };
  const isTerminalScoreSelection = (
    winsRaw: number | null | undefined,
    lossesRaw: number | null | undefined,
    target: WinTarget
  ) => {
    if (winsRaw === null || winsRaw === undefined || lossesRaw === null || lossesRaw === undefined) return false;
    const wins = Number(winsRaw);
    const losses = Number(lossesRaw);
    if (!Number.isFinite(wins) || !Number.isFinite(losses)) return false;
    if (wins < 0 || losses < 0) return false;
    if (wins > target || losses > target) return false;
    if (wins === losses) return false;
    return wins === target || losses === target;
  };
  const parseManualScoreInput = (valueRaw: string, target: WinTarget): number | null => {
    const value = String(valueRaw ?? '').trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const integer = Math.floor(parsed);
    if (integer < 0) return 0;
    if (integer > target) return target;
    return integer;
  };
  const getAdaptiveTierLevelByRank = (rank1Raw: number | null, totalRankedRaw: number) => {
    const totalRanked = Number.isFinite(totalRankedRaw) ? Math.max(0, Math.floor(totalRankedRaw)) : 0;
    if (!rank1Raw || totalRanked <= 0) return 0;
    const rank1 = Math.max(1, Math.floor(rank1Raw));
    const top3 = Math.min(3, totalRanked);
    if (rank1 <= top3) return 7;

    const top5 = Math.min(totalRanked, Math.max(4, Math.ceil(totalRanked * 0.05)));
    const top10 = Math.min(totalRanked, Math.max(top5, Math.ceil(totalRanked * 0.1)));
    const top20 = Math.min(totalRanked, Math.max(top10, Math.ceil(totalRanked * 0.2)));
    const top30 = Math.min(totalRanked, Math.max(top20, Math.ceil(totalRanked * 0.3)));
    const top50 = Math.min(totalRanked, Math.max(top30, Math.ceil(totalRanked * 0.5)));

    const bucketSizes = [
      top5 - top3,
      top10 - top5,
      top20 - top10,
      top30 - top20,
      top50 - top30,
      totalRanked - top50,
    ].map((v) => Math.max(0, v));
    const hasSparseBucket = bucketSizes.some((v) => v > 0 && v < 3);

    if (!hasSparseBucket) {
      if (rank1 <= top5) return 6;
      if (rank1 <= top10) return 5;
      if (rank1 <= top20) return 4;
      if (rank1 <= top30) return 3;
      if (rank1 <= top50) return 2;
      return 1;
    }

    const offset = rank1 - (top3 + 1);
    const tier = 6 - Math.floor(offset / 3);
    return Math.max(1, tier);
  };
  const isSettledChallengeRow = (row: any) => {
    if (!row) return false;
    const hasC = isSubmittedScorePair(row.c_win, row.c_lose);
    const hasT = isSubmittedScorePair(row.t_win, row.t_lose);
    if (!hasC || !hasT) return false;
    return Number(row.c_win) === Number(row.t_lose) && Number(row.c_lose) === Number(row.t_win);
  };
  const getSingleLineProfileNameStyle = (fontSize: number): React.CSSProperties => ({
    fontSize: `${Math.max(8, Math.min(92, Math.round(fontSize)))}px`,
    lineHeight: 1.05,
    whiteSpace: 'nowrap',
    width: 'max-content',
    maxWidth: 'none',
  });
  const getDiscordCopyCandidate = (row: any) => {
    const candidates = [
      row?.discord_username,
      row?.discord_name,
      row?.discord_display_name,
      row?.discord_global_name,
      row?.display_name,
    ];
    for (const candidate of candidates) {
      const normalized = String(candidate || '').trim();
      if (normalized) return normalized;
    }
    return '';
  };
  const getModeAccent = (mode: ChallengeMode | string) => {
    const m = normalizeChallengeMode(mode);
    return isRegularMode(m)
      ? { panel: 'border-pink-400/50 bg-pink-400/5', badge: 'bg-pink-600 text-white' }
      : { panel: 'border-cyan-400/50 bg-cyan-400/5', badge: 'bg-cyan-600 text-black' };
  };

  const nameColorClassMap: Record<string, string> = {
    name_default: 'text-white',
    name_cyan: 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    name_magenta: 'text-fuchsia-300 drop-shadow-[0_0_10px_rgba(232,121,249,0.65)]',
    name_gold: 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)]',
    name_emerald: 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]',
    name_royal: 'text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.65)]',
    name_grad_solar: 'bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]',
    name_grad_nebula: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]',
    name_grad_eclipse: 'bg-gradient-to-r from-red-400 via-fuchsia-400 to-indigo-400 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]',
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
    border_grad_prism: 'border-cyan-300 ring-2 ring-violet-300/55 shadow-[0_0_22px_rgba(34,211,238,0.6)]',
    border_grad_crown: 'border-yellow-300 ring-2 ring-pink-300/55 shadow-[0_0_22px_rgba(250,204,21,0.62)]',
    border_grad_abyss: 'border-rose-300 ring-2 ring-violet-300/55 shadow-[0_0_22px_rgba(244,63,94,0.58)]',
  };
  const rankCardFxByTier = (tierLevel: number) => {
    if (tierLevel >= 7) return 'border border-red-300/75 shadow-[0_0_24px_rgba(248,113,113,0.28)] bg-[linear-gradient(140deg,rgba(248,113,113,0.08),rgba(0,0,0,0.64)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 6) return 'border border-violet-300/70 shadow-[0_0_20px_rgba(167,139,250,0.24)] bg-[linear-gradient(140deg,rgba(167,139,250,0.07),rgba(0,0,0,0.64)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 5) return 'border border-cyan-300/65 shadow-[0_0_18px_rgba(34,211,238,0.22)] bg-[linear-gradient(140deg,rgba(34,211,238,0.07),rgba(0,0,0,0.64)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 4) return 'border border-emerald-300/60 shadow-[0_0_16px_rgba(110,231,183,0.2)] bg-[linear-gradient(140deg,rgba(110,231,183,0.06),rgba(0,0,0,0.65)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 3) return 'border border-amber-300/58 shadow-[0_0_14px_rgba(252,211,77,0.18)] bg-[linear-gradient(140deg,rgba(252,211,77,0.06),rgba(0,0,0,0.66)_50%,rgba(0,0,0,0.84))]';
    return 'border border-slate-300/50 shadow-[0_0_12px_rgba(148,163,184,0.16)] bg-[linear-gradient(140deg,rgba(148,163,184,0.05),rgba(0,0,0,0.66)_50%,rgba(0,0,0,0.84))]';
  };
  const seasonCardFxByTier = (tierLevel: number) => {
    if (tierLevel >= 7) return 'border border-red-300/72 shadow-[0_0_24px_rgba(248,113,113,0.28)] bg-[linear-gradient(140deg,rgba(248,113,113,0.09),rgba(0,0,0,0.65)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 6) return 'border border-fuchsia-300/66 shadow-[0_0_20px_rgba(232,121,249,0.22)] bg-[linear-gradient(140deg,rgba(232,121,249,0.07),rgba(0,0,0,0.66)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 5) return 'border border-cyan-300/62 shadow-[0_0_18px_rgba(34,211,238,0.2)] bg-[linear-gradient(140deg,rgba(34,211,238,0.07),rgba(0,0,0,0.66)_50%,rgba(0,0,0,0.84))]';
    if (tierLevel >= 4) return 'border border-sky-300/58 shadow-[0_0_16px_rgba(125,211,252,0.18)] bg-[linear-gradient(140deg,rgba(125,211,252,0.06),rgba(0,0,0,0.66)_50%,rgba(0,0,0,0.84))]';
    return 'border border-indigo-300/54 shadow-[0_0_14px_rgba(165,180,252,0.16)] bg-[linear-gradient(140deg,rgba(165,180,252,0.06),rgba(0,0,0,0.67)_50%,rgba(0,0,0,0.84))]';
  };
  const equippedNameColorClass = nameColorClassMap[equippedItems.nameColor] || nameColorClassMap.name_default;
  const equippedNameStyleClass = nameStyleClassMap[equippedItems.nameStyle] || nameStyleClassMap.style_default;
  const equippedNameClass = `${equippedNameColorClass} ${equippedNameStyleClass}`.trim();
  const equippedBorderFxClass = borderFxClassMap[equippedItems.borderFx] || borderFxClassMap.border_default;
  const normalizePlayerName = (value?: string | null) => (value || '').trim().toLowerCase();
  const normalizeIngamePlatform = (value: unknown): IngamePlatform => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'ea' || raw === 'origin') return 'ea';
    return 'steam';
  };
  const ingameProfileStorageKey = 'gt_ingame_profile_v1';
  const readIngameProfileMap = (): Record<string, { nickname: string; platform: IngamePlatform }> => {
    try {
      const raw = localStorage.getItem(ingameProfileStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const next: Record<string, { nickname: string; platform: IngamePlatform }> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        const nickname = String((v as any)?.nickname || '').trim();
        const platform = normalizeIngamePlatform((v as any)?.platform);
        if (!k || !nickname) return;
        next[k] = { nickname, platform };
      });
      return next;
    } catch {
      return {};
    }
  };
  const writeIngameProfileMap = (map: Record<string, { nickname: string; platform: IngamePlatform }>) => {
    try {
      localStorage.setItem(ingameProfileStorageKey, JSON.stringify(map));
    } catch {
      // ignore local storage write errors
    }
  };
  const saveIngameProfileToLocalMap = (opts: {
    userId?: string | null;
    displayName?: string | null;
    nickname: string;
    platform: IngamePlatform;
  }) => {
    const nickname = String(opts.nickname || '').trim();
    if (!nickname) return;
    const map = readIngameProfileMap();
    const userId = String(opts.userId || '').trim();
    const displayName = String(opts.displayName || '').trim();
    if (userId) map[`id:${userId}`] = { nickname, platform: opts.platform };
    if (displayName) map[`name:${displayName.toLowerCase()}`] = { nickname, platform: opts.platform };
    writeIngameProfileMap(map);
  };
  const resolveIngameProfile = (row?: any): { nickname: string; platform: IngamePlatform } => {
    const encodedPlatformRaw = String(row?.favorite_legend || '').trim();
    const encodedNicknameRaw = String(row?.favorite_weapon || '').trim();
    const encodedPlatformMatch = encodedPlatformRaw.match(/^INGAME_PLATFORM:(steam|ea)$/i);
    const encodedNicknameMatch = encodedNicknameRaw.match(/^INGAME_CODE:(.+)$/i);
    if (encodedNicknameMatch?.[1]) {
      return {
        nickname: encodedNicknameMatch[1].trim(),
        platform: normalizeIngamePlatform(encodedPlatformMatch?.[1] || 'steam'),
      };
    }
    const nicknameCandidates = [
      row?.ingame_nickname,
      row?.in_game_nickname,
      row?.game_nickname,
      row?.battle_nickname,
      row?.steam_friend_code,
      row?.steam_friendcode,
      row?.steam_code,
      row?.steam_id,
      row?.ea_nickname,
      row?.ea_name,
      row?.ea_id,
      row?.origin_id,
    ];
    const dbNickname =
      nicknameCandidates.map((v) => String(v || '').trim()).find((v) => v.length > 0) || '';
    const dbPlatform = normalizeIngamePlatform(
      row?.ingame_platform ||
      row?.in_game_platform ||
      row?.game_platform ||
      row?.battle_platform ||
      (row?.ea_nickname || row?.ea_name || row?.ea_id || row?.origin_id ? 'ea' : 'steam')
    );
    if (dbNickname) return { nickname: dbNickname, platform: dbPlatform };
    const map = readIngameProfileMap();
    const byId = row?.id ? map[`id:${String(row.id).trim()}`] : null;
    if (byId?.nickname) return byId;
    const byName = row?.display_name ? map[`name:${String(row.display_name).trim().toLowerCase()}`] : null;
    if (byName?.nickname) return byName;
    return { nickname: '', platform: 'steam' };
  };
  const getPlatformLabel = (platform?: unknown) => normalizeIngamePlatform(platform) === 'ea' ? 'EA' : 'STEAM CODE';
  const getIngameIdentityLabel = (platform?: unknown) =>
    normalizeIngamePlatform(platform) === 'ea' ? 'EA 닉네임' : '스팀 친구코드';
  const getPlayerIngameNickname = (row?: any) => {
    const resolved = resolveIngameProfile(row);
    return resolved.nickname || String(row?.display_name || '').trim();
  };
  const currentUserIngameProfile = resolveIngameProfile(profile);
  const currentUserIngameNickname = currentUserIngameProfile.nickname;
  const currentUserIngamePlatform = currentUserIngameProfile.platform;
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
  const getCardAvatarBorderFxForUser = (name?: string | null) => {
    const cosmetic = getCosmeticStateForUser(name);
    if (!cosmetic || cosmetic.borderFx === 'border_default') return 'border-transparent shadow-none';
    return borderFxClassMap[cosmetic.borderFx] || 'border-transparent shadow-none';
  };
  const getKstDateKeyFromInput = (input?: string | number | Date) => {
    const baseDate = input ? new Date(input) : new Date();
    const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(safeDate);
    const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const m = parts.find((p) => p.type === 'month')?.value ?? '00';
    const d = parts.find((p) => p.type === 'day')?.value ?? '00';
    return `${y}-${m}-${d}`;
  };
  const getKstDateKey = () => getKstDateKeyFromInput();
  const getRandomRewardStorageKey = (userId: string) => `gt_random_reward_v1_${userId}`;
  const buildDefaultRandomRewardState = (): RandomRewardState => ({
    version: 1,
    seeded: false,
    lastFirstDailyDate: '',
    postFirstMatchCount: 0,
    processedMatchIds: [],
    pendingChests: [],
  });
  const getMatchStableId = (match: any) => {
    if (match?.id) return String(match.id);
    const stamp = String(match?.created_at || '');
    const left = String(match?.left_player_name || match?.left_player || '');
    const right = String(match?.right_player_name || match?.right_player || '');
    const score = `${match?.score_left ?? '-'}:${match?.score_right ?? '-'}`;
    return `${stamp}|${left}|${right}|${score}`;
  };
  const readRandomRewardState = (userId?: string | null): RandomRewardState => {
    if (!userId) return buildDefaultRandomRewardState();
    try {
      const raw = localStorage.getItem(getRandomRewardStorageKey(userId));
      if (!raw) return buildDefaultRandomRewardState();
      const parsed = JSON.parse(raw) as Partial<RandomRewardState>;
      return {
        version: 1,
        seeded: Boolean(parsed?.seeded),
        lastFirstDailyDate: typeof parsed?.lastFirstDailyDate === 'string' ? parsed.lastFirstDailyDate : '',
        postFirstMatchCount: Number.isFinite(parsed?.postFirstMatchCount)
          ? Math.max(0, Number(parsed?.postFirstMatchCount) % 3)
          : 0,
        processedMatchIds: Array.isArray(parsed?.processedMatchIds)
          ? parsed.processedMatchIds.map((id) => String(id)).filter(Boolean).slice(-1200)
          : [],
        pendingChests: Array.isArray(parsed?.pendingChests)
          ? parsed.pendingChests
              .map((chest: any) => ({
                id: String(chest?.id || ''),
                reason: chest?.reason === 'every_three_random' ? 'every_three_random' : 'first_daily_random',
                sourceMatchId: String(chest?.sourceMatchId || ''),
                createdAt: String(chest?.createdAt || ''),
              }))
              .filter((chest) => chest.id && chest.sourceMatchId)
              .slice(-32)
          : [],
      };
    } catch {
      return buildDefaultRandomRewardState();
    }
  };
  const writeRandomRewardState = (userId: string, nextState: RandomRewardState) => {
    try {
      const safeState: RandomRewardState = {
        version: 1,
        seeded: Boolean(nextState.seeded),
        lastFirstDailyDate: nextState.lastFirstDailyDate || '',
        postFirstMatchCount: Math.max(0, Number(nextState.postFirstMatchCount || 0) % 3),
        processedMatchIds: [...new Set((nextState.processedMatchIds || []).map((id) => String(id)).filter(Boolean))].slice(-1200),
        pendingChests: (nextState.pendingChests || []).slice(-32),
      };
      localStorage.setItem(getRandomRewardStorageKey(userId), JSON.stringify(safeState));
    } catch {
      // ignore localStorage write failures
    }
  };
  const getRewardChestReasonLabel = (reason: RewardChestReason) =>
    reason === 'first_daily_random' ? '오늘 랜덤 대전 첫 경기 보상' : '랜덤 대전 3판 달성 보상';
  const drawRandomChestGcReward = () => {
    const weighted: Array<{ gc: number; weight: number }> = [
      { gc: 50, weight: 40 },
      { gc: 75, weight: 24 },
      { gc: 100, weight: 16 },
      { gc: 150, weight: 10 },
      { gc: 200, weight: 6 },
      { gc: 300, weight: 3 },
      { gc: 500, weight: 1 },
    ];
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) return item.gc;
    }
    return 50;
  };

  const isOwnedItem = (itemId: string) => defaultOwnedIds.includes(itemId) || ownedItemIds.includes(itemId);
  type SavedRandomDraft = {
    rerollCount: number;
    legend: string;
    weapons: string[];
  };
  const getRandomDraftStorageKey = (
    challengeId: string,
    isChallenger: boolean,
    username?: string | null
  ) => {
    const safeUser = (username || currentUserName || 'unknown').trim().toLowerCase();
    return `gt_random_draft_v2_${safeUser}_${challengeId}_${isChallenger ? 'c' : 't'}`;
  };
  const readRandomDraftState = (
    challengeId: string,
    isChallenger: boolean,
    username?: string | null
  ): SavedRandomDraft | null => {
    try {
      const key = getRandomDraftStorageKey(challengeId, isChallenger, username);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedRandomDraft;
      if (!parsed || typeof parsed.legend !== 'string' || !Array.isArray(parsed.weapons)) return null;
      return {
        rerollCount: Number.isFinite(parsed.rerollCount) ? Math.max(0, Number(parsed.rerollCount)) : 0,
        legend: parsed.legend || '',
        weapons: [parsed.weapons[0] || '', parsed.weapons[1] || ''],
      };
    } catch {
      return null;
    }
  };
  const writeRandomDraftState = (
    challengeId: string,
    isChallenger: boolean,
    username: string,
    draft: SavedRandomDraft
  ) => {
    try {
      const key = getRandomDraftStorageKey(challengeId, isChallenger, username);
      localStorage.setItem(
        key,
        JSON.stringify({
          rerollCount: Math.max(0, draft.rerollCount || 0),
          legend: draft.legend || '',
          weapons: [draft.weapons?.[0] || '', draft.weapons?.[1] || ''],
        })
      );
    } catch {
      // ignore localStorage write failures
    }
  };
  const clearRandomDraftState = (
    challengeId: string,
    isChallenger: boolean,
    username?: string | null
  ) => {
    try {
      const key = getRandomDraftStorageKey(challengeId, isChallenger, username);
      localStorage.removeItem(key);
    } catch {
      // ignore localStorage remove failures
    }
  };

  const activeMatchRef = useRef(activeMatch);
  const matchPhaseRef = useRef(matchPhase);
  const waitingForScoreRef = useRef(waitingForScore);
  const incomingChallengeRef = useRef(incomingChallenge);
  const entryLegendRef = useRef(entryLegend);
  const entryWeaponsRef = useRef(entryWeapons);
  const recentLogsBoardRef = useRef<HTMLDivElement | null>(null);
  const rankingBoardRef = useRef<HTMLDivElement | null>(null);
  const cosmeticSyncWarnedRef = useRef(false);
  const rankHistoryRef = useRef<{ regular: Record<string, number>; season: Record<string, number> }>({
    regular: {},
    season: {},
  });
  const dailyRewardCheckingRef = useRef(false);
  const dailyRewardSessionCheckedRef = useRef('');
  const suppressNextDeletePopupChallengeIdRef = useRef<string | null>(null);
  const statusPopupTimerRef = useRef<number | null>(null);
  const statusPopupFadeTimerRef = useRef<number | null>(null);
  const selectedProfileNameWrapRef = useRef<HTMLDivElement | null>(null);
  const selectedProfileNameTextRef = useRef<HTMLHeadingElement | null>(null);
  const starRainTimerRef = useRef<number | null>(null);
  const starRainClickCountRef = useRef(0);
  const starRainParticleSeqRef = useRef(0);
  const titleBlinkTimerRef = useRef<number | null>(null);
  const originalDocumentTitleRef = useRef('');
  const resultPopupChannelRef = useRef<any>(null);
  const adminNoticeChannelRef = useRef<any>(null);
  const lastResultPopupMatchIdRef = useRef<string>('');
  const ingameProfileBackfillRef = useRef<string>('');
  const purchaseRecoveryRunningRef = useRef(false);
  const scoringSessionChallengeIdRef = useRef<string | null>(null);
  const autoScoreSubmitKeyRef = useRef('');
  const manualLoadoutRef = useRef<{
    free: { legend: string; weapons: [string, string] };
    season_free: { legend: string; weapons: [string, string] };
  }>({
    free: { legend: '', weapons: ['', ''] },
    season_free: { legend: '', weapons: ['', ''] },
  });
  const rankCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollTargetRef = useRef<HTMLElement | null>(null);
  const updateScrollTopForTarget = (target: HTMLElement | null) => {
    if (!target) {
      setShowScrollTop(false);
      setScrollTopButtonPos(null);
      return;
    }
    activeScrollTargetRef.current = target;
    const shouldShow = target.scrollTop > 260;
    setShowScrollTop(shouldShow);
    if (!shouldShow) {
      setScrollTopButtonPos(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2));
    const top = Math.min(window.innerHeight - 12, Math.max(88, rect.bottom - 10));
    setScrollTopButtonPos({
      left,
      top,
      transform: 'translate(-50%, -100%)',
    });
  };

  useEffect(() => { activeMatchRef.current = activeMatch; }, [activeMatch]);
  useEffect(() => { matchPhaseRef.current = matchPhase; }, [matchPhase]);
  useEffect(() => { waitingForScoreRef.current = waitingForScore; }, [waitingForScore]);
  useEffect(() => { incomingChallengeRef.current = incomingChallenge; }, [incomingChallenge]);
  useEffect(() => { entryLegendRef.current = entryLegend; }, [entryLegend]);
  useEffect(() => { entryWeaponsRef.current = entryWeapons; }, [entryWeapons]);
  useEffect(() => {
    if (matchPhase !== 'scoring' || !activeMatch?.id) {
      scoringSessionChallengeIdRef.current = null;
      return;
    }
    if (scoringSessionChallengeIdRef.current !== activeMatch.id) {
      scoringSessionChallengeIdRef.current = activeMatch.id;
      autoScoreSubmitKeyRef.current = '';
      setWaitingForScore(false);
      setMyWins(null);
      setMyLosses(null);
    }
  }, [matchPhase, activeMatch?.id]);
  useEffect(() => {
    const empty = {
      free: { legend: '', weapons: ['', ''] as [string, string] },
      season_free: { legend: '', weapons: ['', ''] as [string, string] },
    };
    if (!manualLoadoutStorageKey) {
      manualLoadoutRef.current = empty;
      return;
    }
    try {
      const raw = localStorage.getItem(manualLoadoutStorageKey);
      if (!raw) {
        manualLoadoutRef.current = empty;
        return;
      }
      const parsed = JSON.parse(raw);
      const sanitize = (value: any): { legend: string; weapons: [string, string] } => {
        const legend = String(value?.legend || '').trim();
        const w0 = String(value?.weapons?.[0] || '').trim();
        const w1 = String(value?.weapons?.[1] || '').trim();
        return { legend, weapons: [w0, w1] };
      };
      manualLoadoutRef.current = {
        free: sanitize(parsed?.free),
        season_free: sanitize(parsed?.season_free),
      };
    } catch {
      manualLoadoutRef.current = empty;
    }
  }, [manualLoadoutStorageKey]);
  useEffect(() => {
    const modeSource = matchPhase === 'scoring' && activeMatch ? activeMatch.mode : entryMode;
    rememberManualLoadout(modeSource, entryLegend, entryWeapons);
  }, [entryLegend, entryWeapons, entryMode, activeMatch?.mode, matchPhase]);
  useEffect(() => {
    if (!lastOpponentStorageKey) return;
    try {
      const saved = localStorage.getItem(lastOpponentStorageKey) || '';
      const safe = String(saved).trim();
      if (safe && !String(entryOpponent || '').trim()) {
        setEntryOpponent(safe);
      }
    } catch {}
  }, [lastOpponentStorageKey]);
  useEffect(() => {
    if (!lastOpponentStorageKey) return;
    try {
      const safe = String(entryOpponent || '').trim();
      if (safe) localStorage.setItem(lastOpponentStorageKey, safe);
      else localStorage.removeItem(lastOpponentStorageKey);
    } catch {}
  }, [lastOpponentStorageKey, entryOpponent]);
  useEffect(() => {
    if (myWins !== null && myWins > winTarget) setMyWins(winTarget);
    if (myLosses !== null && myLosses > winTarget) setMyLosses(winTarget);
  }, [winTarget, myWins, myLosses]);
  useEffect(() => {
    const onPointerDown = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const scroller = target.closest?.('.custom-scrollbar') as HTMLElement | null;
      if (!scroller) return;
      updateScrollTopForTarget(scroller);
    };

    const onScrollCapture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.classList?.contains('custom-scrollbar')) return;
      updateScrollTopForTarget(target);
    };
    const onWindowResize = () => {
      if (activeScrollTargetRef.current) {
        updateScrollTopForTarget(activeScrollTargetRef.current);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('scroll', onScrollCapture, true);
    window.addEventListener('resize', onWindowResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('scroll', onScrollCapture, true);
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  useEffect(() => {
    if (mainScrollRef.current) {
      updateScrollTopForTarget(mainScrollRef.current);
    }
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu === 'master' && !isMasterAccount) {
      setActiveMenu('home');
    }
  }, [activeMenu, isMasterAccount]);

  useEffect(() => {
    return () => {
      if (starRainTimerRef.current) {
        window.clearTimeout(starRainTimerRef.current);
        starRainTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (statusPopupTimerRef.current) {
      window.clearTimeout(statusPopupTimerRef.current);
      statusPopupTimerRef.current = null;
    }
    if (statusPopupFadeTimerRef.current) {
      window.clearTimeout(statusPopupFadeTimerRef.current);
      statusPopupFadeTimerRef.current = null;
    }
    setStatusPopupFading(false);
    if (!statusPopup?.autoCloseMs) return;
    const fadeAfter = Math.max(0, statusPopup.autoCloseMs - 360);
    statusPopupFadeTimerRef.current = window.setTimeout(() => setStatusPopupFading(true), fadeAfter);
    statusPopupTimerRef.current = window.setTimeout(() => {
      setStatusPopup(null);
      setStatusPopupFading(false);
    }, statusPopup.autoCloseMs);
    return () => {
      if (statusPopupTimerRef.current) window.clearTimeout(statusPopupTimerRef.current);
      if (statusPopupFadeTimerRef.current) window.clearTimeout(statusPopupFadeTimerRef.current);
    };
  }, [statusPopup]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (statusPopup) {
        setStatusPopup(null);
        return;
      }
      if (selectedPlayer) {
        setSelectedPlayer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPlayer, statusPopup]);

  useEffect(() => {
    if (!currentUserName) return;
    let polling = false;
    let mounted = true;
    const run = async () => {
      if (!mounted || polling) return;
      polling = true;
      try {
        await checkActiveChallenge(currentUserName);
      } finally {
        polling = false;
      }
    };
    void run();
    const timer = window.setInterval(() => {
      void run();
    }, 2500);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [currentUserName]);

  useEffect(() => {
    if (!originalDocumentTitleRef.current) {
      originalDocumentTitleRef.current = document.title || '쫄?봇';
    }
    const stopBlink = () => {
      if (titleBlinkTimerRef.current) {
        window.clearInterval(titleBlinkTimerRef.current);
        titleBlinkTimerRef.current = null;
      }
      document.title = originalDocumentTitleRef.current;
    };
    const startBlink = () => {
      if (titleBlinkTimerRef.current) return;
      let on = false;
      titleBlinkTimerRef.current = window.setInterval(() => {
        on = !on;
        document.title = on ? '🔥 대전 신청 도착!' : originalDocumentTitleRef.current;
      }, 850);
    };
    const syncBlinkState = () => {
      const shouldBlink = Boolean(incomingChallenge) && (document.hidden || !document.hasFocus());
      if (shouldBlink) startBlink();
      else stopBlink();
    };
    syncBlinkState();
    window.addEventListener('focus', syncBlinkState);
    window.addEventListener('blur', syncBlinkState);
    document.addEventListener('visibilitychange', syncBlinkState);
    return () => {
      window.removeEventListener('focus', syncBlinkState);
      window.removeEventListener('blur', syncBlinkState);
      document.removeEventListener('visibilitychange', syncBlinkState);
      stopBlink();
    };
  }, [incomingChallenge]);

  useEffect(() => {
    if (!selectedPlayer) {
      setSelectedProfileNameFontSize(56);
      return;
    }
    const fitName = () => {
      const wrap = selectedProfileNameWrapRef.current;
      const text = selectedProfileNameTextRef.current;
      if (!wrap || !text) {
        setSelectedProfileNameFontSize(56);
        return;
      }
      const vw = window.innerWidth || 1280;
      const maxPx = vw < 480 ? 46 : vw < 640 ? 56 : vw < 1024 ? 66 : 74;
      const minPx = vw < 480 ? 8 : 10;
      text.style.fontSize = `${maxPx}px`;
      const available = Math.max(0, wrap.clientWidth - 6);
      if (!available) {
        setSelectedProfileNameFontSize(maxPx);
        return;
      }
      let next = maxPx;
      let guard = 0;
      while (next > minPx && text.scrollWidth > available + 1 && guard < 200) {
        next -= 1;
        guard += 1;
        text.style.fontSize = `${next}px`;
      }
      setSelectedProfileNameFontSize(next);
    };

    const raf = window.requestAnimationFrame(fitName);
    const timerA = window.setTimeout(fitName, 80);
    const timerB = window.setTimeout(fitName, 220);
    const fontsReady = (document as any)?.fonts?.ready;
    if (fontsReady && typeof fontsReady.then === 'function') {
      fontsReady.then(() => fitName()).catch(() => {});
    }
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => fitName());
      if (selectedProfileNameWrapRef.current) ro.observe(selectedProfileNameWrapRef.current);
    }
    window.addEventListener('resize', fitName);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timerA);
      window.clearTimeout(timerB);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', fitName);
    };
  }, [selectedPlayer?.id, selectedPlayer?.display_name, selectedPlayer?.regular_rp, selectedPlayer?.season_sp]);

  useEffect(() => {
    if (!selectedPlayer?.id) return;
    setMasterPointDrafts({ rp: '100', sp: '100', gp: '100' });
  }, [selectedPlayer?.id]);

  useEffect(() => {
    localStorage.setItem('bgmEnabled', bgmEnabled.toString());
    localStorage.setItem('sfxEnabled', sfxEnabled.toString());
    localStorage.setItem('bgmVolume', bgmVolume.toString());
    localStorage.setItem('sfxVolume', sfxVolume.toString());

    applyAudioSettings({ bgmEnabled, sfxEnabled, bgmVolume, sfxVolume });
  }, [bgmEnabled, sfxEnabled, bgmVolume, sfxVolume]);

  useEffect(() => {
    localStorage.setItem(MASTER_UI_PREFS_KEY, JSON.stringify(masterUiPrefs));
  }, [masterUiPrefs]);

  useEffect(() => {
    setMasterDiscordUrlDraft(masterUiPrefs.discordInviteUrl || DEFAULT_DISCORD_INVITE_URL);
  }, [masterUiPrefs.discordInviteUrl]);

  useEffect(() => {
    setMatchPhaseAudio(matchPhase);
  }, [matchPhase]);

  const showStatusPopup = (
    type: 'success' | 'error' | 'info' | 'victory',
    title: string,
    message: string,
    options?: { autoCloseMs?: number; hideConfirm?: boolean }
  ) => {
    setStatusPopupFading(false);
    setStatusPopup({ type, title, message, autoCloseMs: options?.autoCloseMs, hideConfirm: options?.hideConfirm });
  };

  useEffect(() => {
    if (!user?.id) return;
    const adminNoticeChannel = supabase
      .channel('admin_notice_sync')
      .on('broadcast', { event: 'admin_adjust' }, ({ payload }: any) => {
        const targetUserId = String(payload?.targetUserId || '');
        if (!targetUserId || targetUserId !== String(user.id)) return;
        const amount = Math.max(0, Math.floor(Number(payload?.amount || 0)));
        if (!amount) return;
        const resourceRaw = String(payload?.resource || 'GP').toUpperCase();
        const resource = resourceRaw === 'RP' || resourceRaw === 'SP' || resourceRaw === 'GP' ? resourceRaw : 'GP';
        const direction = String(payload?.direction || 'add') === 'sub' ? 'sub' : 'add';
        const message =
          direction === 'sub'
            ? `운영자가 ${amount}${resource}를 차감했습니다.`
            : `운영자가 ${amount}${resource}를 추가했습니다.`;
        showStatusPopup(direction === 'sub' ? 'error' : 'info', '운영자 알림', message, {
          autoCloseMs: 3000,
          hideConfirm: true,
        });
      })
      .subscribe();
    adminNoticeChannelRef.current = adminNoticeChannel;
    return () => {
      if (adminNoticeChannelRef.current === adminNoticeChannel) {
        adminNoticeChannelRef.current = null;
      }
      supabase.removeChannel(adminNoticeChannel);
    };
  }, [user?.id]);

  const handleSaveMasterDiscordUrl = () => {
    const nextUrl = String(masterDiscordUrlDraft || '').trim();
    if (!nextUrl) {
      showStatusPopup('error', 'URL 입력 필요', '디스코드 URL을 입력해주세요.');
      return;
    }
    const isHttp = /^https?:\/\//i.test(nextUrl);
    if (!isHttp) {
      showStatusPopup('error', 'URL 형식 오류', 'http:// 또는 https:// 로 시작하는 URL을 입력해주세요.');
      return;
    }
    try {
      // validate URL format
      // eslint-disable-next-line no-new
      new URL(nextUrl);
    } catch {
      showStatusPopup('error', 'URL 형식 오류', '유효한 URL 형식으로 입력해주세요.');
      return;
    }
    updateMasterUiPrefs('discordInviteUrl', nextUrl);
    showStatusPopup('success', '저장 완료', '디스코드 버튼 URL이 바로 반영되었습니다.', { autoCloseMs: 1200, hideConfirm: true });
  };

  const handleMasterAdjustPoints = async (resource: 'rp' | 'sp' | 'gp', direction: 1 | -1) => {
    if (!isMasterAccount) {
      showStatusPopup('error', '권한 없음', '마스터 계정만 포인트를 수정할 수 있습니다.');
      return;
    }
    if (!selectedPlayer?.id) {
      showStatusPopup('error', '대상 없음', '수정할 유저 프로필을 먼저 선택해주세요.');
      return;
    }
    const amountRaw = Number(masterPointDrafts[resource] || 0);
    const amount = Math.max(0, Math.floor(Math.abs(amountRaw)));
    if (!amount) {
      showStatusPopup('error', '입력 필요', '수정할 포인트 수치를 입력해주세요.');
      return;
    }

    const fieldMap: Record<'rp' | 'sp' | 'gp', 'regular_rp' | 'season_sp' | 'gc'> = {
      rp: 'regular_rp',
      sp: 'season_sp',
      gp: 'gc',
    };
    const unitMap: Record<'rp' | 'sp' | 'gp', 'RP' | 'SP' | 'GP'> = {
      rp: 'RP',
      sp: 'SP',
      gp: 'GP',
    };
    const field = fieldMap[resource];
    const unit = unitMap[resource];
    const currentVal = Math.max(
      0,
      Number((selectedPlayer as any)?.[field] ?? (resource === 'gp' ? 1000 : 0)) || 0
    );
    const nextVal = Math.max(0, currentVal + amount * direction);
    const delta = nextVal - currentVal;
    if (delta === 0) {
      showStatusPopup('info', '변경 없음', `${unit} 값이 변경되지 않았습니다.`);
      return;
    }

    const { data: updatedRow, error } = await supabase
      .from('profiles')
      .update({ [field]: nextVal })
      .eq('id', selectedPlayer.id)
      .select('*')
      .maybeSingle();

    if (error) {
      showStatusPopup('error', '수정 실패', `포인트 수정 중 오류가 발생했습니다.\n${error.message}`);
      return;
    }

    const merged = { ...(selectedPlayer as any), ...(updatedRow || {}), [field]: nextVal };
    const resolved = resolveIngameProfile(merged);
    const hydrated = { ...merged, ingame_nickname: resolved.nickname, ingame_platform: resolved.platform };
    setSelectedPlayer((prev) => (prev && prev.id === selectedPlayer.id ? hydrated : prev));
    setRankers((prev) => prev.map((row) => (row.id === selectedPlayer.id ? { ...row, ...hydrated } : row)));
    if (profile?.id && String(profile.id) === String(selectedPlayer.id)) {
      setProfile((prev: any) => (prev ? { ...prev, [field]: nextVal } : prev));
    }

    const absDelta = Math.abs(delta);
    showStatusPopup(
      'success',
      '포인트 수정 완료',
      `${selectedPlayer.display_name} ${absDelta}${unit} ${delta > 0 ? '추가' : '차감'} 완료`,
      { autoCloseMs: 1400, hideConfirm: true }
    );

    const channel = adminNoticeChannelRef.current;
    if (channel && String(selectedPlayer.id) !== String(user?.id || '')) {
      await channel.send({
        type: 'broadcast',
        event: 'admin_adjust',
        payload: {
          targetUserId: selectedPlayer.id,
          amount: absDelta,
          resource: unit,
          direction: delta > 0 ? 'add' : 'sub',
        },
      });
    }
  };

  const triggerStarRain = () => {
    playSFX('click');
    starRainClickCountRef.current += 1;
    const meteorMode = starRainClickCountRef.current >= 5;
    const starParticles = Array.from({ length: 90 }, () => ({
      id: ++starRainParticleSeqRef.current,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.2 + Math.random() * 2.4,
      size: 8 + Math.random() * 10,
      drift: -70 + Math.random() * 140,
      kind: 'star' as const,
    }));
    const meteorParticles = meteorMode
      ? Array.from({ length: 12 }, () => ({
          id: ++starRainParticleSeqRef.current,
          left: Math.random() * 100,
          delay: Math.random() * 1.1,
          duration: 1.8 + Math.random() * 1.6,
          size: 52 + Math.random() * 48,
          drift: -360 + Math.random() * 720,
          kind: 'meteor' as const,
        }))
      : [];
    const particles = [...starParticles, ...meteorParticles];
    setStarRainParticles((prev) => [...prev, ...particles]);
    setStarRainActive(true);
    if (starRainTimerRef.current) {
      window.clearTimeout(starRainTimerRef.current);
    }
    starRainTimerRef.current = window.setTimeout(() => {
      setStarRainActive(false);
      setStarRainParticles([]);
      starRainTimerRef.current = null;
    }, 10000);
  };

  const triggerResultFx = (didWin: boolean, message: string) => {
    setResultFx({ type: didWin ? 'win' : 'lose', message });
    if (didWin) {
      const winPhrasePool = ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', '이겨버렸쥬!??ㅋㅋ', '쨉도 안되쥬??', 'ㅎㅎㅎㅎㅎㅎ'];
      const bursts = Array.from({ length: 44 }).map((_, i) => ({
        id: Date.now() + i,
        left: `${2 + Math.random() * 96}%`,
        top: `${4 + Math.random() * 84}%`,
        size: 10 + Math.floor(Math.random() * 18),
        delay: `${Math.random() * 0.46}s`,
      }));
      setResultBursts(bursts);
      const starGlyphs = ['✦', '★', '✶', '✷', '✹', '✺'];
      const stars = Array.from({ length: 280 }).map((_, i) => ({
        id: Date.now() + 1000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 1.05,
        duration: 8 + Math.random() * 2,
        size: 9 + Math.random() * 17,
        drift: -220 + Math.random() * 440,
        hue: Math.floor(Math.random() * 360),
        glyph: starGlyphs[Math.floor(Math.random() * starGlyphs.length)],
      }));
      setResultVictoryStars(stars);
      setResultLoseTaunts([]);
      const winTexts = Array.from({ length: 18 }).map((_, i) => ({
        id: Date.now() + 3000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 8 + Math.random() * 2,
        size: 20 + Math.random() * 14,
        drift: -170 + Math.random() * 340,
        rotate: -28 + Math.random() * 56,
        label: winPhrasePool[Math.floor(Math.random() * winPhrasePool.length)],
        tone: 'win' as const,
      }));
      setResultFxTexts(winTexts);
      setTimeout(() => setResultBursts([]), 10000);
      setTimeout(() => setResultVictoryStars([]), 10000);
      setTimeout(() => setResultFxTexts([]), 10000);
    } else {
      const losePhrasePool = ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', '져버렸쥬!??ㅋㅋ', '쨉도 안되쥬??', '한 판 더? ㅎㅎㅎㅎㅎㅎ'];
      setResultBursts([]);
      const tauntLabels = ['😝 메롱', '🤪 메롱', '😛 메롱', '😜 메롱'];
      const taunts = Array.from({ length: 24 }).map((_, i) => ({
        id: Date.now() + 2000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 8 + Math.random() * 2,
        size: 24 + Math.random() * 30,
        drift: -210 + Math.random() * 420,
        rotate: -56 + Math.random() * 112,
        label: tauntLabels[Math.floor(Math.random() * tauntLabels.length)],
      }));
      setResultLoseTaunts(taunts);
      setResultVictoryStars([]);
      const loseTexts = Array.from({ length: 16 }).map((_, i) => ({
        id: Date.now() + 5000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 1.8,
        duration: 8 + Math.random() * 2,
        size: 20 + Math.random() * 14,
        drift: -180 + Math.random() * 360,
        rotate: -34 + Math.random() * 68,
        label: losePhrasePool[Math.floor(Math.random() * losePhrasePool.length)],
        tone: 'lose' as const,
      }));
      setResultFxTexts(loseTexts);
      setTimeout(() => setResultLoseTaunts([]), 10000);
      setTimeout(() => setResultFxTexts([]), 10000);
    }
    setTimeout(() => setResultFx(null), 10000);
  };

  const checkActiveChallenge = async (username: string) => {
    if (!username) return;
    const { data: cRows } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenger_name', username)
      .order('created_at', { ascending: false })
      .limit(3);
    const { data: tRows } = await supabase
      .from('challenges')
      .select('*')
      .eq('target_name', username)
      .order('created_at', { ascending: false })
      .limit(3);
    const data = [...(cRows || []), ...(tRows || [])]
      .sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0];

    if (data) {
      const isC = data.challenger_name === username;
      const opp = isC ? data.target_name : data.challenger_name;
      const amIReady = isC ? data.c_ready : data.t_ready;
      const modeRaw = String(data.mode || '');
      const baseMode = normalizeChallengeMode(modeRaw);
      const isRandomAccepted = isRandomSeasonMode(baseMode) && (modeRaw.includes('_accepted') || modeRaw.includes('_accepting'));
      const savedRandomDraft = isRandomAccepted ? readRandomDraftState(data.id, isC, username) : null;
      
      let localLegend = isC ? (data.legend || '') : (data.t_legend || '');
      let localWeapons = isC ? (data.weapons || ['', '']) : (data.t_weapons || ['', '']);

      if (isRandomAccepted && !amIReady && savedRandomDraft?.legend) {
          localLegend = savedRandomDraft.legend;
          localWeapons = [savedRandomDraft.weapons?.[0] || '', savedRandomDraft.weapons?.[1] || ''];
          setEntryLegend(localLegend); setEntryWeapons(localWeapons);
      } else if (isRandomAccepted && !amIReady && (!localLegend || localLegend === '')) {
          localLegend = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
          localWeapons = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
          setEntryLegend(localLegend); setEntryWeapons(localWeapons);
          writeRandomDraftState(data.id, isC, username, { rerollCount: savedRandomDraft?.rerollCount || 0, legend: localLegend, weapons: localWeapons });
      } else {
          const fixedLoadout = getFixedSeasonLoadout(baseMode);
          if (fixedLoadout) {
            localLegend = fixedLoadout.legend;
            localWeapons = [...fixedLoadout.weapons];
          }
          // 픽 단계에서 아직 Ready를 누르지 않았다면, 상대 업데이트로 내 로컬 선택값이 지워지지 않게 보존합니다.
          if (matchPhaseRef.current === 'scoring' && !amIReady) {
            const draftLegend = entryLegendRef.current || '';
            const draftWeapons = entryWeaponsRef.current || ['', ''];
            const dbLegendEmpty = !localLegend || localLegend === '';
            const dbWeaponsEmpty = !Array.isArray(localWeapons) || !localWeapons[0] || !localWeapons[1];
            if (dbLegendEmpty && draftLegend) localLegend = draftLegend;
            if (dbWeaponsEmpty && (draftWeapons[0] || draftWeapons[1])) localWeapons = draftWeapons;
          }
          setEntryLegend(localLegend); setEntryWeapons(localWeapons);
      }
      setRerollCount(isRandomAccepted ? (savedRandomDraft?.rerollCount || 0) : 0);

      setActiveMatch({ id: data.id, mode: baseMode, opponent: opp, legend: localLegend, weapons: localWeapons, oppLegend: isC ? data.t_legend : data.legend, oppWeapons: isC ? data.t_weapons : data.weapons, isChallenger: isC });
      setEntryOpponent(opp);
      setEntryMode(baseMode);
      if (!isRegularMode(baseMode)) setSeasonSubMode(baseMode as SeasonChallengeMode);
      setBetAmount(data.bet_gc || 0);

      if (data.c_ready && data.t_ready) {
        setIncomingChallenge(null);
        setMatchPhase('scoring');
      } else if (modeRaw.includes('_accepted') || modeRaw.includes('_accepting') || modeRaw.includes('_settling')) {
        setIncomingChallenge(null);
        setMatchPhase('scoring');
      } else if (isC) {
        setIncomingChallenge(null);
        setMatchPhase('waiting_sync');
      } else {
        const baseMode = normalizeChallengeMode(data.mode);
        setIncomingChallenge({
          id: data.id,
          challengerName: data.challenger_name,
          mode: baseMode,
          betGc: data.bet_gc || 0,
        });
        setMatchPhase('idle');
        setActiveMatch(null);
      }
    } else {
      const prevMatch = activeMatchRef.current;
      if (prevMatch) clearRandomDraftState(prevMatch.id, prevMatch.isChallenger, username);
      setIncomingChallenge(null);
      setRerollCount(0);
      if (matchPhaseRef.current !== 'idle') { setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false); }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    fetchData(); fetchRankers(); return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || !profile) return;
    void grantDailyLoginRewardIfNeeded();
  }, [user?.id, profile]);

  useEffect(() => {
    if (!user?.id) {
      setRewardChestQueue([]);
      setActiveRewardChest(null);
      setRewardChestOpening(false);
      setRewardChestClaiming(false);
      setRewardChestRewardGc(null);
      return;
    }
    const state = readRandomRewardState(user.id);
    setRewardChestQueue(state.pendingChests);
  }, [user?.id]);

  useEffect(() => {
    if (activeRewardChest || rewardChestQueue.length === 0) return;
    setActiveRewardChest(rewardChestQueue[0]);
    setRewardChestOpening(false);
    setRewardChestClaiming(false);
    setRewardChestRewardGc(null);
  }, [rewardChestQueue, activeRewardChest]);

  useEffect(() => {
    if (!user?.id || !currentUserName || !Array.isArray(logs)) return;
    const myName = (currentUserName || '').trim().toLowerCase();
    if (!myName) return;

    const randomMatchesForMe = [...logs]
      .filter((m) => {
        const mode = String(m?.match_type || '').toLowerCase();
        if (!mode.includes('random')) return false;
        const left = String(m?.left_player_name || m?.left_player || '').trim().toLowerCase();
        const right = String(m?.right_player_name || m?.right_player || '').trim().toLowerCase();
        return left === myName || right === myName;
      })
      .sort((a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime());

    const state = readRandomRewardState(user.id);
    if (!state.seeded) {
      state.seeded = true;
      state.processedMatchIds = randomMatchesForMe.map((m) => getMatchStableId(m)).filter(Boolean).slice(-1200);
      writeRandomRewardState(user.id, state);
      setRewardChestQueue(state.pendingChests);
      return;
    }

    const processed = new Set(state.processedMatchIds || []);
    let touched = false;
    let addedChestCount = 0;

    randomMatchesForMe.forEach((match) => {
      const stableId = getMatchStableId(match);
      if (!stableId || processed.has(stableId)) return;
      processed.add(stableId);
      touched = true;

      const matchKstDate = getKstDateKeyFromInput(match?.created_at);
      if (state.lastFirstDailyDate !== matchKstDate) {
        state.lastFirstDailyDate = matchKstDate;
        state.pendingChests.push({
          id: `${stableId}:daily`,
          reason: 'first_daily_random',
          sourceMatchId: stableId,
          createdAt: new Date().toISOString(),
        });
        addedChestCount += 1;
      } else {
        state.postFirstMatchCount = Math.max(0, Number(state.postFirstMatchCount || 0)) + 1;
        if (state.postFirstMatchCount >= 3) {
          state.postFirstMatchCount = 0;
          state.pendingChests.push({
            id: `${stableId}:cycle`,
            reason: 'every_three_random',
            sourceMatchId: stableId,
            createdAt: new Date().toISOString(),
          });
          addedChestCount += 1;
        }
      }
    });

    if (!touched) return;
    state.processedMatchIds = Array.from(processed).slice(-1200);
    state.pendingChests = state.pendingChests.slice(-32);
    writeRandomRewardState(user.id, state);
    if (addedChestCount > 0) {
      playSFX('success');
    }
    setRewardChestQueue(state.pendingChests);
  }, [logs, user?.id, currentUserName]);

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
    if (!eventShopStorageKey) {
      setEventItemCounts({});
      return;
    }
    try {
      const raw = localStorage.getItem(eventShopStorageKey);
      if (!raw) {
        setEventItemCounts({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      setEventItemCounts(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setEventItemCounts({});
    }
  }, [eventShopStorageKey]);

  useEffect(() => {
    if (!eventShopStorageKey) return;
    localStorage.setItem(eventShopStorageKey, JSON.stringify(eventItemCounts));
  }, [eventShopStorageKey, eventItemCounts]);

  useEffect(() => {
    if (!profile) return;
    const shopIdSet = new Set(SHOP_ITEMS.map((item) => item.id));
    const dbOwnedRaw = Array.isArray((profile as any).owned_cosmetics) ? ((profile as any).owned_cosmetics as string[]) : [];
    const dbCosmeticOwned = dbOwnedRaw.filter((id) => shopIdSet.has(id));
    const dbMetaOwned = dbOwnedRaw
      .map((entry) => String(entry || '').trim())
      .filter((entry) => entry.startsWith('meta:'));
    const dbEventCounts = parseEventCountsFromOwnedCosmetics(dbOwnedRaw);
    const localCosmetics = readLocalCosmeticSnapshot().owned;
    const localEventCounts = readLocalEventSnapshot().counts;

    const mergedCosmeticOwned = Array.from(new Set([...dbCosmeticOwned, ...localCosmetics, ...defaultOwnedIds]));
    const mergedEventCounts = Object.keys({ ...dbEventCounts, ...localEventCounts }).reduce<Record<string, number>>((acc, key) => {
      acc[key] = Math.max(dbEventCounts[key] || 0, localEventCounts[key] || 0);
      return acc;
    }, {});

    setOwnedItemIds(mergedCosmeticOwned);
    setEventItemCounts(mergedEventCounts);
    setOwnedMetaEntries(Array.from(new Set(dbMetaOwned)));
    setEquippedItems({
      nameColor: (profile as any).equipped_name_color || 'name_default',
      nameStyle: (profile as any).equipped_name_style || 'style_default',
      borderFx: (profile as any).equipped_border_fx || 'border_default',
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!user?.id || !profile || purchaseRecoveryRunningRef.current) return;
    const dbOwnedRaw = Array.isArray((profile as any).owned_cosmetics) ? ((profile as any).owned_cosmetics as string[]) : [];
    const dbEventCounts = parseEventCountsFromOwnedCosmetics(dbOwnedRaw);
    const shopIdSet = new Set(SHOP_ITEMS.map((item) => item.id));
    const dbCosmeticOwned = dbOwnedRaw.filter((id) => shopIdSet.has(id));
    const hasLegacyCompensationApplied = dbOwnedRaw.includes(legacyCompensationMarker);
    const localCosmeticSnapshot = readLocalCosmeticSnapshot();
    const localEventSnapshot = readLocalEventSnapshot();
    const localCosmeticOwned = localCosmeticSnapshot.owned;
    const localEventCounts = localEventSnapshot.counts;

    const missingCosmetics = localCosmeticOwned.filter((id) => !dbCosmeticOwned.includes(id) && !defaultOwnedIds.includes(id));
    const missingEventCounts = Object.entries(localEventCounts).reduce<Record<string, number>>((acc, [eventId, localCount]) => {
      const gap = Math.max(0, Math.floor(Number(localCount || 0)) - Math.floor(Number(dbEventCounts[eventId] || 0)));
      if (gap > 0) acc[eventId] = gap;
      return acc;
    }, {});

    if (!purchaseHistoryStorageKey) return;
    let purchaseHistory: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(purchaseHistoryStorageKey);
      purchaseHistory = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      purchaseHistory = {};
    }

    Object.entries(purchaseHistory).forEach(([key, countRaw]) => {
      const count = Math.max(0, Math.floor(Number(countRaw || 0)));
      if (!count) return;
      if (key.startsWith('event:')) {
        const eventId = key.replace(/^event:/, '');
        const dbCount = Math.floor(Number(dbEventCounts[eventId] || 0));
        const localCount = Math.floor(Number(localEventCounts[eventId] || 0));
        const maxKnown = Math.max(dbCount, localCount);
        const gap = Math.max(0, count - maxKnown);
        if (gap > 0) {
          missingEventCounts[eventId] = Math.max(missingEventCounts[eventId] || 0, gap);
        }
      } else if (shopIdSet.has(key) && !defaultOwnedIds.includes(key) && !dbCosmeticOwned.includes(key)) {
        if (!missingCosmetics.includes(key)) missingCosmetics.push(key);
      }
    });

    const missingCosmeticRefund = missingCosmetics.reduce((sum, itemId) => {
      const item = SHOP_ITEMS.find((v) => v.id === itemId);
      return sum + (item?.cost || 0);
    }, 0);
    const missingEventRefund = Object.entries(missingEventCounts).reduce((sum, [eventId, gap]) => {
      const item = EVENT_SHOP_ITEMS.find((v) => v.id === eventId);
      return sum + (item?.cost || 0) * Math.max(0, Math.floor(Number(gap || 0)));
    }, 0);
    const hasPaidOwnedOnDb =
      dbCosmeticOwned.some((id) => (SHOP_ITEMS.find((item) => item.id === id)?.cost || 0) > 0) ||
      Object.values(dbEventCounts).some((count) => Number(count || 0) > 0);
    const localHasAnyPurchaseHint =
      localCosmeticSnapshot.hasAnyHint ||
      localEventSnapshot.hasAnyHint ||
      Object.keys(purchaseHistory).length > 0;
    const shouldApplyLegacyCompensation =
      !hasPaidOwnedOnDb &&
      localHasAnyPurchaseHint &&
      !hasLegacyCompensationApplied &&
      missingCosmeticRefund + missingEventRefund <= 0;
    const fallbackCompensation = shouldApplyLegacyCompensation ? LEGACY_SHOP_COMPENSATION_GC : 0;
    const totalRefund = missingCosmeticRefund + missingEventRefund + fallbackCompensation;

    const recoverySignature = `c:${missingCosmetics.slice().sort().join(',')}|e:${Object.entries(missingEventCounts).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')}|r:${totalRefund}|legacy:${shouldApplyLegacyCompensation ? 1 : 0}`;
    if (missingCosmetics.length === 0 && Object.keys(missingEventCounts).length === 0 && totalRefund <= 0 && !shouldApplyLegacyCompensation) return;
    if (purchaseRecoveryStorageKey) {
      try {
        const prevSig = localStorage.getItem(purchaseRecoveryStorageKey) || '';
        if (prevSig === recoverySignature) return;
      } catch {
        // ignore
      }
    }

    purchaseRecoveryRunningRef.current = true;
    (async () => {
      try {
        const currentGc = Math.max(0, Number((profile as any)?.gc ?? 1000));
        const nextGc = currentGc + totalRefund;
        const mergedCosmetics = Array.from(new Set([...dbCosmeticOwned, ...localCosmeticOwned, ...missingCosmetics, ...defaultOwnedIds]));
        const mergedEventCounts = Object.keys({ ...dbEventCounts, ...localEventCounts, ...missingEventCounts }).reduce<Record<string, number>>((acc, key) => {
          acc[key] = Math.max(
            Math.floor(Number(dbEventCounts[key] || 0)),
            Math.floor(Number(localEventCounts[key] || 0)),
            Math.floor(Number(missingEventCounts[key] || 0)) + Math.floor(Number(dbEventCounts[key] || 0))
          );
          return acc;
        }, {});
        const nextMetaEntries = Array.from(
          new Set([
            ...ownedMetaEntries,
            ...(shouldApplyLegacyCompensation ? [legacyCompensationMarker] : []),
          ])
        );
        const mergedOwnedPayload = encodeEventCountsIntoOwnedCosmetics(
          mergedCosmetics,
          mergedEventCounts,
          nextMetaEntries
        );

        const { error } = await supabase
          .from('profiles')
          .update({
            gc: nextGc,
            owned_cosmetics: mergedOwnedPayload,
          })
          .eq('id', user.id);
        if (error) {
          console.warn('[purchase-recovery] failed:', error.message);
          return;
        }

        setOwnedItemIds(mergedCosmetics);
        setEventItemCounts(mergedEventCounts);
        setOwnedMetaEntries(nextMetaEntries);
        setProfile((prev: any) => (prev ? { ...prev, gc: nextGc, owned_cosmetics: mergedOwnedPayload } : prev));
        setRankers((prev) => prev.map((r) => (r.id === user.id ? { ...r, gc: nextGc, owned_cosmetics: mergedOwnedPayload } : r)));
        if (purchaseRecoveryStorageKey) {
          try {
            localStorage.setItem(purchaseRecoveryStorageKey, recoverySignature);
          } catch {
            // ignore
          }
        }
        if (totalRefund > 0) {
          showStatusPopup(
            'success',
            '구매 복구 완료',
            shouldApplyLegacyCompensation
              ? `정밀 복구 기록이 부족해 보상 환불 ${totalRefund.toLocaleString()} GP를 지급했습니다.`
              : `누락된 아이템 소유권을 복구했고, 차감되었던 ${totalRefund.toLocaleString()} GP를 환급했습니다.`,
            { autoCloseMs: 2200, hideConfirm: true }
          );
        }
      } finally {
        purchaseRecoveryRunningRef.current = false;
      }
    })();
  }, [user?.id, profile?.id, profile?.gc, purchaseHistoryStorageKey, purchaseRecoveryStorageKey, ownedMetaEntries]);

  useEffect(() => {
    if (!user?.id || !profile) {
      setShowIngameSetupModal(false);
      return;
    }
    setIngameNicknameDraft(currentUserIngameNickname || '');
    setIngamePlatformDraft(currentUserIngamePlatform);
    setShowIngameSetupModal(!currentUserIngameNickname);
  }, [user?.id, profile?.id, currentUserIngameNickname, currentUserIngamePlatform]);
  useEffect(() => {
    if (!user?.id || !profile) return;
    const nickname = String(currentUserIngameNickname || '').trim();
    if (!nickname) return;
    const encodedPlatformRaw = String((profile as any).favorite_legend || '').trim();
    const encodedNicknameRaw = String((profile as any).favorite_weapon || '').trim();
    const hasEncodedProfile =
      /^INGAME_PLATFORM:(steam|ea)$/i.test(encodedPlatformRaw) &&
      /^INGAME_CODE:/i.test(encodedNicknameRaw);
    if (hasEncodedProfile) return;

    const syncKey = `${user.id}:${currentUserIngamePlatform}:${nickname}`;
    if (ingameProfileBackfillRef.current === syncKey) return;
    ingameProfileBackfillRef.current = syncKey;

    (async () => {
      try {
        await supabase
          .from('profiles')
          .update({
            favorite_legend: `INGAME_PLATFORM:${currentUserIngamePlatform}`,
            favorite_weapon: `INGAME_CODE:${nickname}`,
          })
          .eq('id', user.id);
        fetchRankers();
        if (user?.id) fetchProfile(user.id);
      } catch {
        // ignore backfill failure
      }
    })();
  }, [user?.id, profile?.id, (profile as any)?.favorite_legend, (profile as any)?.favorite_weapon, currentUserIngameNickname, currentUserIngamePlatform]);

  useEffect(() => {
    if (!user || !profile) return;
    const timer = window.setTimeout(async () => {
      const ownedCosmeticsPayload = encodeEventCountsIntoOwnedCosmetics(
        Array.from(new Set([...ownedItemIds, ...defaultOwnedIds])),
        eventItemCounts,
        ownedMetaEntries
      );
      const payload = {
        owned_cosmetics: ownedCosmeticsPayload,
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
  }, [user?.id, profile?.id, ownedItemIds, eventItemCounts, ownedMetaEntries, equippedItems]);

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
  }, [activeMenu, matchPhase, logs.length, rankers.length, miniRankMode, miniSearchQuery]);

  useEffect(() => {
    const matchLogChannel = supabase
      .channel('matches_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchData();
        fetchRankers();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(matchLogChannel);
    };
  }, []);

  useEffect(() => {
    const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
    const formatDeltaLine = (label: string, delta: number) => {
      if (delta >= 0) return `${label} +${delta}획득!`;
      return `${label} ${Math.abs(delta)}차감`;
    };
    const resultPopupChannel = supabase
      .channel('match_result_popup_sync')
      .on('broadcast', { event: 'match_result' }, ({ payload }: any) => {
        const me = normalize(currentUserName);
        if (!me) return;
        const challenger = normalize(payload?.challengerName);
        const target = normalize(payload?.targetName);
        const isChallenger = challenger === me;
        const isTarget = target === me;
        if (!isChallenger && !isTarget) return;

        const popupId = String(payload?.popupId || payload?.matchId || '').trim();
        if (!popupId) return;
        const dedupeKey = `result:${popupId}`;
        if (lastResultPopupMatchIdRef.current === dedupeKey) return;
        lastResultPopupMatchIdRef.current = dedupeKey;

        const didWin = normalize(payload?.winnerName) === me;
        const pointLabel = String(payload?.pointLabel || 'SP (시즌포인트)');
        const pointDelta = Number(
          isChallenger ? payload?.challengerPointDelta ?? 0 : payload?.targetPointDelta ?? 0
        );
        const gcDelta = Number(
          isChallenger ? payload?.challengerGcDelta ?? 0 : payload?.targetGcDelta ?? 0
        );
        const cWin = Number(payload?.cWin ?? 0);
        const tWin = Number(payload?.tWin ?? 0);
        const myScore = isChallenger ? cWin : tWin;
        const oppScore = isChallenger ? tWin : cWin;

        triggerResultFx(didWin, didWin ? '전투 승리! 순위가 갱신되었습니다.' : '전투 종료! 결과가 반영되었습니다.');
        showStatusPopup(
          didWin ? 'victory' : 'info',
          didWin ? '전투 승리! 결과 반영 완료' : '전투 종료! 결과 반영 완료',
          `스코어 ${myScore} : ${oppScore}\n${formatDeltaLine(pointLabel, pointDelta)}\n${formatDeltaLine('GC (갤럭시 코인)', gcDelta)}`
        );
        const active = activeMatchRef.current;
        if (active && String(payload?.matchId || '') === String(active.id)) {
          setMatchPhase('idle');
          setActiveMatch(null);
          setWaitingForScore(false);
          setMyWins(null);
          setMyLosses(null);
          setRerollCount(0);
          applyDefaultLoadoutForMode(active.mode);
        }
      })
      .subscribe();
    resultPopupChannelRef.current = resultPopupChannel;
    return () => {
      if (resultPopupChannelRef.current === resultPopupChannel) {
        resultPopupChannelRef.current = null;
      }
      supabase.removeChannel(resultPopupChannel);
    };
  }, [currentUserName]);

  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles_realtime_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const nextRow: any = payload.new || {};
        if (!nextRow?.id) return;
        const resolved = resolveIngameProfile(nextRow);
        setRankers((prev) =>
          prev.map((row) =>
            row.id === nextRow.id
              ? { ...row, ...nextRow, ingame_nickname: resolved.nickname, ingame_platform: resolved.platform }
              : row
          )
        );
        setSelectedPlayer((prev) =>
          prev && prev.id === nextRow.id
            ? { ...prev, ...nextRow, ingame_nickname: resolved.nickname, ingame_platform: resolved.platform }
            : prev
        );
        setProfile((prev) =>
          prev && prev.id === nextRow.id
            ? { ...prev, ...nextRow, ingame_nickname: resolved.nickname, ingame_platform: resolved.platform }
            : prev
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  useEffect(() => {
    if (!currentUserName) return;
    const channel = supabase.channel('unified_challenge_sync_' + currentUserName.replace(/[^a-zA-Z0-9]/g, ''))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, payload => {
           const currentMatch = activeMatchRef.current; const currentPhase = matchPhaseRef.current; const isWaiting = waitingForScoreRef.current;
           const meNorm = normalizeName(currentUserName);
           const rowAffectsMe = (row: any) => {
             if (!row) return false;
             const challengerNorm = normalizeName(row?.challenger_name);
             const targetNorm = normalizeName(row?.target_name);
             const rowId = String(row?.id || '');
             const activeId = String(currentMatch?.id || '');
             return challengerNorm === meNorm || targetNorm === meNorm || (!!activeId && rowId === activeId);
           };
	           if (payload.eventType === 'INSERT') {
	              const newChallenge = payload.new;
	              if (newChallenge.target_name.trim() === currentUserName.trim()) {
	                 const baseMode = normalizeChallengeMode(newChallenge.mode);
	                 playSFX('matchStart');
	                 setIncomingChallenge({
	                   id: newChallenge.id,
	                   challengerName: newChallenge.challenger_name,
                   mode: baseMode,
                   betGc: newChallenge.bet_gc || 0,
	                 });
	                 setEntryOpponent(newChallenge.challenger_name);
	                 setEntryMode(baseMode);
	                 if (!isRegularMode(baseMode)) setSeasonSubMode(baseMode as SeasonChallengeMode);
	                 setBetAmount(newChallenge.bet_gc || 0);
	                 setMatchPhase('idle');
	              }
               if (rowAffectsMe(newChallenge)) {
                 checkActiveChallenge(currentUserName);
               }
	           }
           if (payload.eventType === 'UPDATE') {
                const updated = payload.new;
               const pendingIncoming = incomingChallengeRef.current;
               if (
                 pendingIncoming &&
                 updated.id === pendingIncoming.id &&
                 (updated.mode.includes('_accepted') || updated.mode.includes('_accepting') || updated.mode.includes('_settling'))
               ) {
                 setIncomingChallenge(null);
               }
                if (currentMatch && updated.id === currentMatch.id) {
                    if (currentPhase === 'waiting_sync' && updated.mode.includes('_accepted')) {
                        playSFX('matchStart');
                        setMatchPhase('scoring');
                    }
                   if (currentPhase === 'scoring') {
                       setActiveMatch(prev => prev ? { ...prev, oppLegend: prev.isChallenger ? updated.t_legend : updated.legend, oppWeapons: prev.isChallenger ? updated.t_weapons : updated.weapons } : prev);
                    }
                }
                if (rowAffectsMe(updated) || rowAffectsMe(payload.old)) {
                  checkActiveChallenge(currentUserName);
                }
            }
           if (payload.eventType === 'DELETE') {
	                const deletedRow = payload.old;
                  const deletedWasSettledResult = isSettledChallengeRow(deletedRow);
	                const pendingIncoming = incomingChallengeRef.current;
	                if (pendingIncoming && deletedRow.id === pendingIncoming.id) {
	                    setIncomingChallenge(null);
	                }
		                if (currentMatch && deletedRow.id === currentMatch.id) {
		                    if (currentPhase === 'scoring' || isWaiting || currentPhase === 'waiting_sync') {
		                        const suppressPopup = suppressNextDeletePopupChallengeIdRef.current === deletedRow.id;
		                        suppressNextDeletePopupChallengeIdRef.current = null;
		                        playSFX('success');
                           const shouldShowDeclinePopup =
                             !suppressPopup &&
                             !deletedWasSettledResult &&
                             currentPhase === 'waiting_sync' &&
                             !isWaiting;
	 	                       if (shouldShowDeclinePopup) {
	                            const wasSenderWaiting =
	                               Boolean(currentMatch?.isChallenger) ||
	                               normalizeName(deletedRow?.challenger_name) === normalizeName(currentUserName);
	                            if (wasSenderWaiting) {
	                              const targetDisplay =
                                String(currentMatch?.opponent || '').trim() ||
                                String(deletedRow?.target_name || '').trim() ||
                                '상대방';
                              showStatusPopup('error', '매치 종료', `(${targetDisplay}님이 잔뜩 쫄아서 거절했습니다 ㅋㅋㅋㅋㅋ)`);
                            }
 	                        }
	                       setMatchPhase('idle');
	                       setActiveMatch(null);
                       setWaitingForScore(false);
                       setMyWins(null);
                       setMyLosses(null);
                       applyDefaultLoadoutForMode(currentMatch.mode);
                       setRerollCount(0);
                       clearRandomDraftState(currentMatch.id, currentMatch.isChallenger, currentUserName);
                       fetchData();
		                       fetchRankers();
		                       if(user) fetchProfile(user.id);
		                   } else if (currentPhase === 'waiting_sync') {
		                       playSFX('click');
	                         if (!deletedWasSettledResult) {
	                          const wasSenderWaiting =
	                            Boolean(currentMatch?.isChallenger) ||
	                            normalizeName(deletedRow?.challenger_name) === normalizeName(currentUserName);
                          if (wasSenderWaiting) {
                            const targetDisplay =
                              String(currentMatch?.opponent || '').trim() ||
                              String(deletedRow?.target_name || '').trim() ||
                              '상대방';
                            showStatusPopup('error', '매치 종료', `(${targetDisplay}님이 잔뜩 쫄아서 거절했습니다 ㅋㅋㅋㅋㅋ)`);
                          }
                        }
                       setRerollCount(0);
                       clearRandomDraftState(currentMatch.id, currentMatch.isChallenger, currentUserName);
                       setMatchPhase('idle');
	                       setActiveMatch(null);
	                       setWaitingForScore(false);
	                   }
                 }
                if (rowAffectsMe(deletedRow)) {
                  checkActiveChallenge(currentUserName);
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
    const { data: matchRows } = await supabase
      .from('matches')
      .select('match_type,winner_name,left_player_name,left_player,right_player_name,right_player,score_left,score_right,created_at');

    if (!profiles) return;

    const normalize = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
    const dayMs = 24 * 60 * 60 * 1000;
    const nowTs = Date.now();
    const tierLevelByRank = (rank1: number | null, totalRanked: number) =>
      getAdaptiveTierLevelByRank(rank1, totalRanked);

    type SimState = {
      regularMatches: number;
      regularWins: number;
      regularLosses: number;
      regularRp: number;
      regularWinStreak: number;
      regularDefenseStack: number;
      lastRegularMatchTs: number;
      seasonMatches: number;
      seasonWins: number;
      seasonLosses: number;
      seasonSp: number;
      seasonWinStreak: number;
      seasonDefenseStack: number;
    };

    const sim: Record<string, SimState> = {};
    const ensure = (name: string) => {
      if (!name) return;
      if (!sim[name]) {
        sim[name] = {
          regularMatches: 0,
          regularWins: 0,
          regularLosses: 0,
          regularRp: 0,
          regularWinStreak: 0,
          regularDefenseStack: 0,
          lastRegularMatchTs: 0,
          seasonMatches: 0,
          seasonWins: 0,
          seasonLosses: 0,
          seasonSp: 0,
          seasonWinStreak: 0,
          seasonDefenseStack: 0,
        };
      }
    };

    profiles.forEach((p) => ensure(normalize(p.display_name || p.id)));

    const getRegularSortedNames = () =>
      Object.keys(sim)
        .filter((k) => sim[k].regularWins > 0)
        .sort((a, b) => {
          if (sim[b].regularRp !== sim[a].regularRp) return sim[b].regularRp - sim[a].regularRp;
          if (sim[b].regularWins !== sim[a].regularWins) return sim[b].regularWins - sim[a].regularWins;
          if (sim[b].regularMatches !== sim[a].regularMatches) return sim[a].regularMatches - sim[b].regularMatches;
          return a.localeCompare(b);
        });

    const getSeasonSortedNames = () =>
      Object.keys(sim)
        .filter((k) => sim[k].seasonMatches > 0)
        .sort((a, b) => {
          if (sim[b].seasonSp !== sim[a].seasonSp) return sim[b].seasonSp - sim[a].seasonSp;
          if (sim[b].seasonWins !== sim[a].seasonWins) return sim[b].seasonWins - sim[a].seasonWins;
          if (sim[b].seasonMatches !== sim[a].seasonMatches) return sim[a].seasonMatches - sim[b].seasonMatches;
          return a.localeCompare(b);
        });

    const getRegularRankIndexBefore = (name: string) => {
      const sorted = getRegularSortedNames();
      const idx = sorted.indexOf(name);
      return idx >= 0 ? idx : null;
    };
    const getSeasonRankIndexBefore = (name: string) => {
      const sorted = getSeasonSortedNames();
      const idx = sorted.indexOf(name);
      return idx >= 0 ? idx : null;
    };
    const getRegularTopBefore = () => getRegularSortedNames()[0] || null;
    const getSeasonTopBefore = () => getSeasonSortedNames()[0] || null;

    const sortedMatches = [...(matchRows || [])].sort(
      (a: any, b: any) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
    );

	    sortedMatches.forEach((m: any) => {
	      const modeRaw = String(m?.match_type || '').toLowerCase().trim();
	      if (!KNOWN_CHALLENGE_MODES.includes(modeRaw as ChallengeMode)) return;
	      const mode = normalizeChallengeMode(modeRaw);
	      const left = normalize(m?.left_player_name || m?.left_player || '');
	      const right = normalize(m?.right_player_name || m?.right_player || '');
	      if (!left || !right) return;

      ensure(left);
      ensure(right);

      const leftScore = Number(m?.score_left ?? 0) || 0;
      const rightScore = Number(m?.score_right ?? 0) || 0;
      const winnerFromName = normalize(m?.winner_name || '');
      const winner = winnerFromName === left || winnerFromName === right ? winnerFromName : leftScore >= rightScore ? left : right;
      const loser = winner === left ? right : left;
      const winnerScore = winner === left ? leftScore : rightScore;
      const loserScore = winner === left ? rightScore : leftScore;
      const ts = new Date(m?.created_at || 0).getTime();
      const safeTs = Number.isFinite(ts) ? ts : nowTs;

      const winnerState = sim[winner];
      const loserState = sim[loser];

	      if (isRegularMode(mode)) {
        const topBefore = getRegularTopBefore();
        const winnerRankBefore = getRegularRankIndexBefore(winner);
        const loserRankBefore = getRegularRankIndexBefore(loser);
        const isHigherRankWin =
          loserRankBefore !== null &&
          (winnerRankBefore === null || loserRankBefore < winnerRankBefore);
        const isHigherRankLoss =
          winnerRankBefore !== null &&
          (loserRankBefore === null || winnerRankBefore < loserRankBefore);

        winnerState.regularMatches += 1;
        winnerState.regularWins += 1;
        winnerState.lastRegularMatchTs = safeTs;
        loserState.regularMatches += 1;
        loserState.regularLosses += 1;
        loserState.lastRegularMatchTs = safeTs;

        const winGain = calcRegularWinGain({ winnerScore, isHigherRankWin });
        winnerState.regularRp = Math.max(0, winnerState.regularRp + winGain);
        winnerState.regularWinStreak += 1;

        const loseDelta = calcRegularLoseDelta({ loserScore, winnerScore, isHigherRankLoss });
        loserState.regularRp = Math.max(0, loserState.regularRp + loseDelta);
        loserState.regularWinStreak = 0;
        loserState.regularDefenseStack = 0;

        if (topBefore === winner && winner === right) {
          winnerState.regularDefenseStack += 1;
        }
        if (topBefore === loser) {
          loserState.regularDefenseStack = 0;
        }
      } else {
        const topBefore = getSeasonTopBefore();
        const winnerRankBefore = getSeasonRankIndexBefore(winner);
        const loserRankBefore = getSeasonRankIndexBefore(loser);
        const isHigherRankWin =
          loserRankBefore !== null &&
          (winnerRankBefore === null || loserRankBefore < winnerRankBefore);
        const isHigherRankLoss =
          winnerRankBefore !== null &&
          (loserRankBefore === null || winnerRankBefore < loserRankBefore);

        winnerState.seasonMatches += 1;
        winnerState.seasonWins += 1;
        loserState.seasonMatches += 1;
        loserState.seasonLosses += 1;

        const nextSeasonStreak = winnerState.seasonWinStreak + 1;
        const winnerReward = calcSeasonWinReward({
          winnerScore,
          isHigherRankWin,
        });
        const loserReward = calcSeasonLoseReward({ loserScore, isHigherRankLoss });
        winnerState.seasonSp += winnerReward.sp;
        loserState.seasonSp += loserReward.sp;

        winnerState.seasonWinStreak = nextSeasonStreak;
        loserState.seasonWinStreak = 0;
        loserState.seasonDefenseStack = 0;

        if (topBefore === winner && winner === right) {
          winnerState.seasonDefenseStack += 1;
        }
        if (topBefore === loser) {
          loserState.seasonDefenseStack = 0;
        }
      }
    });

    Object.values(sim).forEach((s) => {
      if (s.regularWins <= 0 || !s.lastRegularMatchTs) return;
      const idleDays = Math.floor((nowTs - s.lastRegularMatchTs) / dayMs);
      const decayDays = idleDays - REGULAR_INACTIVE_GRACE_DAYS;
      if (decayDays > 0) {
        s.regularRp = Math.max(0, s.regularRp - decayDays * REGULAR_INACTIVE_DECAY_PER_DAY);
      }
    });

    const base = profiles.map((r) => {
      const key = normalize(r.display_name || r.id);
      const ingame = resolveIngameProfile(r);
      const s = sim[key] || {
        regularMatches: 0,
        regularWins: 0,
        regularLosses: 0,
        regularRp: 0,
        regularWinStreak: 0,
        regularDefenseStack: 0,
        lastRegularMatchTs: 0,
        seasonMatches: 0,
        seasonWins: 0,
        seasonLosses: 0,
        seasonSp: 0,
        seasonWinStreak: 0,
        seasonDefenseStack: 0,
      };
      return {
        ...r,
        display_name: r.display_name || 'GUEST',
        wins: r.wins || 0,
        losses: r.losses || 0,
        win_rate: (r.wins + r.losses) > 0 ? (((r.wins) / (r.wins + r.losses)) * 100).toFixed(1) + '%' : '0.0%',
        avatar_url: r.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        ingame_nickname: ingame.nickname,
        ingame_platform: ingame.platform,
        gc: typeof r.gc === 'number' ? r.gc : 1000,
        regular_rp: s.regularRp,
        season_sp: s.seasonSp,
        rp: s.seasonSp,
        regular_matches: s.regularMatches,
        regular_wins: s.regularWins,
        regular_losses: s.regularLosses,
        season_matches: s.seasonMatches,
        season_wins: s.seasonWins,
        season_losses: s.seasonLosses,
        regular_win_streak: s.regularWinStreak,
        season_win_streak: s.seasonWinStreak,
        regular_defense_stack: s.regularDefenseStack,
        season_defense_stack: s.seasonDefenseStack,
        defense_stack: s.regularDefenseStack,
        win_streak: s.regularWinStreak,
        owned_cosmetics: Array.isArray(r.owned_cosmetics) ? r.owned_cosmetics : [...defaultOwnedIds],
        equipped_name_color: r.equipped_name_color || 'name_default',
        equipped_name_style: r.equipped_name_style || 'style_default',
        equipped_border_fx: r.equipped_border_fx || 'border_default',
      };
    });

    const regularSorted = [...base].sort((a, b) => {
      const aPlaced = (a.regular_wins || 0) > 0;
      const bPlaced = (b.regular_wins || 0) > 0;
      if (aPlaced !== bPlaced) return aPlaced ? -1 : 1;
      if (!aPlaced && !bPlaced) return normalize(a.display_name).localeCompare(normalize(b.display_name));
      if ((b.regular_rp || 0) !== (a.regular_rp || 0)) return (b.regular_rp || 0) - (a.regular_rp || 0);
      if ((b.regular_wins || 0) !== (a.regular_wins || 0)) return (b.regular_wins || 0) - (a.regular_wins || 0);
      if ((a.regular_matches || 0) !== (b.regular_matches || 0)) return (a.regular_matches || 0) - (b.regular_matches || 0);
      return normalize(a.display_name).localeCompare(normalize(b.display_name));
    });
    const regularPlacedCount = regularSorted.filter((r: any) => (r.regular_wins || 0) > 0).length;
    let regularDisplayIdx = 0;
    regularSorted.forEach((r: any, i) => {
      const placed = (r.regular_wins || 0) > 0;
      r.rankIndex = i;
      r.regular_display_index = placed ? regularDisplayIdx++ : null;
      r.regular_tier_level = placed ? tierLevelByRank((r.regular_display_index ?? 0) + 1, regularPlacedCount) : 0;
    });

    const seasonSorted = [...base].sort((a, b) => {
      const aPlayed = (a.season_matches || 0) > 0;
      const bPlayed = (b.season_matches || 0) > 0;
      if (aPlayed !== bPlayed) return aPlayed ? -1 : 1;
      if (!aPlayed && !bPlayed) return normalize(a.display_name).localeCompare(normalize(b.display_name));
      if ((b.season_sp || 0) !== (a.season_sp || 0)) return (b.season_sp || 0) - (a.season_sp || 0);
      if ((b.season_wins || 0) !== (a.season_wins || 0)) return (b.season_wins || 0) - (a.season_wins || 0);
      if ((a.season_matches || 0) !== (b.season_matches || 0)) return (a.season_matches || 0) - (b.season_matches || 0);
      return normalize(a.display_name).localeCompare(normalize(b.display_name));
    });
    const seasonRankedCount = seasonSorted.length;
    seasonSorted.forEach((r: any, i) => {
      r.seasonRankIndex = i;
      r.season_display_index = i;
      r.season_tier_level = tierLevelByRank(i + 1, seasonRankedCount);
    });

    const seasonMetaMap = new Map<string, { seasonRankIndex: number; season_display_index: number | null; season_tier_level: number }>();
    seasonSorted.forEach((r: any) => {
      seasonMetaMap.set(normalize(r.display_name), {
        seasonRankIndex: r.seasonRankIndex,
        season_display_index: r.season_display_index,
        season_tier_level: r.season_tier_level ?? 0,
      });
    });
    regularSorted.forEach((r: any) => {
      const key = normalize(r.display_name);
      const seasonMeta = seasonMetaMap.get(key);
      r.seasonRankIndex = seasonMeta?.seasonRankIndex ?? Number.MAX_SAFE_INTEGER;
      r.season_display_index = seasonMeta?.season_display_index ?? null;
      r.season_tier_level = seasonMeta?.season_tier_level ?? 0;
    });

    const regularNow: Record<string, number> = {};
    const seasonNow: Record<string, number> = {};
    regularSorted.forEach((r: any, i) => {
      const key = normalize(r.display_name);
      if (key && typeof r.regular_display_index === 'number') regularNow[key] = i;
    });
    seasonSorted.forEach((r: any, i) => {
      const key = normalize(r.display_name);
      if (key && typeof r.season_display_index === 'number') seasonNow[key] = i;
    });

    const prevRegular = rankHistoryRef.current.regular;
    const prevSeason = rankHistoryRef.current.season;
    const regularDelta: Record<string, number> = {};
    const seasonDelta: Record<string, number> = {};
    Object.keys(regularNow).forEach((key) => {
      regularDelta[key] = typeof prevRegular[key] === 'number' ? prevRegular[key] - regularNow[key] : 0;
    });
    Object.keys(seasonNow).forEach((key) => {
      seasonDelta[key] = typeof prevSeason[key] === 'number' ? prevSeason[key] - seasonNow[key] : 0;
    });

    rankHistoryRef.current = { regular: regularNow, season: seasonNow };
    setRegularRankMoves(regularDelta);
    setSeasonRankMoves(seasonDelta);
    setRankers(regularSorted);
  };

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) {
      const resolvedIngame = resolveIngameProfile(data);
      setProfile({
        ...data,
        ingame_nickname: resolvedIngame.nickname,
        ingame_platform: resolvedIngame.platform,
      });
    }
  };

  const handleLogin = async () => { playSFX('click'); await supabase.auth.signInWithOAuth({ provider: 'discord' }); };
  const handleLogout = async () => { playSFX('click'); await supabase.auth.signOut(); setProfile(null); };
  const persistIngameProfile = async (nicknameRaw: string, platformRaw: IngamePlatform) => {
    if (!user?.id) return false;
    const nickname = String(nicknameRaw || '').trim();
    if (!nickname) {
      showStatusPopup('error', '입력 필요', '인게임 닉네임을 입력해주세요.');
      return false;
    }
    const platform = normalizeIngamePlatform(platformRaw);
    setSavingIngameProfile(true);
    try {
      saveIngameProfileToLocalMap({
        userId: user.id,
        displayName: currentUserName || profile?.display_name || '',
        nickname,
        platform,
      });

      const payloadCandidates: any[] = [
        { favorite_legend: `INGAME_PLATFORM:${platform}`, favorite_weapon: `INGAME_CODE:${nickname}` },
        { ingame_nickname: nickname, ingame_platform: platform },
        { in_game_nickname: nickname, in_game_platform: platform },
        { game_nickname: nickname, game_platform: platform },
        { battle_nickname: nickname, battle_platform: platform },
        platform === 'steam'
          ? { steam_friend_code: nickname, ingame_platform: platform }
          : { ea_nickname: nickname, ingame_platform: platform },
        platform === 'steam'
          ? { steam_friendcode: nickname, ingame_platform: platform }
          : { ea_name: nickname, ingame_platform: platform },
        platform === 'steam'
          ? { steam_code: nickname, game_platform: platform }
          : { ea_id: nickname, game_platform: platform },
        platform === 'steam'
          ? { steam_id: nickname, battle_platform: platform }
          : { origin_id: nickname, battle_platform: platform },
        { ingame_nickname: nickname, ingame_platform: platform },
      ].filter(Boolean);

      let syncedToDb = false;
      let lastError: any = null;
      for (const payload of payloadCandidates) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (!error) {
          syncedToDb = true;
          break;
        }
        lastError = error;
      }

      if (!syncedToDb && lastError) {
        console.warn('[ingame-profile-sync] DB 컬럼 동기화 실패:', lastError.message);
        showStatusPopup(
          'error',
          '저장 실패',
          '인게임 닉네임 정보를 서버에 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.'
        );
        return false;
      }

      setProfile((prev: any) => (prev ? { ...prev, ingame_nickname: nickname, ingame_platform: platform } : prev));
      setRankers((prev) =>
        prev.map((r) =>
          r.id === user.id ? { ...r, ingame_nickname: nickname, ingame_platform: platform } : r
        )
      );
      setIngameNicknameDraft(nickname);
      setIngamePlatformDraft(platform);
      setShowIngameSetupModal(false);
      fetchRankers();
      if (user?.id) fetchProfile(user.id);

      showStatusPopup('success', '저장 완료', '인게임 닉네임 정보가 저장되었습니다.', {
        autoCloseMs: 2200,
        hideConfirm: true,
      });
      return true;
    } finally {
      setSavingIngameProfile(false);
    }
  };
  const grantDailyLoginRewardIfNeeded = async () => {
    if (!user?.id || !profile) return;
    const todayKst = getKstDateKey();
    const checkKey = `${user.id}:${todayKst}`;
    if (dailyRewardSessionCheckedRef.current === checkKey) return;
    if (dailyRewardCheckingRef.current) return;
    dailyRewardCheckingRef.current = true;
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const freshUser = authData?.user;
      if (authErr || !freshUser) return;

      const lastClaimKst = String(freshUser.user_metadata?.last_daily_reward_kst || '');
      if (lastClaimKst === todayKst) {
        dailyRewardSessionCheckedRef.current = checkKey;
        return;
      }

      const { data: freshProfileRow, error: profileReadErr } = await supabase
        .from('profiles')
        .select('gc,daily_reward_kst')
        .eq('id', user.id)
        .maybeSingle();
      if (profileReadErr) {
        console.warn('[daily-reward] profile read failed:', profileReadErr.message);
        return;
      }
      const profileClaimKey = String((freshProfileRow as any)?.daily_reward_kst || '');
      if (profileClaimKey === todayKst) {
        dailyRewardSessionCheckedRef.current = checkKey;
        return;
      }
      const currentGc =
        typeof freshProfileRow?.gc === 'number'
          ? freshProfileRow.gc
          : typeof profile.gc === 'number'
            ? profile.gc
            : 1000;
      const nextGc = currentGc + 100;

      // 원자적(낙관적 락) 1회 지급: 동일 날짜 키 + 현재 GC 스냅샷이 같을 때만 반영
      const { data: claimRow, error: gcErr } = await supabase
        .from('profiles')
        .update({ gc: nextGc, daily_reward_kst: todayKst })
        .eq('id', user.id)
        .eq('gc', currentGc)
        .or(`daily_reward_kst.is.null,daily_reward_kst.neq.${todayKst}`)
        .select('gc,daily_reward_kst')
        .maybeSingle();
      if (gcErr) {
        if (String(gcErr.message || '').toLowerCase().includes('daily_reward_kst')) {
          console.warn('[daily-reward] daily_reward_kst column missing. run db/daily-reward-column.sql once.');
        } else {
          console.warn('[daily-reward] gc update failed:', gcErr.message);
        }
        return;
      }
      if (!claimRow) {
        // 다른 기기/세션이 먼저 지급 완료
        dailyRewardSessionCheckedRef.current = checkKey;
        return;
      }

      const nextMetadata = { ...(freshUser.user_metadata || {}), last_daily_reward_kst: todayKst };
      const { error: metaErr } = await supabase.auth.updateUser({ data: nextMetadata });
      if (metaErr) {
        console.warn('[daily-reward] metadata update failed:', metaErr.message);
      }
      setUser((prev: any) => (prev ? { ...prev, user_metadata: nextMetadata } : prev));

      const awardedGc = typeof claimRow.gc === 'number' ? claimRow.gc : nextGc;
      setProfile((prev: any) => (prev ? { ...prev, gc: awardedGc, daily_reward_kst: todayKst } : prev));
      setRankers((prev) => prev.map((r) => (r.id === user.id ? { ...r, gc: awardedGc, daily_reward_kst: todayKst } : r)));
      playSFX('success');
      showStatusPopup(
        'success',
        '출석 보상 획득!',
        '매일 첫 접속 보상 +100 GC가 지급되었습니다.\n다음 초기화: 매일 00:00 (KST)'
      );
      dailyRewardSessionCheckedRef.current = checkKey;
    } finally {
      dailyRewardCheckingRef.current = false;
    }
  };

  const removeConsumedRewardChest = (chestId: string) => {
    if (!user?.id) return;
    const state = readRandomRewardState(user.id);
    state.pendingChests = (state.pendingChests || []).filter((c) => c.id !== chestId);
    writeRandomRewardState(user.id, state);
    setRewardChestQueue(state.pendingChests);
  };

  const handleOpenRewardChest = async () => {
    if (!user?.id || !activeRewardChest || rewardChestClaiming || rewardChestRewardGc !== null) return;
    playSFX('click');
    setRewardChestClaiming(true);
    setRewardChestOpening(true);
    await new Promise((resolve) => setTimeout(resolve, 760));

    const rewardGc = drawRandomChestGcReward();
    const { data: freshProfile } = await supabase.from('profiles').select('gc').eq('id', user.id).single();
    const currentGc = typeof freshProfile?.gc === 'number' ? freshProfile.gc : (typeof profile?.gc === 'number' ? profile.gc : 1000);
    const nextGc = currentGc + rewardGc;
    const { error } = await supabase.from('profiles').update({ gc: nextGc }).eq('id', user.id);
    if (error) {
      playSFX('error');
      setRewardChestOpening(false);
      setRewardChestClaiming(false);
      showStatusPopup('error', '보상 상자 오류', `보상 지급 중 문제가 발생했습니다.\n${error.message}`);
      return;
    }

    setProfile((prev: any) => (prev ? { ...prev, gc: nextGc } : prev));
    setRankers((prev) => prev.map((r) => (r.id === user.id ? { ...r, gc: nextGc } : r)));
    removeConsumedRewardChest(activeRewardChest.id);
    setRewardChestRewardGc(rewardGc);
    setRewardChestOpening(false);
    setRewardChestClaiming(false);
    playSFX('success');
  };

  const handleRewardChestClose = () => {
    if (rewardChestClaiming) return;
    playSFX('click');
    setActiveRewardChest(null);
    setRewardChestRewardGc(null);
    setRewardChestOpening(false);
  };

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

    if ((profile.gc ?? 1000) < item.cost) {
      playSFX('error');
      alert(`GC가 부족합니다. (필요: ${item.cost} / 보유: ${profile.gc ?? 1000})`);
      return;
    }

    playSFX('click');
    const currentGc = Number(profile.gc ?? 1000);
    const nextGc = currentGc - item.cost;
    const dbOwnedRaw = Array.isArray((profile as any).owned_cosmetics) ? ((profile as any).owned_cosmetics as string[]) : [];
    const dbEventCounts = parseEventCountsFromOwnedCosmetics(dbOwnedRaw);
    const nextOwnedCosmetics = Array.from(
      new Set([
        ...dbOwnedRaw.filter((id) => !String(id || '').startsWith(eventOwnedPrefix)),
        ...ownedItemIds,
        ...defaultOwnedIds,
        item.id,
      ])
    );
    const nextOwnedPayload = encodeEventCountsIntoOwnedCosmetics(nextOwnedCosmetics, dbEventCounts, ownedMetaEntries);
    const updatePayload: any = {
      gc: nextGc,
      owned_cosmetics: nextOwnedPayload,
      equipped_name_color: item.category === 'nameColor' ? item.id : equippedItems.nameColor,
      equipped_name_style: item.category === 'nameStyle' ? item.id : equippedItems.nameStyle,
      equipped_border_fx: item.category === 'borderFx' ? item.id : equippedItems.borderFx,
    };
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
    if (error) {
      playSFX('error');
      alert(`구매 실패: ${error.message}`);
      return;
    }

    const nextOwned = Array.from(new Set([...ownedItemIds, item.id]));
    setOwnedItemIds(nextOwned);
    equipCosmeticItem(item);
    setProfile((prev: any) =>
      prev
        ? {
            ...prev,
            gc: nextGc,
            owned_cosmetics: nextOwnedPayload,
            equipped_name_color: updatePayload.equipped_name_color,
            equipped_name_style: updatePayload.equipped_name_style,
            equipped_border_fx: updatePayload.equipped_border_fx,
          }
        : prev
    );
    if (purchaseHistoryStorageKey) {
      try {
        const raw = localStorage.getItem(purchaseHistoryStorageKey);
        const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        parsed[item.id] = Math.max(0, Math.floor(Number(parsed[item.id] || 0))) + 1;
        localStorage.setItem(purchaseHistoryStorageKey, JSON.stringify(parsed));
      } catch {
        // ignore local history failures
      }
    }
    setRankers((prev) =>
      prev.map((r) =>
        r.id === user.id
          ? {
              ...r,
              gc: nextGc,
              owned_cosmetics: nextOwnedPayload,
            }
          : r
      )
    );
    fetchProfile(user.id);
    fetchRankers();
  };

  const handleBuyEventItem = async (item: EventShopItem) => {
    if (!user || !profile) {
      alert('로그인이 필요합니다.');
      return;
    }
    const currentGc = Number(profile?.gc ?? 1000);
    if (currentGc < item.cost) {
      playSFX('error');
      alert(`GC가 부족합니다. (필요: ${item.cost.toLocaleString()} / 보유: ${currentGc.toLocaleString()})`);
      return;
    }

    playSFX('click');
    const nextGc = currentGc - item.cost;
    const dbOwnedRaw = Array.isArray((profile as any).owned_cosmetics) ? ((profile as any).owned_cosmetics as string[]) : [];
    const dbEventCounts = parseEventCountsFromOwnedCosmetics(dbOwnedRaw);
    const nextEventCounts = { ...dbEventCounts, [item.id]: Math.max(0, Number(dbEventCounts[item.id] || 0)) + 1 };
    const cosmeticOwned = Array.from(new Set([...(ownedItemIds || []), ...defaultOwnedIds]));
    const nextOwnedPayload = encodeEventCountsIntoOwnedCosmetics(cosmeticOwned, nextEventCounts, ownedMetaEntries);
    const { error } = await supabase
      .from('profiles')
      .update({
        gc: nextGc,
        owned_cosmetics: nextOwnedPayload,
      })
      .eq('id', user.id);
    if (error) {
      playSFX('error');
      alert(`구매 실패: ${error.message}`);
      return;
    }

    setEventItemCounts(nextEventCounts);
    setProfile((prev: any) =>
      prev
        ? {
            ...prev,
            gc: nextGc,
            owned_cosmetics: nextOwnedPayload,
          }
        : prev
    );
    if (purchaseHistoryStorageKey) {
      try {
        const key = `event:${item.id}`;
        const raw = localStorage.getItem(purchaseHistoryStorageKey);
        const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        parsed[key] = Math.max(0, Math.floor(Number(parsed[key] || 0))) + 1;
        localStorage.setItem(purchaseHistoryStorageKey, JSON.stringify(parsed));
      } catch {
        // ignore local history failures
      }
    }
    setRankers((prev) =>
      prev.map((r) =>
        r.id === user.id
          ? {
              ...r,
              gc: nextGc,
              owned_cosmetics: nextOwnedPayload,
            }
          : r
      )
    );
    showStatusPopup('success', '이벤트 상품 구매 완료', `${item.name} 구매 완료!`, { autoCloseMs: 1400, hideConfirm: true });
  };

  const handleTargetLock = (name = entryOpponent) => {
      if (!user) return alert("로그인이 필요합니다!");
      if (!name.trim()) return alert("상대방 닉네임을 입력하세요!");
      if (name.trim() === currentUserName?.trim()) return alert("자기 자신에게는 도전할 수 없습니다!");
      playSFX('click'); setEntryOpponent(name); setMatchPhase('idle');
  };

  const handleModeChange = (mode: 'free' | 'season') => {
    playSFX('click');
    const nextMode: ChallengeMode = mode === 'free' ? 'free' : seasonSubMode;
    setEntryMode(nextMode);
    const fixed = getFixedSeasonLoadout(nextMode);
    if (fixed) {
      setEntryLegend(fixed.legend);
      setEntryWeapons([...fixed.weapons]);
    } else {
      const saved = getManualLoadout(nextMode);
      setEntryLegend(saved?.legend || '');
      setEntryWeapons(saved ? [...saved.weapons] : ['', '']);
    }
    setRerollCount(0);
    setWinTarget(3);
    if (betAmount < 0) setBetAmount(0);
  };

  const handleSeasonSubModeChange = (nextMode: SeasonChallengeMode) => {
    playSFX('click');
    setSeasonSubMode(nextMode);
    if (isRegularMode(entryMode)) return;
    setEntryMode(nextMode);
    const fixed = getFixedSeasonLoadout(nextMode);
    if (fixed) {
      setEntryLegend(fixed.legend);
      setEntryWeapons([...fixed.weapons]);
    } else {
      const saved = getManualLoadout(nextMode);
      setEntryLegend(saved?.legend || '');
      setEntryWeapons(saved ? [...saved.weapons] : ['', '']);
    }
    setRerollCount(0);
    setWinTarget(3);
  };

  const handleReroll = async () => {
    playSFX('click');
    if (!activeMatch || !currentUserName) return;
    if (rerollCount > 0) {
       if (!profile || profile.gc < 50) return alert("GC가 부족합니다! (50 GC 필요)");
       await supabase.from('profiles').update({ gc: profile.gc - 50 }).eq('id', user.id); if(user) fetchProfile(user.id);
    }
    const nextRerollCount = rerollCount + 1;
    const nextLegend = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
    const nextWeapons = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
    const updatePayload = activeMatch.isChallenger
      ? { legend: nextLegend, weapons: nextWeapons }
      : { t_legend: nextLegend, t_weapons: nextWeapons };
    const { error: updateError } = await supabase.from('challenges').update(updatePayload).eq('id', activeMatch.id);
    if (updateError) {
      playSFX('error');
      showStatusPopup('error', '리롤 반영 실패', '리롤 정보 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
      return;
    }
    setRerollCount(nextRerollCount);
    setEntryLegend(nextLegend);
    setEntryWeapons(nextWeapons);
    setActiveMatch((prev) => (prev ? { ...prev, legend: nextLegend, weapons: nextWeapons } : prev));
    writeRandomDraftState(activeMatch.id, activeMatch.isChallenger, currentUserName, {
      rerollCount: nextRerollCount,
      legend: nextLegend,
      weapons: nextWeapons,
    });
  };

  const lockChallengeStakeOnAccept = async (
    mode: ChallengeMode,
    stakeEach: number,
    challengerName: string,
    targetName: string
  ) => {
    const stake = Math.max(0, Math.floor(stakeEach || 0));
    const requiredEach = isRegularMode(mode) ? REGULAR_TICKET_COST + stake : stake;
    if (requiredEach <= 0) return { ok: true, message: '' };
    const { data: cProfile } = await supabase.from('profiles').select('id,gc').eq('display_name', challengerName).single();
    const { data: tProfile } = await supabase.from('profiles').select('id,gc').eq('display_name', targetName).single();
    if (!cProfile || !tProfile) {
      return { ok: false, message: '참가자 프로필을 찾지 못했습니다.' };
    }
    const cGc = typeof cProfile.gc === 'number' ? cProfile.gc : 1000;
    const tGc = typeof tProfile.gc === 'number' ? tProfile.gc : 1000;
    if (cGc < requiredEach || tGc < requiredEach) {
      return {
        ok: false,
        message: `보유 GC 부족: ${challengerName}(${cGc}) / ${targetName}(${tGc}), 필요 ${requiredEach}`,
      };
    }
    const { error: cErr } = await supabase.from('profiles').update({ gc: cGc - requiredEach }).eq('id', cProfile.id);
    if (cErr) return { ok: false, message: cErr.message };
    const { error: tErr } = await supabase.from('profiles').update({ gc: tGc - requiredEach }).eq('id', tProfile.id);
    if (tErr) {
      await supabase.from('profiles').update({ gc: cGc }).eq('id', cProfile.id);
      return { ok: false, message: tErr.message };
    }
    if (user?.id) fetchProfile(user.id);
    fetchRankers();
    return {
      ok: true,
      message: isRegularMode(mode)
        ? `정규 티켓 200GC + 배팅 ${stake}GC가 즉시 차감되었습니다.`
        : `시즌 배팅 ${stake}GC가 즉시 차감되었습니다.`,
    };
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const fetchChallengeById = async (challengeId: string) => {
    const { data, error } = await supabase.from('challenges').select('*').eq('id', challengeId).maybeSingle();
    if (error) return null;
    return data;
  };
  const waitForChallengeAcceptance = async (
    challengeId: string,
    baseMode: ChallengeMode,
    timeoutMs = 4200
  ) => {
    const started = Date.now();
    const acceptingMode = `${baseMode}_accepting`;
    const acceptedMode = `${baseMode}_accepted`;
    while (Date.now() - started < timeoutMs) {
      const latest = await fetchChallengeById(challengeId);
      if (!latest) return null;
      const mode = String(latest.mode || '').trim();
      if (mode === acceptedMode || mode === baseMode) return latest;
      if (mode !== acceptingMode) return latest;
      await sleep(180);
    }
    return fetchChallengeById(challengeId);
  };
  const buildAcceptedChallengePayload = (challengeRow: any, baseMode: ChallengeMode) => {
    let challengerLegend = challengeRow.legend || '';
    let challengerWeapons = Array.isArray(challengeRow.weapons) ? challengeRow.weapons : ['', ''];
    let targetLegend = challengeRow.t_legend || '';
    let targetWeapons = Array.isArray(challengeRow.t_weapons) ? challengeRow.t_weapons : ['', ''];

    if (isRandomSeasonMode(baseMode)) {
      if (!challengerLegend) challengerLegend = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
      if (!challengerWeapons[0] || !challengerWeapons[1]) challengerWeapons = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
      if (!targetLegend) targetLegend = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
      if (!targetWeapons[0] || !targetWeapons[1]) targetWeapons = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
    }

    const fixedLoadout = getFixedSeasonLoadout(baseMode);
    if (fixedLoadout) {
      challengerLegend = fixedLoadout.legend;
      challengerWeapons = [...fixedLoadout.weapons];
      targetLegend = fixedLoadout.legend;
      targetWeapons = [...fixedLoadout.weapons];
    }

    return {
      mode: `${baseMode}_accepted`,
      legend: challengerLegend || null,
      weapons: challengerWeapons,
      t_legend: targetLegend || null,
      t_weapons: targetWeapons,
      c_win: null,
      c_lose: null,
      t_win: null,
      t_lose: null,
    };
  };
  const ensureChallengeAccepted = async (
    challengeRow: any,
    baseMode: ChallengeMode,
    challengerName: string,
    targetName: string
  ): Promise<{ ok: boolean; row?: any; justAccepted?: boolean; stakeMessage?: string; message?: string }> => {
    const acceptedMode = `${baseMode}_accepted`;
    const acceptingMode = `${baseMode}_accepting`;
    let current = challengeRow;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!current) return { ok: false, message: '대전 신청 정보를 찾을 수 없습니다.' };
      const mode = String(current.mode || '').trim();
      if (mode === acceptedMode) {
        return { ok: true, row: current, justAccepted: false, stakeMessage: '' };
      }
      if (mode === acceptingMode) {
        const waited = await waitForChallengeAcceptance(current.id, baseMode);
        if (!waited) return { ok: false, message: '상대의 수락 처리 중 신청이 종료되었습니다.' };
        current = waited;
        continue;
      }
      if (mode !== baseMode) {
        return { ok: false, message: '대전 상태가 변경되어 수락을 진행할 수 없습니다.' };
      }

      const { data: lockedRows, error: lockErr } = await supabase
        .from('challenges')
        .update({ mode: acceptingMode })
        .eq('id', current.id)
        .eq('mode', baseMode)
        .select();
      if (lockErr) return { ok: false, message: lockErr.message };

      if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
        const waited = await waitForChallengeAcceptance(current.id, baseMode);
        if (!waited) return { ok: false, message: '상대의 수락 처리 중 신청이 종료되었습니다.' };
        current = waited;
        continue;
      }

      const lockedRow = lockedRows[0];
      const stake = Math.max(0, Math.floor(Number(lockedRow.bet_gc || 0)));
      const stakeLock = await lockChallengeStakeOnAccept(baseMode, stake, challengerName, targetName);
      if (!stakeLock.ok) {
        await supabase.from('challenges').update({ mode: baseMode }).eq('id', lockedRow.id).eq('mode', acceptingMode);
        return { ok: false, message: `GC 차감 처리 중 오류가 발생했습니다.\n${stakeLock.message}` };
      }

      const acceptPayload = buildAcceptedChallengePayload(lockedRow, baseMode);
      const { data: acceptedRows, error: acceptErr } = await supabase
        .from('challenges')
        .update(acceptPayload)
        .eq('id', lockedRow.id)
        .eq('mode', acceptingMode)
        .select();
      if (acceptErr || !Array.isArray(acceptedRows) || acceptedRows.length === 0) {
        await refundLockedStakeIfNeeded({ ...lockedRow, mode: acceptedMode });
        await supabase.from('challenges').update({ mode: baseMode }).eq('id', lockedRow.id).eq('mode', acceptingMode);
        return { ok: false, message: acceptErr?.message || '수락 상태 반영 중 충돌이 발생했습니다.' };
      }
      return { ok: true, row: acceptedRows[0], justAccepted: true, stakeMessage: stakeLock.message };
    }

    return { ok: false, message: '동시 처리 충돌로 수락이 지연되고 있습니다. 잠시 후 다시 시도해주세요.' };
  };
  const cancelChallengeRowSafely = async (challengeRow: any) => {
    if (!challengeRow?.id) return;
    const modeRaw = String(challengeRow.mode || '').trim();
    if (!modeRaw) return;
    const baseMode = normalizeChallengeMode(modeRaw);
    const acceptedMode = `${baseMode}_accepted`;
    const refundingMode = `${baseMode}_refunding`;

    if (modeRaw === acceptedMode) {
      const { data: lockRows } = await supabase
        .from('challenges')
        .update({ mode: refundingMode })
        .eq('id', challengeRow.id)
        .eq('mode', acceptedMode)
        .select();
      if (!Array.isArray(lockRows) || lockRows.length === 0) return;
      await refundLockedStakeIfNeeded({ ...lockRows[0], mode: acceptedMode });
      await supabase.from('challenges').delete().eq('id', challengeRow.id);
      return;
    }

    await supabase.from('challenges').delete().eq('id', challengeRow.id).eq('mode', modeRaw);
  };
  const acquireSettlementLock = async (challengeId: string, currentMode: string) => {
    const baseMode = normalizeChallengeMode(currentMode);
    const acceptedMode = `${baseMode}_accepted`;
    const settlingMode = `${baseMode}_settling`;
    if (currentMode === settlingMode) return { ok: false, settling: true, baseMode };
    const { data: lockRows, error } = await supabase
      .from('challenges')
      .update({ mode: settlingMode })
      .eq('id', challengeId)
      .eq('mode', acceptedMode)
      .select();
    if (error) return { ok: false, settling: false, baseMode, message: error.message };
    if (Array.isArray(lockRows) && lockRows.length > 0) return { ok: true, settling: false, baseMode };
    const latest = await fetchChallengeById(challengeId);
    if (!latest) return { ok: false, settling: false, baseMode, message: '이미 처리되었습니다.' };
    return {
      ok: false,
      settling: String(latest.mode || '') === settlingMode,
      baseMode,
      message: '다른 클라이언트가 먼저 결과를 처리 중입니다.',
    };
  };

  const refundLockedStakeIfNeeded = async (challengeRow: any) => {
    if (!challengeRow) return;
    const mode = String(challengeRow.mode || '').toLowerCase();
    if (!mode.includes('_accepted')) return;
    const stake = Math.max(0, Math.floor(Number(challengeRow.bet_gc || 0)));
    const baseMode = normalizeChallengeMode(mode);
    const requiredEach = isRegularMode(baseMode) ? REGULAR_TICKET_COST + stake : stake;
    if (requiredEach <= 0) return;
    const challengerName = String(challengeRow.challenger_name || '').trim();
    const targetName = String(challengeRow.target_name || '').trim();
    if (!challengerName || !targetName) return;
    const { data: cProfile } = await supabase.from('profiles').select('id,gc').eq('display_name', challengerName).single();
    const { data: tProfile } = await supabase.from('profiles').select('id,gc').eq('display_name', targetName).single();
    if (cProfile) {
      const cGc = typeof cProfile.gc === 'number' ? cProfile.gc : 1000;
      await supabase.from('profiles').update({ gc: cGc + requiredEach }).eq('id', cProfile.id);
    }
    if (tProfile) {
      const tGc = typeof tProfile.gc === 'number' ? tProfile.gc : 1000;
      await supabase.from('profiles').update({ gc: tGc + requiredEach }).eq('id', tProfile.id);
    }
    if (user?.id) fetchProfile(user.id);
    fetchRankers();
  };

  const handleAcceptIncomingChallenge = async () => {
    if (!incomingChallenge || !currentUserName) return;
    playSFX('click');
    const pending = incomingChallenge;
    const { data: existing, error } = await supabase.from('challenges').select('*').eq('id', pending.id).maybeSingle();
    if (error || !existing) {
      setIncomingChallenge(null);
      showStatusPopup('error', '신청 정보 없음', '이미 취소되었거나 만료된 대전 신청입니다.');
      return;
    }

    const modeRaw = String(existing.mode || '').trim();
    const alreadyAccepted = modeRaw.includes('_accepted');
    const baseMode = normalizeChallengeMode(modeRaw);
    const challengerName = existing.challenger_name?.trim();
    const targetName = existing.target_name?.trim();
    if (!challengerName || !targetName || targetName !== currentUserName.trim()) {
      setIncomingChallenge(null);
      showStatusPopup('error', '수락 실패', '대전 신청 대상 정보가 올바르지 않습니다.');
      return;
    }

    if (!alreadyAccepted && baseMode === 'free') {
      if (!canAcceptIncomingByRegularRule(challengerName)) {
        playSFX('error');
        showStatusPopup('error', '수락 불가', '현재 정규 랭크 규칙상 해당 대전은 성립할 수 없습니다.');
        await supabase.from('challenges').delete().eq('id', existing.id);
        setIncomingChallenge(null);
        return;
      }
    }

    const acceptance = await ensureChallengeAccepted(existing, baseMode, challengerName, targetName);
    if (!acceptance.ok || !acceptance.row) {
      playSFX('error');
      showStatusPopup('error', '수락 실패', acceptance.message || '대전 수락 처리 중 충돌이 발생했습니다.');
      return;
    }
    const acceptedRow = acceptance.row;
    const stake = Math.max(0, Math.floor(Number(acceptedRow.bet_gc || 0)));

    if (baseMode === 'random') {
      const saved = readRandomDraftState(acceptedRow.id, false, currentUserName);
      const dbLegend = String(acceptedRow.t_legend || '');
      const dbWeapons = Array.isArray(acceptedRow.t_weapons) ? acceptedRow.t_weapons : ['', ''];
      const nextLegend = saved?.legend || dbLegend || '';
      const nextWeapons = saved?.weapons?.length === 2 ? saved.weapons : dbWeapons;
      setEntryLegend(nextLegend);
      setEntryWeapons(nextWeapons);
      setRerollCount(saved?.rerollCount ?? 0);
      setActiveMatch({
        id: acceptedRow.id,
        mode: baseMode,
        opponent: challengerName,
        legend: nextLegend,
        weapons: nextWeapons,
        isChallenger: false,
      });
      writeRandomDraftState(acceptedRow.id, false, currentUserName, {
        rerollCount: saved?.rerollCount ?? 0,
        legend: nextLegend,
        weapons: nextWeapons,
      });
    } else {
      const preset = getFixedSeasonLoadout(baseMode);
      const saved = getManualLoadout(baseMode);
      const nextLegend = preset?.legend || saved?.legend || '';
      const nextWeapons = preset ? [...preset.weapons] : saved ? [...saved.weapons] : ['', ''];
      setEntryLegend(nextLegend);
      setEntryWeapons(nextWeapons);
      setRerollCount(0);
      setActiveMatch({
        id: existing.id,
        mode: baseMode,
        opponent: challengerName,
        legend: nextLegend,
        weapons: nextWeapons,
        isChallenger: false,
      });
    }

    setIncomingChallenge(null);
    setEntryOpponent(challengerName);
    setEntryMode(baseMode);
    if (!isRegularMode(baseMode)) setSeasonSubMode(baseMode as SeasonChallengeMode);
    setBetAmount(stake);
    if (acceptance.justAccepted) {
      showStatusPopup('success', '대전 수락', acceptance.stakeMessage || '대전이 성사되었습니다.', {
        autoCloseMs: 1000,
        hideConfirm: true,
      });
    }
    setWinTarget(inferWinTargetFromScores(existing?.c_win, existing?.c_lose, existing?.t_win, existing?.t_lose));
    setMatchPhase('scoring');
  };

  const handleDeclineIncomingChallenge = async () => {
    if (!incomingChallenge) return;
    playSFX('click');
    const pending = incomingChallenge;
    const { error } = await supabase.from('challenges').delete().eq('id', pending.id);
    if (error) {
      playSFX('error');
      showStatusPopup('error', '거절 실패', `대전 거절 처리 중 오류가 발생했습니다: ${error.message}`);
      return;
    }
    setIncomingChallenge(null);
    setMatchPhase('idle');
    setActiveMatch(null);
    setEntryOpponent(String(pending.challengerName || '').trim());
    applyDefaultLoadoutForMode(entryMode);
    setRerollCount(0);
    const challengerDisplay = String(pending.challengerName || '').trim() || '상대방';
    showStatusPopup('info', '대전 거절', `${challengerDisplay}님에게 잔뜩 쫄았쥬~ㅋㅋㅋㅋ`, { autoCloseMs: 3000, hideConfirm: true });
  };

  const handleStartMatch = async () => {
    const targetExists = Boolean(regularRankMap.get(normalizeName(entryOpponent.trim())));
    if (!targetExists) {
      playSFX('error');
      return alert('대상 닉네임을 찾을 수 없습니다. 접속 현황/랭킹에서 다시 선택해주세요.');
    }
    const stake = Math.max(0, Math.floor(Number(betAmount || 0)));
    const requiredMyGc = isRegularMode(entryMode) ? REGULAR_TICKET_COST + stake : stake;
    if (requiredMyGc > 0 && (!profile || (profile.gc ?? 1000) < requiredMyGc)) {
      playSFX('error');
      return alert(`GC가 부족합니다! (보유: ${profile?.gc ?? 1000} GC, 필요: ${requiredMyGc} GC)`);
    }
    if (isRegularMode(entryMode) && !canChallengeTargetByRegularRule(entryOpponent.trim())) {
      playSFX('error');
      return alert('정규 랭크전은 동일 티어 또는 1단계 상위 티어에게만 도전할 수 있습니다. (루키는 예외)');
    }

    const { data: existing } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenger_name', entryOpponent.trim())
      .eq('target_name', currentUserName.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (existing) {
      playSFX('click');
      const modeRaw = String(existing.mode || '').trim();
      const alreadyAccepted = modeRaw.includes('_accepted');
      const dbMode = normalizeChallengeMode(modeRaw);
      if (dbMode !== normalizeChallengeMode(entryMode)) {
        playSFX('error');
        return alert(`상대방이 [${getModeDisplayName(dbMode)}]을 신청했습니다. 모드를 맞춰주세요!`);
      }
      if (existing.bet_gc !== betAmount) { playSFX('error'); return alert(`상대방이 배팅금 [${existing.bet_gc} GC]를 걸었습니다. 배팅금을 맞춰주세요!`); }
      if (!alreadyAccepted && isRegularMode(entryMode) && !canAcceptIncomingByRegularRule(entryOpponent.trim())) {
        playSFX('error');
        return alert('현재 정규 랭크 규칙상 해당 신청은 수락할 수 없습니다.');
      }

      const acceptance = await ensureChallengeAccepted(
        existing,
        entryMode,
        String(existing.challenger_name || '').trim(),
        String(existing.target_name || '').trim()
      );
      if (!acceptance.ok || !acceptance.row) {
        playSFX('error');
        return alert(`수락 처리 실패: ${acceptance.message || '동시 처리 충돌이 발생했습니다.'}`);
      }
      const acceptedRow = acceptance.row;

      if (isRandomSeasonMode(entryMode)) {
          const saved = currentUserName ? readRandomDraftState(acceptedRow.id, false, currentUserName) : null;
          const dbLegend = String(acceptedRow.t_legend || '');
          const dbWeapons = Array.isArray(acceptedRow.t_weapons) ? acceptedRow.t_weapons : ['', ''];
          const nextLegend = saved?.legend || dbLegend;
          const nextWeapons = saved?.weapons?.length === 2 ? saved.weapons : dbWeapons;
          setEntryLegend(nextLegend);
          setEntryWeapons(nextWeapons);
          setRerollCount(saved?.rerollCount ?? 0);
          setActiveMatch({ id: acceptedRow.id, mode: dbMode, opponent: entryOpponent.trim(), legend: nextLegend, weapons: nextWeapons, isChallenger: false });
          if (currentUserName) {
            writeRandomDraftState(acceptedRow.id, false, currentUserName, { rerollCount: saved?.rerollCount ?? 0, legend: nextLegend, weapons: nextWeapons });
          }
      } else {
          const preset = getFixedSeasonLoadout(dbMode);
          const saved = getManualLoadout(dbMode);
          const nextLegend = preset?.legend || saved?.legend || '';
          const nextWeapons = preset ? [...preset.weapons] : saved ? [...saved.weapons] : ['', ''];
          setEntryLegend(nextLegend);
          setEntryWeapons(nextWeapons);
          setRerollCount(0);
          setActiveMatch({ id: acceptedRow.id, mode: dbMode, opponent: entryOpponent.trim(), legend: nextLegend, weapons: nextWeapons, isChallenger: false });
      }
      setIncomingChallenge(null);
      if (acceptance.justAccepted) {
        showStatusPopup('success', '대전 수락', acceptance.stakeMessage || '대전이 성사되었습니다.', {
          autoCloseMs: 1000,
          hideConfirm: true,
        });
      }
      setWinTarget(inferWinTargetFromScores(acceptedRow?.c_win, acceptedRow?.c_lose, acceptedRow?.t_win, acceptedRow?.t_lose));
      setMatchPhase('scoring');
    } else {
      playSFX('click');
      const modeToInsert = normalizeChallengeMode(entryMode);
      const { data: newChall } = await supabase.from('challenges').insert([{ challenger_name: currentUserName.trim(), target_name: entryOpponent.trim(), mode: modeToInsert, bet_gc: betAmount }]).select().single();
      if (newChall) {
        setRerollCount(0);
        const preset = getFixedSeasonLoadout(modeToInsert);
        const saved = getManualLoadout(modeToInsert);
        const nextLegend = preset?.legend || saved?.legend || '';
        const nextWeapons = preset ? [...preset.weapons] : saved ? [...saved.weapons] : ['', ''];
        setEntryLegend(nextLegend);
        setEntryWeapons(nextWeapons);
        setActiveMatch({ id: newChall.id, mode: modeToInsert, opponent: entryOpponent.trim(), legend: nextLegend, weapons: nextWeapons, isChallenger: true });
        setMatchPhase('waiting_sync');
        showStatusPopup('info', '대전 신청 완료', '상대방에게 도전장을 보냈습니다.', { autoCloseMs: 3000, hideConfirm: true });
      }
    }
  };

  const handleCancelMatch = async () => {
    playSFX('click');
    const { data: challengeRows } = await supabase
      .from('challenges')
      .select('*')
      .or(`challenger_name.eq."${currentUserName?.trim()}",target_name.eq."${currentUserName?.trim()}"`);
    if (Array.isArray(challengeRows) && challengeRows.length > 0) {
      for (const row of challengeRows) {
        await cancelChallengeRowSafely(row);
      }
    }
    if (activeMatch && currentUserName) clearRandomDraftState(activeMatch.id, activeMatch.isChallenger, currentUserName);
    setRerollCount(0);
    setMatchPhase('idle'); setActiveMatch(null);
  };

  const handleReportScore = async () => {
    if (myWins === null || myLosses === null || !activeMatch) {
      playSFX('error');
      showStatusPopup('error', '입력 필요', '승리 및 패배 횟수를 모두 선택하세요.');
      return;
    }
    const nextLegend = String(entryLegend || '').trim();
    const nextWeapons = [String(entryWeapons[0] || '').trim(), String(entryWeapons[1] || '').trim()];
    if (!nextLegend || !nextWeapons[0] || !nextWeapons[1]) {
      playSFX('error');
      showStatusPopup('error', '입력 필요', '레전드와 무기를 모두 설정하세요.');
      return;
    }
    if (!isTerminalScoreSelection(myWins, myLosses, winTarget)) {
      playSFX('error');
      showStatusPopup(
        'error',
        '스코어 입력 안내',
        `현재 승리 목표는 ${winTarget}승입니다. 한쪽이 ${winTarget}승에 도달한 최종 스코어를 입력해주세요.`
      );
      return;
    }
    playSFX('click');
    
    const isC = activeMatch.isChallenger;
    const pickPayload = isC ? { legend: nextLegend, weapons: nextWeapons } : { t_legend: nextLegend, t_weapons: nextWeapons };
    const { error: pickErr } = await supabase.from('challenges').update(pickPayload).eq('id', activeMatch.id);
    if (pickErr) {
      setWaitingForScore(false);
      playSFX('error');
      showStatusPopup('error', '픽 저장 실패', `레전드/무기 저장 중 오류가 발생했습니다: ${pickErr.message}`);
      return;
    }
    setWaitingForScore(true);
    setActiveMatch((prev) => (prev ? { ...prev, legend: nextLegend, weapons: nextWeapons } : prev));
    if (currentUserName && isRandomSeasonMode(activeMatch.mode)) {
      writeRandomDraftState(activeMatch.id, activeMatch.isChallenger, currentUserName, {
        rerollCount,
        legend: nextLegend,
        weapons: nextWeapons,
      });
    }

    const updatePayload = isC ? { c_win: myWins, c_lose: myLosses } : { t_win: myWins, t_lose: myLosses };
    
    const { data: updatedData, error } = await supabase.from('challenges').update(updatePayload).eq('id', activeMatch.id).select().maybeSingle();
    
    if (error) {
      showStatusPopup('error', '점수 제출 실패', `점수 제출 중 오류가 발생했습니다: ${error.message}`);
      setWaitingForScore(false);
      return;
    }

    if (updatedData) {
      const hasC = isSubmittedScorePair(updatedData.c_win, updatedData.c_lose);
      const hasT = isSubmittedScorePair(updatedData.t_win, updatedData.t_lose);
      if (hasC && hasT) {
        if (updatedData.c_win === updatedData.t_lose && updatedData.c_lose === updatedData.t_win) {
          const challengeMode = String(updatedData.mode || '').trim();
          const settlement = await acquireSettlementLock(activeMatch.id, challengeMode);
          if (!settlement.ok) {
            setWaitingForScore(false);
            if (settlement.settling) {
              showStatusPopup('info', '결과 처리 중', '상대방이 먼저 결과를 확정 중입니다. 잠시 후 자동 반영됩니다.');
            } else {
              showStatusPopup('info', '결과 반영 대기', settlement.message || '결과가 이미 처리되었습니다.');
            }
            if (currentUserName) {
              window.setTimeout(() => {
                void checkActiveChallenge(currentUserName);
              }, 900);
            }
            return;
          }

          const baseMode = settlement.baseMode;
          const settlingMode = `${baseMode}_settling`;
          const acceptedMode = `${baseMode}_accepted`;
          const challengerName = isC ? currentUserName : activeMatch.opponent;
          const targetName = isC ? activeMatch.opponent : currentUserName;
          const winnerName = updatedData.c_win > updatedData.c_lose ? challengerName : targetName;
          const winnerRankNum = rankers.findIndex(r => r.display_name === winnerName) + 1 || 99;
          
          const matchPayload = {
            match_type: String(baseMode),
            left_player: challengerName, right_player: targetName,    
            left_player_name: challengerName, right_player_name: targetName,
            left_legend: String(updatedData.legend || '미선택'), left_weapons: Array.isArray(updatedData.weapons) ? updatedData.weapons : ['미선택', '미선택'],
            right_legend: String(updatedData.t_legend || '미선택'), right_weapons: Array.isArray(updatedData.t_weapons) ? updatedData.t_weapons : ['미선택', '미선택'],
            score_left: Number(updatedData.c_win), score_right: Number(updatedData.t_win), winner_name: String(winnerName), winner_rank_num: Number(winnerRankNum)
          };

          const { data: insertedMatchRow, error: matchErr } = await supabase
            .from('matches')
            .insert([matchPayload])
            .select()
            .maybeSingle();
          if (matchErr) {
            await supabase.from('challenges').update({ mode: acceptedMode }).eq('id', activeMatch.id).eq('mode', settlingMode);
            showStatusPopup('error', '저장 실패', `데이터베이스 저장에 실패했습니다: ${matchErr.message}`);
            setWaitingForScore(false);
            return;
          }

          const challengerScore = Number(updatedData.c_win || 0);
          const targetScore = Number(updatedData.t_win || 0);
          const challengerWon = challengerScore > targetScore;
          const winnerScore = Math.max(challengerScore, targetScore);
          const loserScore = Math.min(challengerScore, targetScore);
          const { data: cProfile } = await supabase.from('profiles').select('*').eq('display_name', challengerName).single();
          const { data: tProfile } = await supabase.from('profiles').select('*').eq('display_name', targetName).single();
          let currentPointLabel = isRegularMode(baseMode) ? 'RP (정규포인트)' : 'SP (시즌포인트)';
          let currentPointDelta = 0;
          let currentGcDelta = 0;

          if (!cProfile || !tProfile) {
            await supabase.from('challenges').update({ mode: acceptedMode }).eq('id', activeMatch.id).eq('mode', settlingMode);
            showStatusPopup('error', '결과 반영 실패', '참가자 프로필을 찾지 못해 보상 반영을 완료하지 못했습니다. 다시 시도해주세요.');
            setWaitingForScore(false);
            return;
          }
          const cUpdates: any = { wins: cProfile.wins + (challengerWon ? 1 : 0), losses: cProfile.losses + (challengerWon ? 0 : 1) };
          const tUpdates: any = { wins: tProfile.wins + (challengerWon ? 0 : 1), losses: tProfile.losses + (challengerWon ? 1 : 0) };

          const bet = Math.max(0, Math.floor(Number(updatedData.bet_gc || 0)));
          const cGc = typeof cProfile.gc === 'number' ? cProfile.gc : 1000;
          const tGc = typeof tProfile.gc === 'number' ? tProfile.gc : 1000;
          const isRegular = isRegularMode(baseMode);
          const challengerRowBefore: any = regularRankMap.get(normalizeName(challengerName));
          const targetRowBefore: any = regularRankMap.get(normalizeName(targetName));
          const challengerBountyFromOpponent = getModeBountyGCFromRow(targetRowBefore, baseMode);
          const targetBountyFromOpponent = getModeBountyGCFromRow(challengerRowBefore, baseMode);
          const getRowRegularRankIndex = (row: any) => {
            if (typeof row?.regular_display_index === 'number') return row.regular_display_index as number;
            if (typeof row?.rankIndex === 'number') return row.rankIndex as number;
            return null;
          };
          const getRowSeasonRankIndex = (row: any) => {
            if (typeof row?.season_display_index === 'number') return row.season_display_index as number;
            if (typeof row?.seasonRankIndex === 'number') return row.seasonRankIndex as number;
            return null;
          };
          const challengerRegularRankBefore = getRowRegularRankIndex(challengerRowBefore);
          const targetRegularRankBefore = getRowRegularRankIndex(targetRowBefore);
          const challengerSeasonRankBefore = getRowSeasonRankIndex(challengerRowBefore);
          const targetSeasonRankBefore = getRowSeasonRankIndex(targetRowBefore);
          const winnerSeasonRankBefore = challengerWon ? challengerSeasonRankBefore : targetSeasonRankBefore;
          const loserSeasonRankBefore = challengerWon ? targetSeasonRankBefore : challengerSeasonRankBefore;
          const seasonWinnerReward = calcSeasonWinReward({
            winnerScore,
            isHigherRankWin:
              loserSeasonRankBefore !== null &&
              (winnerSeasonRankBefore === null || loserSeasonRankBefore < winnerSeasonRankBefore),
          });
          const seasonLoserReward = calcSeasonLoseReward({
            loserScore,
            isHigherRankLoss:
              winnerSeasonRankBefore !== null &&
              (loserSeasonRankBefore === null || winnerSeasonRankBefore < loserSeasonRankBefore),
          });

          if (isRegular) {
            // 정규전: 티켓(200)은 성사 시 소멸, 배팅 포트(양측 동일 금액)는 승자가 획득
            const transferable = bet * 2;
            if (challengerWon) {
              cUpdates.gc = cGc + transferable + challengerBountyFromOpponent;
              tUpdates.gc = tGc;
            } else {
              cUpdates.gc = cGc;
              tUpdates.gc = tGc + transferable + targetBountyFromOpponent;
            }
          } else {
            // 시즌전: 점수 보상 + 배팅 전체 팟(양쪽)을 승자가 획득
            const transferable = bet * 2;
            if (challengerWon) {
              cUpdates.gc = cGc + seasonWinnerReward.gc + transferable + challengerBountyFromOpponent;
              tUpdates.gc = tGc + seasonLoserReward.gc;
            } else {
              cUpdates.gc = cGc + seasonLoserReward.gc;
              tUpdates.gc = tGc + seasonWinnerReward.gc + transferable + targetBountyFromOpponent;
            }
          }

          const currentNameNorm = (currentUserName || '').trim().toLowerCase();
          const challengerNorm = (challengerName || '').trim().toLowerCase();
          const isCurrentChallenger = currentNameNorm === challengerNorm;
          const didCurrentWin = winnerName?.trim() === (currentUserName || '').trim();
          const myScore = isCurrentChallenger ? challengerScore : targetScore;
          let challengerPointDelta = 0;
          let targetPointDelta = 0;

          if (isRegularMode(baseMode)) {
            if (challengerWon) {
              const isHigherRankWin =
                targetRegularRankBefore !== null &&
                (challengerRegularRankBefore === null || targetRegularRankBefore < challengerRegularRankBefore);
              challengerPointDelta = calcRegularWinGain({ winnerScore: challengerScore, isHigherRankWin });
              targetPointDelta = calcRegularLoseDelta({
                loserScore: targetScore,
                winnerScore: challengerScore,
                isHigherRankLoss:
                  challengerRegularRankBefore !== null &&
                  (targetRegularRankBefore === null || challengerRegularRankBefore < targetRegularRankBefore),
              });
            } else {
              const isHigherRankWin =
                challengerRegularRankBefore !== null &&
                (targetRegularRankBefore === null || challengerRegularRankBefore < targetRegularRankBefore);
              targetPointDelta = calcRegularWinGain({ winnerScore: targetScore, isHigherRankWin });
              challengerPointDelta = calcRegularLoseDelta({
                loserScore: challengerScore,
                winnerScore: targetScore,
                isHigherRankLoss:
                  targetRegularRankBefore !== null &&
                  (challengerRegularRankBefore === null || targetRegularRankBefore < challengerRegularRankBefore),
              });
            }

            const myRankBefore = isCurrentChallenger ? challengerRegularRankBefore : targetRegularRankBefore;
            const oppRankBefore = isCurrentChallenger ? targetRegularRankBefore : challengerRegularRankBefore;
            if (didCurrentWin) {
              const isHigherRankWin =
                oppRankBefore !== null &&
                (myRankBefore === null || oppRankBefore < myRankBefore);
              currentPointDelta = calcRegularWinGain({ winnerScore: myScore, isHigherRankWin });
            } else {
              const oppScore = isCurrentChallenger ? targetScore : challengerScore;
              currentPointDelta = calcRegularLoseDelta({
                loserScore: myScore,
                winnerScore: oppScore,
                isHigherRankLoss:
                  oppRankBefore !== null &&
                  (myRankBefore === null || oppRankBefore < myRankBefore),
              });
            }
          } else {
            if (challengerWon) {
              challengerPointDelta = seasonWinnerReward.sp;
              targetPointDelta = seasonLoserReward.sp;
            } else {
              challengerPointDelta = seasonLoserReward.sp;
              targetPointDelta = seasonWinnerReward.sp;
            }
            currentPointDelta = didCurrentWin ? seasonWinnerReward.sp : seasonLoserReward.sp;
          }

          currentGcDelta = isCurrentChallenger
            ? (Number(cUpdates.gc ?? cGc) - cGc)
            : (Number(tUpdates.gc ?? tGc) - tGc);

          const { error: cErr } = await supabase.from('profiles').update(cUpdates).eq('id', cProfile.id);
          const { error: tErr } = await supabase.from('profiles').update(tUpdates).eq('id', tProfile.id);
          if (cErr || tErr) {
            await supabase.from('challenges').update({ mode: acceptedMode }).eq('id', activeMatch.id).eq('mode', settlingMode);
            showStatusPopup('error', '결과 반영 실패', cErr?.message || tErr?.message || '프로필 업데이트 중 오류가 발생했습니다.');
            setWaitingForScore(false);
            return;
          }

          suppressNextDeletePopupChallengeIdRef.current = activeMatch.id;
          const { error: deleteErr } = await supabase.from('challenges').delete().eq('id', activeMatch.id);
          if (deleteErr) {
            await supabase.from('challenges').update({ mode: acceptedMode }).eq('id', activeMatch.id).eq('mode', settlingMode);
            showStatusPopup('error', '마무리 실패', `매치 종료 처리 중 오류가 발생했습니다: ${deleteErr.message}`);
            setWaitingForScore(false);
            return;
          }

          const didWin = winnerName?.trim() === (currentUserName || '').trim();
          triggerResultFx(didWin, didWin ? '전투 승리! 순위가 갱신되었습니다.' : '전투 종료! 결과가 반영되었습니다.');
          const formatDeltaLine = (label: string, delta: number) => {
            if (delta >= 0) return `${label} +${delta}획득!`;
            return `${label} ${Math.abs(delta)}차감`;
          };
          const pointDeltaLine = formatDeltaLine(currentPointLabel, currentPointDelta);
          const gcDeltaLine = formatDeltaLine('GC (갤럭시 코인)', currentGcDelta);
          const popupId = getMatchStableId(insertedMatchRow || matchPayload);
          lastResultPopupMatchIdRef.current = `result:${popupId}`;
          showStatusPopup(
            didWin ? 'victory' : 'info',
            didWin ? '전투 승리! 결과 반영 완료' : '전투 종료! 결과 반영 완료',
            `스코어 ${updatedData.c_win} : ${updatedData.t_win}\n${pointDeltaLine}\n${gcDeltaLine}`
          );
          try {
            const broadcastChannel = resultPopupChannelRef.current;
            if (broadcastChannel) {
              await broadcastChannel.send({
                type: 'broadcast',
                event: 'match_result',
                payload: {
                  popupId,
                  matchId: activeMatch.id,
                  challengerName,
                  targetName,
                  winnerName,
                  cWin: Number(updatedData.c_win || 0),
                  tWin: Number(updatedData.t_win || 0),
                  pointLabel: currentPointLabel,
                  challengerPointDelta,
                  targetPointDelta,
                  challengerGcDelta: Number(cUpdates.gc ?? cGc) - cGc,
                  targetGcDelta: Number(tUpdates.gc ?? tGc) - tGc,
                },
              });
            }
          } catch {
            // ignore broadcast failure
          }
          if (currentUserName) clearRandomDraftState(activeMatch.id, activeMatch.isChallenger, currentUserName);
          setRerollCount(0);
          setMatchPhase('idle');
          setActiveMatch(null);
          setWaitingForScore(false);
          setMyWins(null);
          setMyLosses(null);
          applyDefaultLoadoutForMode(activeMatch.mode);
          fetchData();
          fetchRankers();
          if (user?.id) fetchProfile(user.id);
        } else {
          playSFX('error');
          showStatusPopup(
            'error',
            '스코어 불일치',
            `도전자(${updatedData.c_win}승 ${updatedData.c_lose}패) / 타겟(${updatedData.t_win}승 ${updatedData.t_lose}패) 입력값이 달라 결과를 반영하지 못했습니다.\n양쪽이 점수를 다시 맞춘 뒤 재입력해주세요.`
          );
          setWaitingForScore(false);
        }
      }
    } else {
      const latest = await fetchChallengeById(activeMatch.id);
      if (!latest) {
        setWaitingForScore(false);
        return;
      }
      setWaitingForScore(true);
    }
  };

  useEffect(() => {
    if (matchPhase !== 'scoring' || !activeMatch) {
      autoScoreSubmitKeyRef.current = '';
      return;
    }
    const legend = String(entryLegend || '').trim();
    const weapon1 = String(entryWeapons?.[0] || '').trim();
    const weapon2 = String(entryWeapons?.[1] || '').trim();
    if (
      myWins === null ||
      myLosses === null ||
      !isTerminalScoreSelection(myWins, myLosses, winTarget) ||
      !legend ||
      !weapon1 ||
      !weapon2 ||
      waitingForScore
    ) {
      if (myWins === null || myLosses === null || !isTerminalScoreSelection(myWins, myLosses, winTarget)) {
        autoScoreSubmitKeyRef.current = '';
      }
      return;
    }
    const submitKey = `${activeMatch.id}|${legend}|${weapon1}|${weapon2}|${myWins}|${myLosses}|${winTarget}`;
    if (autoScoreSubmitKeyRef.current === submitKey) return;
    autoScoreSubmitKeyRef.current = submitKey;
    void handleReportScore();
  }, [matchPhase, activeMatch?.id, entryLegend, entryWeapons, myWins, myLosses, winTarget, waitingForScore]);

  const copyPlayerName = (name: string) => {
    if (!name) return;
    const row = rankers.find((r) => r.display_name === name) || selectedPlayer || profile;
    const ingameNickname = String(resolveIngameProfile(row).nickname || '').trim();
    playSFX('click');
    if (ingameNickname) {
      navigator.clipboard.writeText(ingameNickname);
      setCopyStatus(true);
    } else {
      setCopyStatus(false);
      showStatusPopup('error', '복사 실패', '인게임 스팀 친구코드/EA 닉네임이 설정되지 않았습니다.');
    }
    setEntryOpponent(name);
    setActiveMenu('home');
    setMatchPhase('idle');
    setTimeout(() => {
      setCopyStatus(false);
      setSelectedPlayer(null);
    }, 650);
  };

  const handleProfileClick = async (name: string) => {
    const found = rankers.find(r => r.display_name === name);
    if (!found) return;
    playSFX('click');
    setSelectedPlayer(found);
    setProfileTab('overview');
    try {
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', found.id).maybeSingle();
      if (!fresh) return;
      const merged = { ...fresh, ...found };
      const resolved = resolveIngameProfile({ ...found, ...fresh });
      const hydrated = { ...merged, ingame_nickname: resolved.nickname, ingame_platform: resolved.platform };
      setSelectedPlayer((prev) => (prev && prev.id === found.id ? hydrated : prev));
      setRankers((prev) => prev.map((row) => (row.id === found.id ? { ...row, ...hydrated } : row)));
    } catch {
      // ignore hydration failure
    }
  };

  const buildPlayerCombatStats = (playerName?: string | null) => {
    const safeName = (playerName || '').trim();
    if (!safeName) {
      return {
        matches: [] as any[],
        wins: 0,
        losses: 0,
        winRate: '0.0%',
        freeMatches: 0,
        randomMatches: 0,
        longestStreak: 0,
        legendStats: [] as any[],
        weaponStats: [] as any[],
        favLegend: '미선택',
        favWeapon: '미선택',
      };
    }

    const matches = logs.filter((m) => {
      const leftP = m.left_player_name || m.left_player;
      const rightP = m.right_player_name || m.right_player;
      return leftP === safeName || rightP === safeName;
    });

    const lStats: any = {};
    const wStats: any = {};
    let wins = 0;
    let losses = 0;
    let freeMatches = 0;
    let randomMatches = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    const byTimeAsc = [...matches].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    byTimeAsc.forEach((m) => {
      const isWin = m.winner_name === safeName;
      if (isWin) {
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    matches.forEach((m) => {
      const leftP = m.left_player_name || m.left_player;
      const isLeft = leftP === safeName;
      const isWin = m.winner_name === safeName;
      if (isWin) wins += 1;
      else losses += 1;

	      if (isRegularMode(String(m.match_type || ''))) freeMatches += 1;
	      else randomMatches += 1;

      const myLeg = isLeft ? m.left_legend : m.right_legend;
      const myWep = isLeft ? m.left_weapons : m.right_weapons;
      if (myLeg && myLeg !== '미선택') {
        if (!lStats[myLeg]) lStats[myLeg] = { name: myLeg, matches: 0, wins: 0 };
        lStats[myLeg].matches += 1;
        if (isWin) lStats[myLeg].wins += 1;
      }
      if (Array.isArray(myWep)) {
        myWep.forEach((w: string) => {
          if (!w || w === '미선택') return;
          if (!wStats[w]) wStats[w] = { name: w, matches: 0, wins: 0 };
          wStats[w].matches += 1;
          if (isWin) wStats[w].wins += 1;
        });
      }
    });

    const legendStats = Object.values(lStats)
      .map((d: any) => ({ ...d, wr: d.matches > 0 ? d.wins / d.matches : 0 }))
      .sort((a: any, b: any) => b.wr - a.wr || b.matches - a.matches);
    const weaponStats = Object.values(wStats)
      .map((d: any) => ({ ...d, wr: d.matches > 0 ? d.wins / d.matches : 0 }))
      .sort((a: any, b: any) => b.wr - a.wr || b.matches - a.matches);

    const total = wins + losses;
    return {
      matches,
      wins,
      losses,
      winRate: total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0.0%',
      freeMatches,
      randomMatches,
      longestStreak,
      legendStats,
      weaponStats,
      favLegend: legendStats[0]?.name || '미선택',
      favWeapon: weaponStats[0]?.name || '미선택',
    };
  };

  const selectedStats = buildPlayerCombatStats(selectedPlayer?.display_name);
  const legendStatsArray = selectedStats.legendStats;
  const weaponStatsArray = selectedStats.weaponStats;
  const favLegend = selectedStats.favLegend;
  const favWeapon = selectedStats.favWeapon;
  const myStats = buildPlayerCombatStats(currentUserName);

  const rankAssetVersion = '20260315';
  const getRankAssetPath = (name: string, ext: 'png' | 'webp' = 'png') =>
    `${import.meta.env.BASE_URL}ranks/${name}.${ext}?v=${rankAssetVersion}`;
  const BADGE_FALLBACK_DATA_URI =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="60%" stop-color="#6366f1"/><stop offset="100%" stop-color="#0f172a"/></radialGradient></defs><circle cx="48" cy="48" r="44" fill="url(#g)" stroke="#22d3ee" stroke-width="4"/><path d="M48 24l8 16 18 2-13 12 4 18-17-9-17 9 4-18-13-12 18-2z" fill="#e2e8f0"/></svg>`
    );

  const displayTierLevel = (idx: number | null | undefined, totalRanked: number) => {
    if (typeof idx !== 'number' || idx < 0 || totalRanked <= 0) return 0;
    return getAdaptiveTierLevelByRank(idx + 1, totalRanked);
  };

  const rankBadgeIcon = (name: string, alt: string, fallbackName?: string, glowClass = 'bg-cyan-400/45') => (
    <span className="relative inline-flex items-center justify-center w-12 h-12">
      <span className={`absolute inset-0 blur-[10px] opacity-65 ${glowClass}`}></span>
      <img
        src={getRankAssetPath(name, 'png')}
        alt={alt}
        data-fallback-step="png"
        className="relative w-11 h-11 object-contain shrink-0"
        loading="eager"
        decoding="async"
        draggable={false}
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
          target.src = BADGE_FALLBACK_DATA_URI;
          target.setAttribute('data-fallback-step', 'svg');
        }}
      />
    </span>
  );

  const seasonBadgeIcon = (fileName: string, alt: string, glowClass: string) => (
    <span className="relative inline-flex items-center justify-center w-12 h-12">
      <span className={`absolute inset-0 blur-[10px] opacity-65 ${glowClass}`}></span>
      <img
        src={getRankAssetPath(fileName, 'png')}
        alt={alt}
        data-fallback-step="png"
        className="relative w-11 h-11 object-contain"
        loading="eager"
        decoding="async"
        draggable={false}
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
          target.src = BADGE_FALLBACK_DATA_URI;
          target.setAttribute('data-fallback-step', 'svg');
        }}
      />
    </span>
  );

  const getGrandRankInfo = (idx: number | null | undefined, levelOverride?: number) => {
    const regularRankedCount = rankers.filter((r: any) => (r.regular_wins || 0) > 0).length;
    const level =
      typeof levelOverride === 'number'
        ? levelOverride
        : displayTierLevel(typeof idx === 'number' ? idx : null, regularRankedCount);
    const safeLevel = Math.max(0, Math.min(7, level));
    const num = typeof idx === 'number' && idx >= 0 ? idx + 1 : null;
    if (safeLevel === 7) return { title: '프레데터', num, color: 'text-[#ff5a5a]', glow: 'shadow-[0_0_18px_rgba(255,90,90,0.45)]', bg: 'bg-[#ff5a5a]/20', icon: rankBadgeIcon('predator', 'predator badge', undefined, 'bg-red-500/55') };
    if (safeLevel === 6) return { title: '마스터', num, color: 'text-[#c67cff]', glow: 'shadow-[0_0_14px_rgba(198,124,255,0.4)]', bg: 'bg-[#c67cff]/20', icon: rankBadgeIcon('master', 'master badge', undefined, 'bg-violet-500/45') };
    if (safeLevel === 5) return { title: '다이아몬드', num, color: 'text-[#4fd8ff]', glow: 'shadow-[0_0_12px_rgba(79,216,255,0.35)]', bg: 'bg-[#4fd8ff]/20', icon: rankBadgeIcon('diamond', 'diamond badge', undefined, 'bg-sky-500/45') };
    if (safeLevel === 4) return { title: '플래티넘', num, color: 'text-[#61ff90]', glow: 'shadow-[0_0_10px_rgba(97,255,144,0.3)]', bg: 'bg-[#61ff90]/20', icon: rankBadgeIcon('platinum', 'platinum badge', undefined, 'bg-emerald-500/45') };
    if (safeLevel === 3) return { title: '골드', num, color: 'text-[#ffd84d]', glow: 'shadow-[0_0_8px_rgba(255,216,77,0.28)]', bg: 'bg-[#ffd84d]/20', icon: rankBadgeIcon('gold', 'gold badge', undefined, 'bg-yellow-500/45') };
    if (safeLevel === 2) return { title: '실버', num, color: 'text-[#d0d8e6]', glow: '', bg: 'bg-[#d0d8e6]/18', icon: rankBadgeIcon('silver', 'silver badge', undefined, 'bg-slate-400/40') };
    if (safeLevel === 1) return { title: '브론즈', num, color: 'text-[#d39a6a]', glow: '', bg: 'bg-[#d39a6a]/18', icon: rankBadgeIcon('bronze', 'bronze badge', undefined, 'bg-orange-500/35') };
    return { title: '루키', num: null, color: 'text-[#a3acb9]', glow: '', bg: 'bg-[#a3acb9]/18', icon: rankBadgeIcon('rookie', 'rookie badge', 'bronze', 'bg-slate-500/35') };
  };

  const getRPTierInfo = (idx: number | null | undefined, levelOverride?: number) => {
    const seasonRankedCount = rankers.filter((r: any) => (r.season_matches || 0) > 0).length;
    const level =
      typeof levelOverride === 'number'
        ? levelOverride
        : displayTierLevel(typeof idx === 'number' ? idx : null, seasonRankedCount);
    const safeLevel = Math.max(0, Math.min(7, level));
    const tierRank = typeof idx === 'number' && idx >= 0 ? idx + 1 : null;
    const makeTier = (
      name: string,
      tierRankValue: number | null,
      color: string,
      glow: string,
      bg: string,
      imageFile: string,
      glowClass: string
    ) => ({
      name,
      tierRank: tierRankValue,
      color,
      glow,
      bg,
      icon: seasonBadgeIcon(imageFile, `${name} badge`, glowClass),
    });

    if (safeLevel === 7) {
      return makeTier(
        '이클립스',
        tierRank,
        'text-[#ff5a5a]',
        'shadow-[0_0_18px_rgba(255,90,90,0.45)]',
        'bg-[#ff5a5a]/20',
        'eclipse',
        'bg-red-500/50'
      );
    }
    if (safeLevel === 6) {
      return makeTier(
        '퀘이사',
        tierRank,
        'text-[#c67cff]',
        'shadow-[0_0_16px_rgba(198,124,255,0.4)]',
        'bg-[#c67cff]/20',
        'quasar',
        'bg-violet-500/45'
      );
    }
    if (safeLevel === 5) {
      return makeTier(
        '수퍼노바',
        tierRank,
        'text-[#67d7ff]',
        'shadow-[0_0_14px_rgba(103,215,255,0.38)]',
        'bg-[#67d7ff]/20',
        'supernova',
        'bg-sky-500/45'
      );
    }
    if (safeLevel === 4) {
      return makeTier(
        '네뷸라',
        tierRank,
        'text-[#9df5ff]',
        'shadow-[0_0_12px_rgba(157,245,255,0.34)]',
        'bg-[#9df5ff]/20',
        'nebula',
        'bg-cyan-500/40'
      );
    }
    if (safeLevel === 3) {
      return makeTier(
        '메테오',
        tierRank,
        'text-[#ffd84d]',
        'shadow-[0_0_10px_rgba(255,216,77,0.32)]',
        'bg-[#ffd84d]/20',
        'meteor',
        'bg-amber-500/40'
      );
    }
    if (safeLevel === 2) {
      return makeTier(
        '아스테로이드',
        tierRank,
        'text-[#d7dee8]',
        'shadow-[0_0_10px_rgba(215,222,232,0.3)]',
        'bg-[#d7dee8]/20',
        'asteroid',
        'bg-slate-500/35'
      );
    }
    if (safeLevel === 1) {
      return makeTier(
        '더스트',
        tierRank,
        'text-[#c47a4a]',
        'shadow-[0_0_9px_rgba(196,122,74,0.28)]',
        'bg-[#c47a4a]/20',
        'dust',
        'bg-orange-600/35'
      );
    }
    return makeTier(
      '보이드',
      null,
      'text-slate-300',
      'shadow-[0_0_9px_rgba(148,163,184,0.26)]',
      'bg-slate-400/12',
      'void',
      'bg-slate-500/35'
    );
  };

  const rpRankers = [...rankers].sort(
    (a: any, b: any) => (a.seasonRankIndex ?? Number.MAX_SAFE_INTEGER) - (b.seasonRankIndex ?? Number.MAX_SAFE_INTEGER)
  );
  const normalizeName = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const matchesSearch = (displayName: string | undefined | null, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (displayName || '').toLowerCase().includes(q);
  };
  const regularRankMap = new Map(rankers.map((r) => [normalizeName(r.display_name), r]));

  const getRegularRankInfoByName = (name?: string | null) => {
    const found: any = regularRankMap.get(normalizeName(name));
    if (!found) return null;
    const placed = (found.regular_wins || 0) > 0;
    if (!placed) return getGrandRankInfo(null, 0);
    const idx = typeof found.regular_display_index === 'number' ? found.regular_display_index : found.rankIndex;
    if (typeof idx !== 'number') return getGrandRankInfo(null, found.regular_tier_level || 0);
    return getGrandRankInfo(idx, found.regular_tier_level || undefined);
  };

  const getRegularRankLabelByName = (name?: string | null) => {
    const found: any = regularRankMap.get(normalizeName(name));
    if (!found) return '루키 -위';
    const placed = (found.regular_wins || 0) > 0;
    if (!placed) return '루키 -위';
    const idx = typeof found.regular_display_index === 'number' ? found.regular_display_index : found.rankIndex;
    if (typeof idx !== 'number') return '루키 -위';
    const info = getGrandRankInfo(idx, found.regular_tier_level || undefined);
    return `${info.title} ${idx + 1}위`;
  };

  const getSeasonRankInfoByName = (name?: string | null) => {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const found: any = regularRankMap.get(normalized);
    if (!found) return null;
    const idx = typeof found.season_display_index === 'number' ? found.season_display_index : null;
    if (idx === null) return { index: null as number | null, ...getRPTierInfo(null, found.season_tier_level || 0) };
    return { index: idx, ...getRPTierInfo(idx, found.season_tier_level || undefined) };
  };

  const getSeasonRankLabelByName = (name?: string | null) => {
    const info = getSeasonRankInfoByName(name);
    if (!info) return '보이드 -위';
    if (typeof info.index !== 'number') return `${info.name} -위`;
    return `${info.name} ${info.index + 1}위`;
  };

  const getRegularRankIndexByName = (name?: string | null) => {
    const found: any = regularRankMap.get(normalizeName(name));
    if (!found || (found.regular_wins || 0) <= 0) return null;
    if (typeof found.regular_display_index === 'number') return found.regular_display_index;
    if (typeof found.rankIndex === 'number') return found.rankIndex;
    return null;
  };

  const currentUserRegularInfo = getRegularRankInfoByName(currentUserName);
  const currentUserRegularIndex = getRegularRankIndexByName(currentUserName);
  const currentUserSeasonInfo = getSeasonRankInfoByName(currentUserName);
  const currentUserRegularDefenseStack = (regularRankMap.get(normalizeName(currentUserName)) as any)?.regular_defense_stack ?? 0;
  const currentUserSeasonDefenseStack = (regularRankMap.get(normalizeName(currentUserName)) as any)?.season_defense_stack ?? 0;
  const getStreakBountyGC = (streak?: number) => {
    const safe = streak || 0;
    if (safe < 3) return 0;
    return 100 + (safe - 3) * 50;
  };
  const getDefenseBonusGC = (stack?: number) => (stack || 0) * 200;
  const getModeBountyGCFromRow = (row: any, mode: ChallengeMode | string) => {
    const baseMode = normalizeChallengeMode(mode);
    const isRegular = isRegularMode(baseMode);
    const streak = Number(isRegular ? row?.regular_win_streak : row?.season_win_streak) || 0;
    const defense = Number(isRegular ? row?.regular_defense_stack : row?.season_defense_stack) || 0;
    return getStreakBountyGC(streak) + getDefenseBonusGC(defense);
  };
  const getRegularInnerGlowStyle = (idx: number): React.CSSProperties => {
    if (idx === 0) {
      return {
        background:
          'radial-gradient(circle at 18% 20%, rgba(248,113,113,0.2) 0%, transparent 42%), radial-gradient(circle at 82% 80%, rgba(248,113,113,0.12) 0%, transparent 50%)',
        boxShadow: 'inset 0 0 36px rgba(248,113,113,0.2), inset 0 0 14px rgba(248,113,113,0.24)',
      };
    }
    if (idx < 4) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(167,139,250,0.18) 0%, transparent 44%), radial-gradient(circle at 82% 80%, rgba(167,139,250,0.1) 0%, transparent 52%)',
        boxShadow: 'inset 0 0 32px rgba(167,139,250,0.18), inset 0 0 12px rgba(167,139,250,0.2)',
      };
    }
    if (idx < 9) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.17) 0%, transparent 45%), radial-gradient(circle at 82% 80%, rgba(34,211,238,0.09) 0%, transparent 54%)',
        boxShadow: 'inset 0 0 30px rgba(34,211,238,0.16), inset 0 0 11px rgba(34,211,238,0.18)',
      };
    }
    if (idx < 16) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(52,211,153,0.16) 0%, transparent 45%), radial-gradient(circle at 82% 80%, rgba(52,211,153,0.08) 0%, transparent 54%)',
        boxShadow: 'inset 0 0 28px rgba(52,211,153,0.15), inset 0 0 10px rgba(52,211,153,0.16)',
      };
    }
    if (idx < 25) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(250,204,21,0.14) 0%, transparent 46%), radial-gradient(circle at 82% 80%, rgba(250,204,21,0.08) 0%, transparent 55%)',
        boxShadow: 'inset 0 0 26px rgba(250,204,21,0.13), inset 0 0 10px rgba(250,204,21,0.15)',
      };
    }
    return {
      background:
        'radial-gradient(circle at 20% 20%, rgba(148,163,184,0.12) 0%, transparent 46%), radial-gradient(circle at 82% 80%, rgba(148,163,184,0.07) 0%, transparent 55%)',
      boxShadow: 'inset 0 0 22px rgba(148,163,184,0.12), inset 0 0 8px rgba(148,163,184,0.12)',
    };
  };
  const getSeasonInnerGlowStyle = (idx: number): React.CSSProperties => {
    if (idx === 0) {
      return {
        background:
          'radial-gradient(circle at 18% 20%, rgba(248,113,113,0.2) 0%, transparent 42%), radial-gradient(circle at 82% 80%, rgba(248,113,113,0.12) 0%, transparent 50%)',
        boxShadow: 'inset 0 0 36px rgba(248,113,113,0.2), inset 0 0 14px rgba(248,113,113,0.24)',
      };
    }
    if (idx < 6) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(232,121,249,0.18) 0%, transparent 44%), radial-gradient(circle at 82% 80%, rgba(232,121,249,0.1) 0%, transparent 52%)',
        boxShadow: 'inset 0 0 32px rgba(232,121,249,0.18), inset 0 0 12px rgba(232,121,249,0.2)',
      };
    }
    if (idx < 12) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.17) 0%, transparent 45%), radial-gradient(circle at 82% 80%, rgba(34,211,238,0.09) 0%, transparent 54%)',
        boxShadow: 'inset 0 0 30px rgba(34,211,238,0.16), inset 0 0 11px rgba(34,211,238,0.18)',
      };
    }
    if (idx < 20) {
      return {
        background:
          'radial-gradient(circle at 20% 20%, rgba(125,211,252,0.15) 0%, transparent 46%), radial-gradient(circle at 82% 80%, rgba(125,211,252,0.09) 0%, transparent 55%)',
        boxShadow: 'inset 0 0 28px rgba(125,211,252,0.15), inset 0 0 10px rgba(125,211,252,0.16)',
      };
    }
    return {
      background:
        'radial-gradient(circle at 20% 20%, rgba(165,180,252,0.12) 0%, transparent 46%), radial-gradient(circle at 82% 80%, rgba(165,180,252,0.07) 0%, transparent 55%)',
      boxShadow: 'inset 0 0 24px rgba(165,180,252,0.12), inset 0 0 8px rgba(165,180,252,0.13)',
    };
  };
  const getRankMoveValue = (name?: string | null, mode: 'regular' | 'season' = 'regular') => {
    const key = normalizeName(name);
    if (!key) return 0;
    return (mode === 'regular' ? regularRankMoves[key] : seasonRankMoves[key]) || 0;
  };
  const getRegularTierLevelByName = (name?: string | null) => {
    const found: any = regularRankMap.get(normalizeName(name));
    if (!found) return 0;
    if ((found.regular_wins || 0) <= 0) return 0;
    return typeof found.regular_tier_level === 'number' ? found.regular_tier_level : 0;
  };
  const canRegularChallengeByTierRule = (challengerName?: string | null, targetName?: string | null) => {
    if (!challengerName || !targetName) return false;
    const challengerNorm = normalizeName(challengerName);
    const targetNorm = normalizeName(targetName);
    if (!challengerNorm || !targetNorm || challengerNorm === targetNorm) return false;
    const challengerRow: any = regularRankMap.get(challengerNorm);
    const targetRow: any = regularRankMap.get(targetNorm);
    if (!challengerRow || !targetRow) return false;

    const challengerTierLevel = getRegularTierLevelByName(challengerName);
    const targetTierLevel = getRegularTierLevelByName(targetName);
    const challengerIsRookie = (challengerRow.regular_wins || 0) <= 0 || challengerTierLevel <= 0;
    if (challengerIsRookie) return true;
    if (targetTierLevel <= 0) return false;
    if (targetTierLevel < challengerTierLevel) return false;
    if (targetTierLevel > challengerTierLevel + 1) return false;
    return true;
  };
  const canChallengeTargetByRegularRule = (targetName?: string | null) => {
    if (!targetName || !currentUserName) return false;
    return canRegularChallengeByTierRule(currentUserName, targetName);
  };
  const canAcceptIncomingByRegularRule = (challengerName?: string | null) => {
    if (!challengerName || !currentUserName) return false;
    return canRegularChallengeByTierRule(challengerName, currentUserName);
  };
  const getRegularChallengeUiState = (targetName?: string | null) => {
    if (!targetName || !currentUserName) {
      return { label: '도전불가', hint: '', clickable: false, className: 'bg-slate-800/50 border border-slate-700 text-slate-500' };
    }
    if (targetName.trim() === currentUserName.trim()) {
      return { label: '나', hint: '', clickable: false, className: 'bg-blue-600/20 border border-blue-500/50 text-blue-400' };
    }
    if (matchPhase !== 'idle') {
      return { label: '도전불가', hint: '', clickable: false, className: 'bg-slate-800/50 border border-slate-700 text-slate-500' };
    }
    if (canChallengeTargetByRegularRule(targetName)) {
      return { label: '도전가능', hint: '', clickable: true, className: 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black' };
    }
    return { label: '도전불가', hint: '', clickable: false, className: 'bg-slate-800/50 border border-slate-700 text-slate-500' };
  };

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
  const selectedPlayerSeasonInfo = selectedPlayer ? getSeasonRankInfoByName(selectedPlayer.display_name) : null;
  const selectedPlayerIngameProfile = selectedPlayer ? resolveIngameProfile(selectedPlayer) : { nickname: '', platform: 'steam' as IngamePlatform };
  const selectedPlayerIngameLabel = getIngameIdentityLabel(selectedPlayerIngameProfile.platform);
  const selectedPlayerIngameValue = String(selectedPlayerIngameProfile.nickname || '').trim();
  const selectedPlayerDiscordId = selectedPlayer ? getDiscordCopyCandidate(selectedPlayer) : '';
  const selectedProfileNameStyle = getSingleLineProfileNameStyle(selectedProfileNameFontSize);
  const selectedRankRow = selectedPlayer ? regularRankMap.get(normalizeName(selectedPlayer.display_name)) : null;
  const selectedRegularRp = Math.max(
    0,
    Number((selectedRankRow as any)?.regular_rp ?? (selectedPlayer as any)?.regular_rp ?? 0) || 0
  );
  const selectedSeasonSp = Math.max(
    0,
    Number((selectedRankRow as any)?.season_sp ?? (selectedPlayer as any)?.season_sp ?? 0) || 0
  );
  const recentOpponents = (() => {
    if (!currentUserName) return [] as string[];
    const me = normalizeName(currentUserName);
    const seen = new Set<string>();
    const list: string[] = [];
    for (const m of logs) {
      const left = String(m?.left_player_name || m?.left_player || '').trim();
      const right = String(m?.right_player_name || m?.right_player || '').trim();
      const leftNorm = normalizeName(left);
      const rightNorm = normalizeName(right);
      let opponent = '';
      if (leftNorm === me && right) opponent = right;
      else if (rightNorm === me && left) opponent = left;
      const key = normalizeName(opponent);
      if (!opponent || !key || key === me || seen.has(key)) continue;
      seen.add(key);
      list.push(opponent);
      if (list.length >= 8) break;
    }
    return list;
  })();
  const setRankCardRef = (scope: 'mini' | 'main', mode: 'free' | 'random', name: string) => (el: HTMLDivElement | null) => {
    const key = `${scope}:${mode}:${normalizeName(name)}`;
    rankCardRefs.current[key] = el;
  };
  const handleRankSearchEnter = (scope: 'mini' | 'main') => {
    const queryRaw = scope === 'mini' ? miniSearchQuery : mainSearchQuery;
    const query = queryRaw.trim().toLowerCase();
    if (!query) return;
    const mode = scope === 'mini' ? miniRankMode : mainRankTab;
    const source = mode === 'free' ? rankers : rpRankers;
    const found = source.find((r) => matchesSearch(r.display_name, queryRaw));
    if (!found) {
      playSFX('error');
      showStatusPopup('info', '검색 결과 없음', `입력하신 "${queryRaw}"와 일치하는 닉네임이 없습니다.`);
      return;
    }
    const key = `${scope}:${mode}:${normalizeName(found.display_name)}`;
    const target = rankCardRefs.current[key];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('rank-jump-highlight');
    window.setTimeout(() => target.classList.remove('rank-jump-highlight'), 1300);
    playSFX('success');
  };
  const toggleProfileView = () => {
    setActiveMenu((prev) => (prev === 'profile' ? 'home' : 'profile'));
  };

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
    const modeLabel = getModeDisplayName(log.match_type);
    const isRegularLogMode = isRegularMode(log.match_type);
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
              <img src={getAvatarFallback(leftP, rankers)} className={`w-8 h-8 rounded-full border shrink-0 ${getCardAvatarBorderFxForUser(leftP)}`} alt="left-player" />
              <span className={`font-bold text-lg sm:text-xl whitespace-normal break-all leading-tight ${getNameClassForUser(leftP)}`}>{leftP}</span>
              <span title={`정규 ${leftRegularLabel}`} className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center shrink-0">
                {leftRegularInfo?.icon || <Shield size={11} className="text-slate-300" />}
              </span>
              <span title={`시즌 ${leftSeasonInfo?.name || '미집계'}`} className="w-11 h-11 flex items-center justify-center leading-none shrink-0">
                {leftSeasonInfo?.icon || <Star size={18} className="text-slate-300" />}
              </span>
            </div>
            <p className="text-sm font-bold text-pink-400 leading-tight whitespace-normal break-words">{log.left_legend || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight whitespace-normal break-words">{log.left_weapons?.[0] || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight whitespace-normal break-words">{log.left_weapons?.[1] || '미선택'}</p>
          </button>

          <div className="flex flex-col items-center py-1">
            <span className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest ${isRegularLogMode ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-black'}`}>
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
              <span className={`font-bold text-lg sm:text-xl whitespace-normal break-all leading-tight ${getNameClassForUser(rightP)}`}>{rightP}</span>
              <img src={getAvatarFallback(rightP, rankers)} className={`w-8 h-8 rounded-full border shrink-0 ${getCardAvatarBorderFxForUser(rightP)}`} alt="right-player" />
            </div>
            <p className="text-sm font-bold text-pink-400 leading-tight whitespace-normal break-words">{log.right_legend || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight whitespace-normal break-words">{log.right_weapons?.[0] || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight whitespace-normal break-words">{log.right_weapons?.[1] || '미선택'}</p>
          </button>
        </div>
      </div>
    );
  };

  const globalFontStyle = (
    <style>{`
      @font-face {
        font-family: 'GmarketSansMedium';
        src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'GmarketSansBold';
        src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }
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
      .rank-jump-highlight {
        animation: rank-jump-flash 1.2s ease;
      }
      @keyframes rank-jump-flash {
        0% { box-shadow: 0 0 0 rgba(34,211,238,0); transform: scale(1); }
        30% { box-shadow: 0 0 28px rgba(34,211,238,0.65); transform: scale(1.02); }
        100% { box-shadow: 0 0 0 rgba(34,211,238,0); transform: scale(1); }
      }
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
      /* hover.css 스타일 감성을 참고한 인터랙션 */
      .hvr-grow {
        transform: translateZ(0);
        transition: transform 0.2s ease;
      }
      .hvr-grow:hover { transform: scale(1.045); }
      .hvr-glow {
        transition: box-shadow 0.22s ease, border-color 0.22s ease;
      }
      .hvr-glow:hover {
        border-color: rgba(34, 211, 238, 0.8);
        box-shadow: 0 0 20px rgba(34, 211, 238, 0.38);
      }
      .hvr-buzz {
        transform: translateZ(0);
      }
      .hvr-buzz:hover {
        animation: hvr-buzz-out 0.75s linear 1;
      }
      @keyframes hvr-buzz-out {
        10% { transform: translateX(3px) rotate(2deg); }
        20% { transform: translateX(-3px) rotate(-2deg); }
        30% { transform: translateX(2px) rotate(1deg); }
        40% { transform: translateX(-2px) rotate(-1deg); }
        50% { transform: translateX(1px) rotate(1deg); }
        60% { transform: translateX(-1px) rotate(-1deg); }
        100% { transform: translateX(0) rotate(0); }
      }
	      @keyframes popup-in {
	        0% { opacity: 0; transform: translateY(16px) scale(0.96); }
	        100% { opacity: 1; transform: translateY(0) scale(1); }
	      }
	      @keyframes popup-fade {
	        0% { opacity: 1; transform: translateY(0) scale(1); }
	        100% { opacity: 0; transform: translateY(12px) scale(0.98); }
	      }
      @keyframes fx-win-pulse {
        0% { opacity: 0; transform: scale(0.86); }
        20% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.08); }
      }
      @keyframes fx-lose-pulse {
        0% { opacity: 0; transform: scale(0.92); }
        20% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.02); }
      }
      @keyframes firework-burst {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.45); }
      }
      @keyframes chest-float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-8px) scale(1.02); }
      }
      @keyframes chest-open-burst {
        0% { transform: scale(1); filter: brightness(1); }
        30% { transform: scale(1.08); filter: brightness(1.25); }
        55% { transform: scale(0.96); filter: brightness(1.5); }
        100% { transform: scale(1); filter: brightness(1.05); }
      }
      @keyframes chest-spark {
        0% { opacity: 0; transform: translateY(6px) scale(0.6); }
        30% { opacity: 1; transform: translateY(-4px) scale(1); }
        100% { opacity: 0; transform: translateY(-22px) scale(1.2); }
      }
      @keyframes reward-pop {
        0% { opacity: 0; transform: translateY(10px) scale(0.86); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .reward-chest-shell {
        position: relative;
        overflow: hidden;
      }
      .reward-chest-shell::before,
      .reward-chest-shell::after {
        content: '';
        position: absolute;
        inset: -20%;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(circle, rgba(250,204,21,0.35) 0%, rgba(34,211,238,0.12) 38%, transparent 70%);
      }
      .reward-chest-shell.is-opening::before,
      .reward-chest-shell.is-opening::after {
        animation: chest-spark 680ms ease-out;
      }
      .reward-chest-shell.is-opening::after {
        animation-delay: 120ms;
      }
      @keyframes star-rain-fall {
        0% { opacity: 0; transform: translate3d(0, -12vh, 0) scale(0.75) rotate(0deg); }
        10% { opacity: 1; }
        90% { opacity: 0.95; }
        100% { opacity: 0; transform: translate3d(var(--drift), 118vh, 0) scale(1.08) rotate(260deg); }
      }
      .star-rain-item {
        position: absolute;
        top: -14vh;
        color: rgba(255, 243, 168, 0.98);
        text-shadow:
          0 0 10px rgba(250, 204, 21, 0.85),
          0 0 22px rgba(34, 211, 238, 0.55);
        animation-name: star-rain-fall;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      .star-rain-item.meteor {
        color: rgba(251, 191, 36, 0.98);
        text-shadow:
          0 0 10px rgba(251, 146, 60, 0.92),
          0 0 22px rgba(248, 113, 113, 0.7),
          0 0 32px rgba(34, 211, 238, 0.36);
      }
      @keyframes victory-star-fall {
        0% { opacity: 0; transform: translate3d(0,-10vh,0) scale(0.75) rotate(0deg); }
        10% { opacity: 1; }
        100% { opacity: 0; transform: translate3d(var(--drift),108vh,0) scale(1.2) rotate(320deg); }
      }
      .victory-star-item {
        position: absolute;
        top: -12vh;
        animation-name: victory-star-fall;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 24px rgba(34,211,238,0.65);
      }
      @keyframes taunt-fall {
        0% { opacity: 0; transform: translate3d(0,-8vh,0) rotate(var(--rot)) scale(0.8); }
        10% { opacity: 1; }
        60% { opacity: 1; transform: translate3d(calc(var(--drift) * 0.45),42vh,0) rotate(calc(var(--rot) * -0.8)) scale(1.05); }
        100% { opacity: 0; transform: translate3d(var(--drift),96vh,0) rotate(calc(var(--rot) * 1.5)) scale(0.95); }
      }
      .taunt-fall-item {
        position: absolute;
        top: -10vh;
        animation-name: taunt-fall;
        animation-timing-function: ease-in-out;
        animation-fill-mode: forwards;
        color: rgba(255, 210, 230, 0.98);
        font-weight: 900;
        text-shadow: 0 0 10px rgba(244,114,182,0.65), 0 0 20px rgba(251,191,36,0.45);
        white-space: nowrap;
      }
    `}</style>
  );

  return (
    <div className="flex h-screen bg-black text-slate-300 overflow-hidden relative select-none">
      {globalFontStyle}
      {starRainActive && (
        <div className="fixed inset-0 z-[48] pointer-events-none overflow-hidden">
          {starRainParticles.map((particle) => (
            <span
              key={`star-rain-${particle.id}`}
              className={`star-rain-item ${particle.kind === 'meteor' ? 'meteor' : ''}`}
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                fontSize: `${particle.size}px`,
                ['--drift' as any]: `${particle.drift}px`,
              }}
            >
              {particle.kind === 'meteor' ? '☄' : '✦'}
            </span>
          ))}
        </div>
      )}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 brightness-[0.76] contrast-[1.08] saturate-[1.04]" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.30),rgba(2,6,23,0.62))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_80%_22%,rgba(217,70,239,0.08),transparent_42%)]"></div>
        <div className="absolute inset-0 backdrop-blur-[1.2px]"></div>
      </div>
      
      <aside className="w-14 sm:w-16 lg:w-20 bg-black/20 backdrop-blur-md border-r border-cyan-500/30 shadow-2xl flex flex-col items-center py-6 sm:py-8 lg:py-10 gap-6 sm:gap-8 lg:gap-10 z-20 shrink-0 h-screen fixed left-0">
        <div onMouseEnter={() => playSFX('hover')} onClick={triggerStarRain} className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg cursor-pointer">
          <Star className="text-cyan-400 animate-pulse" size={20}/>
        </div>
        <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10 text-slate-500 w-full items-center">
          {visibleMenuItems.map((item) => (
            <div
              key={item.id}
              title={item.label}
              onMouseEnter={() => playSFX('hover')}
              onClick={() => {
                playSFX('click');
                setActiveMenu(item.id);
                if (item.id === 'ranking') setMainSearchQuery('');
              }}
              className={`cursor-pointer transition-all ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300'}`}
            >
              <item.icon size={20}/>
            </div>
          ))}
        </div>
        <div onMouseEnter={() => playSFX('hover')} className="mt-auto mb-4 sm:mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout}>
          <LogOut size={20}/>
        </div>
      </aside>

      <div ref={mainScrollRef} className="flex-1 flex flex-col z-10 relative ml-14 sm:ml-16 lg:ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="relative px-3 sm:px-4 lg:px-10 py-3 sm:py-4 lg:py-6 flex flex-col xl:flex-row xl:justify-between items-stretch xl:items-center gap-3 sm:gap-4 shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md">
          {masterUiPrefs.showDiscordEntry && (
            <a
              href={masterUiPrefs.discordInviteUrl || DEFAULT_DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              title="디스코드 서버 바로가기"
              onMouseEnter={() => playSFX('hover')}
              onClick={() => playSFX('click')}
              className="absolute z-20 inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/45 bg-black/50 px-2 py-1 text-[11px] sm:text-xs font-black text-indigo-200 hover:border-indigo-300/65 hover:text-indigo-100 transition-all"
              style={{
                top: `${masterUiPrefs.discordButtonTopPx}px`,
                left: `${masterUiPrefs.discordButtonLeftPx}px`,
              }}
            >
              <img src={discordCustomIcon} alt="discord" className="w-4 h-4 sm:w-[18px] sm:h-[18px] object-contain drop-shadow-[0_0_8px_rgba(129,140,248,0.55)]" />
              입장하기
            </a>
          )}
          <div onMouseEnter={() => playSFX('hover')} className={`min-w-0 flex-1 cursor-pointer flex items-center gap-3 sm:gap-4 lg:gap-6 ${masterUiPrefs.showDiscordEntry ? 'pt-4 sm:pt-5' : ''}`} onClick={() => setActiveMenu('home')}>
            <div className="flex flex-col items-start gap-1 sm:gap-2 shrink-0">
              <h1
                className="font-bold text-white italic tracking-tighter drop-shadow-[0_0_20px_purple] leading-none whitespace-nowrap"
                style={{
                  fontSize: `clamp(${Math.round((24 * masterUiPrefs.titleScalePercent) / 100)}px, ${Math.round((8 * masterUiPrefs.titleScalePercent) / 100)}vw, ${Math.round((64 * masterUiPrefs.titleScalePercent) / 100)}px)`,
                }}
              >
                {masterUiPrefs.headerTitle || '은하단'}
              </h1>
            </div>
            {masterUiPrefs.showSeasonTitle && (
              <>
                <div className="hidden sm:block w-px h-14 lg:h-16 bg-gradient-to-b from-cyan-300 to-fuchsia-400 opacity-80 shrink-0"></div>
                <div className="hidden sm:flex flex-col min-w-0 overflow-hidden">
                  <h2 className="text-lg sm:text-[1.35rem] lg:text-[2.35rem] leading-tight font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-300 tracking-tight truncate">
                    {masterUiPrefs.seasonTitle || '별들의 전쟁 : 시즌 1'}
                  </h2>
                  <p className="hidden lg:block text-[12px] lg:text-[15px] font-bold text-cyan-300/90 italic tracking-wide">
                    SEASON 01 BATTLE FOR THE STAR THRONE
                  </p>
                  {masterUiPrefs.headerBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {masterUiPrefs.headerBadges.filter((badge) => badge.trim().length > 0).map((badge, idx) => (
                        <span
                          key={`${badge}-${idx}`}
                          className="px-2.5 py-1 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-[11px] font-black tracking-wide"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {user ? (
            <div className="flex items-center gap-3 sm:gap-4 w-full xl:w-auto justify-between xl:justify-end flex-wrap">
                <div className="hidden md:flex flex-col items-start min-w-0 w-full sm:w-auto sm:min-w-[220px] lg:min-w-[300px] xl:min-w-[350px] max-w-full pr-0 sm:pr-1">
                    <div className="flex items-center gap-3 w-full">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center shrink-0">{currentUserRegularInfo?.icon || <Shield size={34} className="text-slate-300" />}</span>
                      <span className={`text-sm sm:text-[1.1rem] lg:text-[1.65rem] font-black leading-tight whitespace-nowrap truncate max-w-[190px] sm:max-w-[260px] lg:max-w-[340px] drop-shadow-[0_0_10px_rgba(250,204,21,0.4)] ${currentUserRegularInfo?.color || 'text-yellow-300'}`}>
                        {currentUserRegularIndex !== null ? `${currentUserRegularInfo?.title || '루키'} ${currentUserRegularIndex + 1}위` : '루키 -위'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-full mt-1.5">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center leading-none shrink-0">{currentUserSeasonInfo?.icon || '🪐'}</span>
                      <span className={`text-sm sm:text-[1.1rem] lg:text-[1.65rem] font-black leading-tight whitespace-nowrap truncate max-w-[190px] sm:max-w-[260px] lg:max-w-[340px] drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] ${currentUserSeasonInfo?.color || 'text-slate-300'}`}>
                        {currentUserSeasonInfo
                          ? `${currentUserSeasonInfo.name} ${typeof currentUserSeasonInfo.index === 'number' ? `${currentUserSeasonInfo.index + 1}위` : '-위'}`
                          : '보이드 -위'}
                      </span>
                    </div>
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
                  <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); toggleProfileView(); }} className="flex items-center gap-3 sm:gap-4 bg-black/60 p-2.5 sm:p-3.5 rounded-full border border-white/10 pr-4 sm:pr-5 border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all w-full sm:w-auto justify-center sm:justify-start">
                    <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border-2 ${equippedBorderFxClass}`} alt="profile"/>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-base sm:text-[1.2rem] lg:text-[1.6rem] leading-tight font-black truncate max-w-[140px] sm:max-w-[190px] ${equippedNameClass}`}>{currentUserName || "GUEST"}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">Profile</span>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-emerald-400/40 bg-black/55 text-emerald-300 text-sm sm:text-base font-black w-full sm:w-auto text-center">
                    GC 코인 {Number(profile?.gc ?? 1000).toLocaleString()}
                  </div>
                </div>
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl border border-pink-400/40 text-pink-300 font-bold bg-black/45 hover:bg-pink-500/20 transition-all cursor-pointer"
                >
                  로그아웃
                </button>
            </div>
          ) : (
            <button onMouseEnter={() => playSFX('hover')} onClick={handleLogin} className="flex items-center gap-3 bg-cyan-600/20 border-2 border-cyan-400 py-2.5 px-8 rounded-full shadow-[0_0_20px_cyan] hover:bg-cyan-400 hover:text-black font-bold text-sm cursor-pointer">
              <LogIn size={20}/> LOGIN
            </button>
          )}
        </header>

        {activeMenu === 'home' && (
          <main
            className="flex-1 p-3 sm:p-4 lg:p-10 grid grid-cols-12 items-start xl:items-stretch pb-20 animate-in fade-in duration-500 h-full"
            style={{ gap: `${masterUiPrefs.homeGapPx}px`, marginTop: `${masterUiPrefs.homeTopOffsetPx}px` }}
          >
            <div className="col-span-12 xl:col-span-8 flex flex-col h-auto xl:h-full relative order-1 xl:order-1" style={{ gap: `${masterUiPrefs.homeGapPx}px` }}>
              <div
                className={`grid ${
                  masterUiPrefs.showOnlineBoard && masterUiPrefs.showMatchBoard ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                } gap-2 sm:gap-4 lg:gap-8 items-start`}
              >
                {masterUiPrefs.showOnlineBoard && (
                <div className="flex flex-col h-auto relative">
               <section className="board-soft-glow bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 rounded-[2rem] lg:rounded-[2.5rem] p-4 sm:p-5 lg:p-6 flex flex-col h-full overflow-hidden shadow-lg relative z-10">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-base sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 lg:mb-6 border-b border-white/5 pb-3 lg:pb-4 leading-tight">
                    접속 현황 (Online Board)
                  </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-1 sm:pr-2 pt-2 animate-in fade-in">
                        {onlineRankers.length > 0 ? onlineRankers.map((ou, i) => {
                          const regularIdx = typeof ou.regular_display_index === 'number' ? ou.regular_display_index : null;
                          const rankInfo = getGrandRankInfo(regularIdx, (ou as any).regular_tier_level);
                          const seasonInfo = getSeasonRankInfoByName(ou.display_name);
                          const challengeUi = getRegularChallengeUiState(ou.display_name);
                          return (
                            <div key={i} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-white/10 p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-between hover:border-cyan-400/50 transition-all group gap-2">
                               <div className="flex items-center gap-2 sm:gap-4 cursor-pointer group/profile flex-1 min-w-0 mr-1 sm:mr-2" onClick={() => handleProfileClick(ou.display_name)}>
                                  <div className="relative shrink-0">
                                      <img
                                        src={ou.avatar_url}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-colors ${getCardAvatarBorderFxForUser(ou.display_name)}`}
                                        alt="profile"
                                      />
                                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                     <span className={`group-hover/profile:text-cyan-400 text-base sm:text-lg font-bold truncate leading-tight ${getNameClassForUser(ou.display_name)}`}>{ou.display_name}</span>
                                     <span className={`text-[11px] font-bold mt-1 ${rankInfo?.color || ''}`}>{rankInfo ? `${rankInfo.title} ${regularIdx === null ? '-위' : `${regularIdx + 1}위`}` : '루키 -위'}</span>
                                    <span className={`text-[11px] font-bold mt-0.5 ${seasonInfo?.color || 'text-slate-400'}`}>
                                      {seasonInfo
                                        ? `${seasonInfo.name} ${typeof seasonInfo.index === 'number' ? `${seasonInfo.index + 1}위` : '-위'}`
                                        : '보이드 -위'}
                                    </span>
                                  </div>
                               </div>
                                {ou.display_name.trim() === currentUserName?.trim() ? (
                                    <div className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 border border-blue-500/50 text-blue-400 shrink-0">나</div>
                                ) : (
                                   <button 
                                     onMouseEnter={() => playSFX('hover')} 
                                     onClick={() => {
                                       if (!challengeUi.clickable) return;
                                       playSFX('click');
                                       handleTargetLock(ou.display_name);
                                     }} 
                                     title={challengeUi.hint ? `남은 시간: ${challengeUi.hint}` : undefined}
                                     disabled={!challengeUi.clickable}
                                      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer ${challengeUi.className}`}
                                    >
                                     {challengeUi.label}
                                   </button>
                                 )}
                            </div>
                          )
                       }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">{onlineBoardEmptyText}</div>)}
                    </div>
               </section>
                </div>
                )}

                {masterUiPrefs.showMatchBoard && (
                <div className="flex flex-col h-auto relative">
               <section className="board-soft-glow bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-2xl rounded-[2rem] lg:rounded-[3rem] p-4 sm:p-5 flex flex-col h-auto shrink-0 relative z-10 overflow-visible">
                  <div className="flex flex-col relative z-10">
                      <h3 onMouseEnter={() => playSFX('hover')} className="text-base sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 border-b border-white/5 pb-3 leading-tight">
                         {matchPhase === 'idle' && '대전 신청 (Match Entry)'}
                         {matchPhase === 'waiting_sync' && '대전 준비 (Match Prep)'}
                         {matchPhase === 'scoring' && '결과 제출 (Submit Score)'}
                      </h3>
                      
                      {matchPhase === 'idle' && (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-5">
                           <div className="flex flex-col items-center text-center mb-1">
                               <Target size={46} className="text-cyan-400 drop-shadow-[0_0_15px_cyan] mb-3" />
                               <h4 className="text-xl sm:text-2xl font-bold text-white tracking-widest">타겟과 모드를 설정하세요</h4>
                           </div>
                            <div className="bg-black/60 p-4 rounded-2xl border border-white/10 shadow-inner relative">
                               <p className="text-xs text-slate-500 font-bold mb-2 pl-2">상대방 닉네임 (TARGET NICKNAME)</p>
                                <input
                                 value={entryOpponent}
                                 onChange={(e) => setEntryOpponent(e.target.value)}
                                 onFocus={() => setShowRecentOpponentsDropdown(true)}
                                 onClick={() => setShowRecentOpponentsDropdown(true)}
                                 onBlur={() => window.setTimeout(() => setShowRecentOpponentsDropdown(false), 120)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
                                     e.preventDefault();
                                     handleStartMatch();
                                   }
                                 }}
                                 placeholder="상대방 닉네임 직접 입력"
                                  className="w-full bg-transparent outline-none text-white font-bold text-lg sm:text-xl select-text pl-2"
                                />
                                {showRecentOpponentsDropdown && recentOpponents.length > 0 && (
                                  <div className="absolute left-3 right-3 top-[84px] z-30 rounded-xl border border-cyan-400/35 bg-[#070b16]/95 backdrop-blur-lg p-2 shadow-[0_0_18px_rgba(34,211,238,0.22)] max-h-56 overflow-y-auto custom-scrollbar">
                                    <p className="text-[11px] text-slate-400 font-black px-2 pb-1">최근 대전 상대</p>
                                    <div className="space-y-1">
                                      {recentOpponents.map((op) => (
                                        <button
                                          key={op}
                                          onMouseEnter={() => playSFX('hover')}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            playSFX('click');
                                            setEntryOpponent(op);
                                            setShowRecentOpponentsDropdown(false);
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-black/35 text-cyan-200 text-sm font-bold hover:border-cyan-400/55 hover:bg-cyan-500/20 transition-all cursor-pointer"
                                        >
                                          {op}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                           <div className="flex gap-2 p-1.5 bg-black/50 rounded-2xl border border-white/5">
                              <button
                                onMouseEnter={() => playSFX('hover')}
                                onClick={() => handleModeChange('free')}
                                className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all cursor-pointer ${isRegularMode(entryMode) ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                              >
                                정규 대전
                              </button>
                              <button
                                onMouseEnter={() => playSFX('hover')}
                                onClick={() => handleModeChange('season')}
                                className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all cursor-pointer ${!isRegularMode(entryMode) ? 'bg-cyan-600 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                              >
                                시즌 대전
                              </button>
                           </div>
                           {!isRegularMode(entryMode) && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-black/45 rounded-2xl border border-cyan-400/20">
                               {SEASON_MODE_MENU.map((opt) => {
                                 const active = normalizeChallengeMode(entryMode) === opt.mode;
                                 return (
                                   <button
                                     key={opt.mode}
                                     onMouseEnter={() => playSFX('hover')}
                                     onClick={() => handleSeasonSubModeChange(opt.mode)}
                                     className={`text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${active ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.26)]' : 'bg-black/40 border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200'}`}
                                   >
                                     <p className="font-black text-sm sm:text-base leading-tight">{opt.label}</p>
                                     <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-tight">{opt.description}</p>
                                   </button>
                                 );
                               })}
                             </div>
                           )}
                           
                            <div className="bg-black/60 p-5 rounded-2xl border border-white/5 mt-2 flex flex-col gap-4">
                               <div className="flex items-center justify-between text-sm sm:text-base font-black">
                                 <span className="text-slate-300">보유 중 GC 코인</span>
                                 <span className="text-emerald-300">{Number(profile?.gc ?? 1000).toLocaleString()} GC</span>
                               </div>
                               <div className="flex justify-between items-center">
                                  <p className="text-base text-pink-400 font-bold">배팅 금액 (GC) <span className="text-slate-500 ml-2 text-xs">0 가능</span></p>
                                  <input 
                                   type="number" 
                                   min={0} 
                                   value={betAmount} 
                                  onChange={(e) => setBetAmount(Number(e.target.value) || 0)} 
                                  onBlur={() => {
                                    if (betAmount < 0) setBetAmount(0);
                                  }}
                                   className="w-28 bg-white/5 border border-white/10 p-2.5 rounded-xl outline-none text-white font-bold text-right text-lg select-text cursor-pointer" 
                                 />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                 <div className="grid grid-cols-3 gap-1 min-w-0">
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(0, p - 50)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-50</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(0, p - 100)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-100</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => Math.max(0, p - 500)); }} className="w-full px-0 py-2 bg-pink-500/20 text-pink-400 border border-pink-500/50 rounded-lg text-sm font-bold hover:bg-pink-500 hover:text-white transition-colors">-500</button>
                                 </div>
                                 <div className="grid grid-cols-3 gap-1 min-w-0">
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 50); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+50</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 100); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+100</button>
                                    <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setBetAmount(p => p + 500); }} className="w-full px-0 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-bold hover:bg-cyan-500 hover:text-black transition-colors">+500</button>
                                 </div>
                              </div>
                           </div>

                           <button onMouseEnter={() => playSFX('hover')} onClick={handleStartMatch} className="hvr-grow hvr-glow w-full py-5 mt-6 rounded-[2rem] font-bold text-2xl text-white bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:bg-blue-500 transition-all border border-blue-400 cursor-pointer">
                              {isRegularMode(entryMode) ? '매칭 신청 (200GP)' : '매칭 신청 및 수락'}
                           </button>
                        </div>
                      )}

                      {matchPhase === 'waiting_sync' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                           <div className="w-24 h-24 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-10 shadow-lg"></div>
                           <h4 className="text-3xl font-bold text-cyan-400 tracking-widest">타겟 접속 대기중</h4>
                           <p className="text-base text-slate-300 mt-5 text-center leading-relaxed">
                             상대방(<span className="text-pink-400 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleProfileClick(entryOpponent)}>{entryOpponent}</span>)이 신청을 수락하면<br/>바로 결과 입력 화면으로 이동합니다.
                            </p>
                           <button onMouseEnter={() => playSFX('hover')} onClick={handleCancelMatch} className="mt-12 px-10 py-4 rounded-full border-2 border-pink-500/50 text-pink-400 font-bold text-lg hover:bg-pink-500 hover:text-white transition-all shadow-md cursor-pointer">매칭 취소 (Cancel)</button>
                        </div>
                      )}

                       {matchPhase === 'scoring' && activeMatch && (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-4 mt-2">
                           <div onMouseEnter={() => playSFX('hover')} className={`p-5 rounded-[2.5rem] border-2 shadow-2xl flex flex-col gap-4 ${getModeAccent(activeMatch.mode).panel}`}>
                             <div className="flex items-center justify-center mb-1">
                               <span className={`px-3 py-1 rounded-lg text-[11px] font-black tracking-widest ${getModeAccent(activeMatch.mode).badge}`}>
                                 {getModeDisplayName(activeMatch.mode)}
                               </span>
                             </div>

                             {isFreePickMode(activeMatch.mode) ? (
                               <div className="space-y-3">
                                 <p className="text-center text-sm font-bold text-cyan-300">내 레전드/무기 설정</p>
                                 <select
                                   onMouseEnter={() => playSFX('hover')}
                                   value={entryLegend}
                                   onChange={(e) => { setEntryLegend(e.target.value); playSFX('click'); }}
                                   className="w-full min-w-0 bg-black/60 border border-white/10 py-4 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate"
                                 >
                                   <option value="" disabled hidden>👉 레전드 선택</option>
                                   {Object.entries(LEGEND_CATEGORIES).map(([cat, list]) => (
                                     <optgroup key={cat} label={`■ ${cat}`} style={{ color: getLegendCategoryColorHex(cat), backgroundColor: '#000' }}>
                                       {list.map((l) => (
                                         <option key={l} value={l} style={{ color: '#fff' }}>
                                           {l}
                                         </option>
                                       ))}
                                     </optgroup>
                                   ))}
                                 </select>
                                 <div className="flex gap-3 w-full">
                                   <select
                                     onMouseEnter={() => playSFX('hover')}
                                     value={entryWeapons[0]}
                                     onChange={(e) => { const w = [...entryWeapons]; w[0] = e.target.value; setEntryWeapons(w); playSFX('click'); }}
                                     className="flex-1 min-w-0 bg-black/60 border border-white/10 py-4 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate"
                                   >
                                     <option value="" disabled hidden>👉 무기 1 선택</option>
                                     {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (
                                       <optgroup key={cat} label={`■ ${cat}`} style={{ color: getWeaponCategoryColorHex(cat), backgroundColor: '#000' }}>
                                         {list.map((w) => (
                                           <option key={w} value={w} style={{ color: '#fff' }}>
                                             {w}
                                           </option>
                                         ))}
                                       </optgroup>
                                     ))}
                                   </select>
                                   <select
                                     onMouseEnter={() => playSFX('hover')}
                                     value={entryWeapons[1]}
                                     onChange={(e) => { const w = [...entryWeapons]; w[1] = e.target.value; setEntryWeapons(w); playSFX('click'); }}
                                     className="flex-1 min-w-0 bg-black/60 border border-white/10 py-4 pl-4 pr-8 rounded-2xl text-base font-bold outline-none text-white cursor-pointer hover:border-cyan-400 transition-colors truncate"
                                   >
                                     <option value="" disabled hidden>👉 무기 2 선택</option>
                                     {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (
                                       <optgroup key={cat} label={`■ ${cat}`} style={{ color: getWeaponCategoryColorHex(cat), backgroundColor: '#000' }}>
                                         {list.map((w) => (
                                           <option key={w} value={w} style={{ color: '#fff' }}>
                                             {w}
                                           </option>
                                         ))}
                                       </optgroup>
                                     ))}
                                   </select>
                                 </div>
                               </div>
                             ) : isRandomSeasonMode(activeMatch.mode) ? (
                               <div className="flex flex-col gap-3">
                                 <p className="text-center text-sm font-bold text-cyan-300">랜덤 리롤</p>
                                 <button
                                   onMouseEnter={() => playSFX('hover')}
                                   onClick={handleReroll}
                                   className={`py-4 rounded-2xl font-bold text-base transition-all border cursor-pointer ${rerollCount === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-black shadow-[0_0_15px_emerald]' : 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500 hover:text-black shadow-[0_0_15px_amber]'}`}
                                 >
                                   {rerollCount === 0 ? '🎁 1회 무료 리롤' : '🔄 50 GC 리롤'}
                                 </button>
                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-cyan-400 border border-white/10 shadow-inner whitespace-normal break-words">
                                     {entryLegend || '랜덤 레전드'}
                                   </div>
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-pink-400 border border-white/10 shadow-inner whitespace-normal break-words">
                                     {entryWeapons[0] || '랜덤 무기 1'}
                                   </div>
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-pink-400 border border-white/10 shadow-inner whitespace-normal break-words">
                                     {entryWeapons[1] || '랜덤 무기 2'}
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="flex flex-col gap-3">
                                 <p className="text-center text-sm font-bold text-cyan-300">{getModeDisplayName(activeMatch.mode)} 고정 규칙</p>
                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-cyan-300 border border-cyan-400/35 shadow-inner whitespace-normal break-words">
                                     {entryLegend || getFixedSeasonLoadout(activeMatch.mode)?.legend || '-'}
                                   </div>
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-pink-300 border border-pink-400/35 shadow-inner whitespace-normal break-words">
                                     {entryWeapons[0] || getFixedSeasonLoadout(activeMatch.mode)?.weapons?.[0] || '-'}
                                   </div>
                                   <div className="bg-black/60 p-3 rounded-2xl text-center text-sm font-bold text-pink-300 border border-pink-400/35 shadow-inner whitespace-normal break-words">
                                     {entryWeapons[1] || getFixedSeasonLoadout(activeMatch.mode)?.weapons?.[1] || '-'}
                                   </div>
                                 </div>
                               </div>
                             )}

                             <div className="flex items-center justify-center gap-2 whitespace-nowrap px-1">
                                 <span className="text-3xl font-black text-yellow-400">{myWins ?? '-'}</span>
                                 <span className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.75)]">VS</span>
                                 <span className="text-3xl font-black text-yellow-400">{myLosses ?? '-'}</span>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                               <div className="min-w-0 bg-black/55 rounded-2xl border border-white/10 px-4 py-3">
                                 <div className="flex items-center gap-3 min-w-0 mb-2">
                                   <img src={currentUserAvatar || getAvatarFallback(currentUserName, rankers)} className={`w-10 h-10 rounded-full border shrink-0 ${getCardAvatarBorderFxForUser(currentUserName)}`} alt="my-avatar"/>
                                   <p className={`${getResponsiveNameClass(currentUserName || 'GUEST', 'medium')} leading-none`}>{currentUserName || 'GUEST'}</p>
                                 </div>
                                 <div className="space-y-1">
                                   <p className="text-sm font-bold text-pink-400 leading-snug whitespace-normal break-words">{entryLegend || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{entryWeapons[0] || '?'}</p>
                                   <p className="text-sm font-bold text-cyan-300 leading-snug whitespace-normal break-words">{entryWeapons[1] || '?'}</p>
                                 </div>
                               </div>

                               <div className="min-w-0 bg-black/55 rounded-2xl border border-white/10 px-4 py-3">
                                 <div className="flex items-center justify-end gap-3 min-w-0 mb-2">
                                   <p className={`${getResponsiveNameClass(activeMatch.opponent || 'OPPONENT', 'medium')} leading-none`}>{activeMatch.opponent || 'OPPONENT'}</p>
                                   <img src={getAvatarFallback(activeMatch.opponent, rankers)} className={`w-10 h-10 rounded-full border shrink-0 ${getCardAvatarBorderFxForUser(activeMatch.opponent)}`} alt="opponent-avatar"/>
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
                              <div className="flex flex-col gap-2 px-3">
                                <span className="text-slate-300 text-sm font-bold tracking-wide">승리 목표</span>
                                <div className="flex flex-wrap gap-2">
                                  {WIN_TARGET_OPTIONS.map((target) => (
                                    <button
                                      key={`target-${target}`}
                                      onMouseEnter={() => playSFX('hover')}
                                      onClick={() => {
                                        playSFX('click');
                                        setWinTarget(target);
                                        if (myWins !== null && myWins > target) setMyWins(target);
                                        if (myLosses !== null && myLosses > target) setMyLosses(target);
                                      }}
                                      className={`px-4 py-2 rounded-xl border font-black text-sm sm:text-base transition-all cursor-pointer ${
                                        winTarget === target
                                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                                          : 'bg-black/50 text-slate-300 border-white/10 hover:border-cyan-400/50'
                                      }`}
                                    >
                                      {target}승
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 mb-3">
                                <label className="rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 flex items-center justify-between gap-3">
                                  <span className="text-cyan-300 font-black text-lg sm:text-xl tracking-wide">나의 승리</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={winTarget}
                                    value={myWins ?? ''}
                                    onChange={(e) => {
                                      setMyWins(parseManualScoreInput(e.target.value, winTarget));
                                    }}
                                    onBlur={(e) => {
                                      setMyWins(parseManualScoreInput(e.target.value, winTarget));
                                    }}
                                    onFocus={() => playSFX('hover')}
                                    placeholder="0"
                                    className="w-24 sm:w-28 rounded-xl border-2 border-cyan-400/55 bg-black/70 px-3 py-2 text-center text-2xl font-black text-cyan-200 outline-none focus:border-cyan-300"
                                  />
                                </label>
                                <label className="rounded-2xl border border-pink-400/35 bg-pink-500/10 px-4 py-3 flex items-center justify-between gap-3">
                                  <span className="text-pink-300 font-black text-lg sm:text-xl tracking-wide">나의 패배</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={winTarget}
                                    value={myLosses ?? ''}
                                    onChange={(e) => {
                                      setMyLosses(parseManualScoreInput(e.target.value, winTarget));
                                    }}
                                    onBlur={(e) => {
                                      setMyLosses(parseManualScoreInput(e.target.value, winTarget));
                                    }}
                                    onFocus={() => playSFX('hover')}
                                    placeholder="0"
                                    className="w-24 sm:w-28 rounded-xl border-2 border-pink-400/55 bg-black/70 px-3 py-2 text-center text-2xl font-black text-pink-200 outline-none focus:border-pink-300"
                                  />
                                </label>
                              </div>
                              <div className="px-3 py-2 rounded-xl border border-white/10 bg-black/30 text-center">
                                <p className={`font-black text-base sm:text-lg ${waitingForScore ? 'text-yellow-300 animate-pulse' : isTerminalScoreSelection(myWins, myLosses, winTarget) ? 'text-emerald-300' : 'text-slate-400'}`}>
                                  {waitingForScore
                                    ? '결과를 업로드하고 있습니다...'
                                    : isTerminalScoreSelection(myWins, myLosses, winTarget)
                                      ? '점수가 자동으로 업로드되고 있습니다...'
                                      : `승리 목표(${winTarget}승)에 맞춰 승/패 점수를 입력해주세요.`}
                                </p>
                              </div>
                              <div className="px-3 pb-1">
                                <button
                                  onMouseEnter={() => playSFX('hover')}
                                  onClick={handleCancelMatch}
                                  className="w-full py-3 rounded-2xl border border-rose-400/70 bg-rose-500/10 text-rose-300 font-black text-base sm:text-lg hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-[0_0_14px_rgba(244,63,94,0.35)]"
                                >
                                  경기 취소
                                </button>
                              </div>
                           </div>
                        </div>
                      )}
                  </div>
               </section>
                </div>
                )}
              </div>

            {masterUiPrefs.showRecentBoard && (
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
            )}
            </div>

            {masterUiPrefs.showRankingBoard && (
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
                            rankers.length > 0 ? rankers.filter(r => matchesSearch(r.display_name, miniSearchQuery)).map((r) => {
                              const regularIdx = typeof (r as any).regular_display_index === 'number' ? (r as any).regular_display_index : null;
                              const grandRank = getGrandRankInfo(regularIdx, (r as any).regular_tier_level); if (!grandRank) return null;
                              const challengeUi = getRegularChallengeUiState(r.display_name);
                              return (
                                <div ref={setRankCardRef('mini', 'free', r.display_name)} key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => { void handleProfileClick(r.display_name); }} className={`rank-card-stable w-full h-[148px] sm:h-[156px] p-3 sm:p-4 rounded-[1.3rem] sm:rounded-[1.45rem] cursor-pointer transition-all relative overflow-hidden ${rankCardFxByTier((r as any).regular_tier_level || 0)}`}>
                                  <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]">
                                    {regularIdx === null ? '-' : `${regularIdx + 1}위`}
                                  </span>
                                  <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                                    <div className="flex items-center justify-center min-w-[68px] h-[46px]">
                                      {grandRank.icon}
                                    </div>
                                  </div>
                                  {((r.regular_defense_stack || 0) > 0 || (r.regular_win_streak || 0) >= 3) && (
                                    <div className="absolute right-2 sm:right-3 top-2 sm:top-3 flex flex-col items-end gap-1.5 z-20">
                                      {(r.regular_defense_stack || 0) > 0 && (
                                        <span className="font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-red-500/18 text-red-200 border border-red-400/45 shadow-[0_0_10px_rgba(248,113,113,0.35)]">
                                          🛡 방어전 {r.regular_defense_stack}
                                        </span>
                                      )}
                                      {(r.regular_win_streak || 0) >= 3 && (
                                        <span className="font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/16 text-emerald-200 border border-emerald-400/45 shadow-[0_0_10px_rgba(52,211,153,0.35)]">
                                          🔥 {r.regular_win_streak}연승{getStreakBountyGC(r.regular_win_streak || 0) > 0 ? ` · ${getStreakBountyGC(r.regular_win_streak || 0)}GC` : ''}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between w-full px-1 gap-3 pt-9 sm:pt-10">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                                      <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${getCardAvatarBorderFxForUser(r.display_name)} shrink-0`} alt="p"/>
                                    <span className={`font-bold text-base sm:text-[1.2rem] leading-tight truncate ${getNameClassForUser(r.display_name)}`}>{r.display_name}</span>
                                    </div>
                                    <button
                                      onMouseEnter={() => playSFX('hover')}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!challengeUi.clickable) return;
                                        playSFX('click');
                                        setActiveMenu('home');
                                        handleTargetLock(r.display_name);
                                      }}
                                      title={challengeUi.hint ? `남은 시간: ${challengeUi.hint}` : undefined}
                                      disabled={!challengeUi.clickable}
                                      className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${challengeUi.className}`}
                                    >
                                      {challengeUi.hint ? `${challengeUi.label}` : challengeUi.label}
                                    </button>
                                  </div>
                                </div>
                              );
                            }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400 mt-10 text-lg">랭커가 없습니다</div>)
                          ) : (
                            rpRankers.length > 0 ? rpRankers.filter(r => matchesSearch(r.display_name, miniSearchQuery)).map((r, i) => {
                              const seasonIdx = typeof (r as any).season_display_index === 'number' ? (r as any).season_display_index : null;
                              const tier = getRPTierInfo(seasonIdx, (r as any).season_tier_level);
                              return (
                                <div ref={setRankCardRef('mini', 'random', r.display_name)} key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => handleProfileClick(r.display_name)} className={`rank-card-stable w-full h-[148px] sm:h-[156px] p-3 sm:p-4 rounded-[1.3rem] sm:rounded-[1.45rem] cursor-pointer transition-all relative overflow-hidden ${seasonCardFxByTier((r as any).season_tier_level || 0)}`}>
                                  <span className="absolute left-3 sm:left-4 top-3 text-[1.5rem] sm:text-[2rem] leading-none font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]">
                                    {seasonIdx === null ? '-' : `${seasonIdx + 1}위`}
                                  </span>
                                  <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                                    <div className="flex items-center justify-center min-w-[68px] h-[46px]">
                                      {tier.icon}
                                    </div>
                                  </div>
                                  {((r.season_defense_stack || 0) > 0 || (r.season_win_streak || 0) >= 3) && (
                                    <div className="absolute right-2 sm:right-3 top-2 sm:top-3 flex flex-col items-end gap-1.5 z-20">
                                      {(r.season_defense_stack || 0) > 0 && (
                                        <span className="font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-red-500/18 text-red-200 border border-red-400/45 shadow-[0_0_10px_rgba(248,113,113,0.35)]">
                                          🛡 방어전 {r.season_defense_stack}
                                        </span>
                                      )}
                                      {(r.season_win_streak || 0) >= 3 && (
                                        <span className="font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/16 text-emerald-200 border border-emerald-400/45 shadow-[0_0_10px_rgba(52,211,153,0.35)]">
                                          🔥 {r.season_win_streak}연승{getStreakBountyGC(r.season_win_streak || 0) > 0 ? ` · ${getStreakBountyGC(r.season_win_streak || 0)}GC` : ''}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between w-full px-1 gap-3 pt-9 sm:pt-10">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${getCardAvatarBorderFxForUser(r.display_name)} shrink-0`} alt="p"/>
                                    <span className={`font-bold text-base sm:text-[1.2rem] leading-tight truncate ${getNameClassForUser(r.display_name)}`}>{r.display_name}</span>
                                    </div>
                                    <span className="font-black text-fuchsia-400 text-[1.15rem] sm:text-[1.5rem] shrink-0">{r.season_sp ?? 0}</span>
                                  </div>
                                </div>
                              );
                            }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400 mt-10 text-lg">데이터가 없습니다.</div>)
                          )}
                      </div>

                      <div className="relative px-2 mt-4 shrink-0">
                        <Search className="absolute left-6 top-4 text-slate-500" size={20}/>
                        <input value={miniSearchQuery} onChange={(e) => setMiniSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRankSearchEnter('mini'); } }} placeholder="검색..." className="w-full bg-white/5 border border-white/10 pl-14 pr-8 py-4 rounded-full text-base font-bold outline-none focus:border-cyan-400 text-white select-text"/>
                      </div>
                  </div>
               </section>
            </div>
            )}
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
                      보유 GC: {profile?.gc ?? 1000}
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

              <section className="bg-black/45 backdrop-blur-2xl border border-fuchsia-400/30 rounded-[2rem] p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300">
                      이벤트 상품
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">
                      기간 한정 상품입니다. 구매 시 즉시 GC 차감됩니다.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {EVENT_SHOP_ITEMS.map((item) => (
                    <div key={item.id} className="rounded-[1.3rem] border border-fuchsia-400/30 bg-black/60 p-4 sm:p-5 shadow-[0_0_16px_rgba(232,121,249,0.18)]">
                      <img src={item.image} alt={item.name} className="w-full h-32 sm:h-36 object-cover rounded-2xl border border-white/10 mb-3" />
                      <h4 className="text-lg sm:text-xl font-black text-white">{item.name}</h4>
                      <p className="text-yellow-300 font-black text-base sm:text-lg mt-1">{item.cost.toLocaleString()} GC</p>
                      <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">보유 수량: {eventItemCounts[item.id] || 0}</p>
                      <button
                        onMouseEnter={() => playSFX('hover')}
                        onClick={() => handleBuyEventItem(item)}
                        className="mt-3 w-full rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200 font-black py-2.5 hover:bg-fuchsia-500 hover:text-white transition-all cursor-pointer"
                      >
                        구매하기
                      </button>
                    </div>
                  ))}
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
               
               <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                  <Trophy className="text-yellow-400 drop-shadow-[0_0_30px_gold]" size={52}/>
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tight sm:tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] text-center">
                    은하단 랭킹
                  </h2>
               </div>

               <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 mb-8 sm:mb-12 w-full max-w-3xl mx-auto">
                  <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMainRankTab('free'); }} className={`w-full sm:w-auto px-6 sm:px-12 lg:px-16 py-3.5 sm:py-4.5 lg:py-5 rounded-2xl sm:rounded-full font-black text-lg sm:text-xl lg:text-2xl transition-all border-2 sm:border-4 cursor-pointer ${mainRankTab === 'free' ? 'bg-pink-600/20 text-pink-400 border-pink-500 shadow-[0_0_30px_pink] scale-[1.01] sm:scale-105' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-pink-500/50'}`}>⚔️ 정규 랭킹</button>
                  <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMainRankTab('random'); }} className={`w-full sm:w-auto px-6 sm:px-12 lg:px-16 py-3.5 sm:py-4.5 lg:py-5 rounded-2xl sm:rounded-full font-black text-lg sm:text-xl lg:text-2xl transition-all border-2 sm:border-4 cursor-pointer ${mainRankTab === 'random' ? 'bg-cyan-600/20 text-cyan-400 border-cyan-400 shadow-[0_0_30px_cyan] scale-[1.01] sm:scale-105' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🎲 시즌 랭킹</button>
               </div>

               {mainRankTab === 'free' ? (
                 <>
                    <div className="flex justify-end mb-6 sm:mb-8 max-w-7xl mx-auto w-full px-0 sm:px-4">
                      <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 sm:left-6 top-3.5 sm:top-4.5 text-slate-500" size={20}/>
                        <input value={mainSearchQuery} onChange={(e) => setMainSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRankSearchEnter('main'); } }} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-12 sm:pl-16 pr-5 sm:pr-8 py-3.5 sm:py-5 rounded-2xl sm:rounded-full text-base sm:text-lg font-bold outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                      </div>
                    </div>

                   {(() => {
                     const regularFiltered = rankers.length > 0 ? rankers.filter((r) => matchesSearch(r.display_name, mainSearchQuery)) : [];
                      const renderRegularCard = (r: any) => {
		                        const regularIdx = typeof r.regular_display_index === 'number' ? r.regular_display_index : null;
                        const grandRank = getGrandRankInfo(regularIdx, (r as any).regular_tier_level);
                        if (!grandRank) return null;
		                        const move = getRankMoveValue(r.display_name, 'regular');
		                        const isTopRegular = regularIdx === 0;
                            const isRank1 = regularIdx === 0;
                            const isRank2_3 = regularIdx === 1 || regularIdx === 2;
                            const isRank4_6 = regularIdx !== null && regularIdx >= 3 && regularIdx <= 5;
		                        const throneDefenseStack = r.regular_defense_stack || 0;
		                        const throneBounty = getDefenseBonusGC(throneDefenseStack);

                            const cardClass = isRank1
                              ? 'w-full max-w-5xl p-5 sm:p-12 pt-14 sm:pt-16 pb-6 sm:pb-12 rounded-[1.6rem] sm:rounded-[3.5rem] shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_50px_rgba(239,68,68,0.7)] hover:scale-[1.01] sm:hover:scale-[1.03]'
                              : isRank4_6
                                ? 'p-4 sm:p-6 pt-7 sm:pt-10 pb-4 sm:pb-6 rounded-[1.2rem] sm:rounded-[1.5rem]'
                                : isRank2_3
                                  ? 'p-5 sm:p-8 pt-8 sm:pt-12 pb-5 sm:pb-8 rounded-[1.4rem] sm:rounded-[2rem]'
                                  : 'p-4 sm:p-5 pt-6 sm:pt-8 pb-4 sm:pb-5 rounded-xl';
                            const avatarClass = isRank1 ? 'w-20 h-20 sm:w-32 sm:h-32' : isRank4_6 ? 'w-14 h-14 sm:w-16 sm:h-16' : isRank2_3 ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14';
                            const nameClass = isRank1 ? 'text-3xl sm:text-5xl' : isRank4_6 ? 'text-lg sm:text-xl' : isRank2_3 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg';
                            const badgeClass = isRank1 ? 'px-8 sm:px-14 py-2.5 sm:py-5 text-[20px] sm:text-[34px] -top-6 sm:-top-12' : isRank4_6 ? 'px-6 sm:px-10 py-2 sm:py-3 text-[14px] sm:text-[20px] -top-5 sm:-top-7' : isRank2_3 ? 'px-7 sm:px-12 py-2.5 sm:py-4 text-[16px] sm:text-[24px] -top-6 sm:-top-9' : 'px-5 sm:px-8 py-1.5 sm:py-2.5 text-[13px] sm:text-[18px] -top-4 sm:-top-6';
 		                        const rankTextClass = isRank1 ? 'text-[2.4rem] sm:text-[4.8rem]' : isRank2_3 ? 'text-[2.1rem] sm:text-[3.4rem]' : 'text-[1.8rem] sm:text-[2.9rem]';

	                       return (
                         <div
                           ref={setRankCardRef('main', 'free', r.display_name)}
                           key={r.id}
                           onMouseEnter={() => playSFX('hover')}
                          onClick={() => { void handleProfileClick(r.display_name); }}
                           className={`${cardClass} transition-all cursor-pointer group relative flex flex-col justify-center items-center ${rankCardFxByTier((r as any).regular_tier_level || 0)} hover:brightness-110 mt-10`}
                         >
	                            <div className="absolute w-full flex justify-center z-20 pointer-events-none" style={{ top: 0 }}>
	                              <div className={`${badgeClass} absolute flex items-center justify-center`}>
	                                <span className="inline-flex scale-[1.45] sm:scale-[1.65]">{grandRank.icon}</span>
	                              </div>
	                            </div>
	                            <div className="absolute left-4 sm:left-5 top-3 sm:top-4 flex items-center gap-2 z-20">
	                              <span className={`${rankTextClass} leading-[0.9] tracking-tight font-black text-cyan-200 drop-shadow-[0_0_14px_rgba(34,211,238,0.5)]`}>
	                                {regularIdx === null ? '-' : `${regularIdx + 1}위`}
	                              </span>
	                             {move > 0 && (
                               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm sm:text-base font-black text-emerald-200 bg-emerald-500/18 border border-emerald-400/45 shadow-[0_0_10px_rgba(16,185,129,0.35)]">
                                 ▲ {move}
                               </span>
                             )}
                             {move < 0 && (
                               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm sm:text-base font-black text-rose-200 bg-rose-500/18 border border-rose-400/45 shadow-[0_0_10px_rgba(244,63,94,0.35)]">
                                 ▼ {Math.abs(move)}
                               </span>
                             )}
                           </div>

                            {isTopRegular && (throneDefenseStack > 0 || throneBounty > 0) && (
                              <div className="hidden sm:flex absolute right-3 sm:right-4 top-1 sm:top-2 flex-col items-end gap-2 z-20">
                                <span className="font-black text-base sm:text-lg px-4 py-2 rounded-full bg-red-500/20 text-red-100 border border-red-400/55 shadow-[0_0_14px_rgba(248,113,113,0.38)]">
                                  👑 왕좌 방어전 {throneDefenseStack}스택
                                </span>
                                <span className="font-black text-base sm:text-lg px-4 py-2 rounded-full bg-amber-400/18 text-amber-100 border border-amber-300/55 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
                                  💰 현상금 {throneBounty}GC
                                </span>
                              </div>
                            )}
                            {isTopRegular && (throneDefenseStack > 0 || throneBounty > 0) && (
                              <div className="sm:hidden w-full flex flex-col items-end gap-1.5 mt-2 mb-1 pr-1 relative z-20">
                                <span className="font-black text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-100 border border-red-400/55 shadow-[0_0_12px_rgba(248,113,113,0.32)]">
                                  👑 왕좌 방어전 {throneDefenseStack}스택
                                </span>
                                <span className="font-black text-xs px-3 py-1.5 rounded-full bg-amber-400/18 text-amber-100 border border-amber-300/55 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                                  💰 현상금 {throneBounty}GC
                                </span>
                              </div>
                            )}

	                           <div className="flex items-center justify-between w-full mt-8 px-2 relative z-10 gap-4">
	                             <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
	                               <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${getCardAvatarBorderFxForUser(r.display_name)} shrink-0`} alt="p"/>
                        <span className={`group-hover:text-cyan-400 font-bold text-white truncate leading-tight ${nameClass}`}>{r.display_name}</span>
	                             </div>
                               <div className="flex flex-col items-end shrink-0 ml-2">
                                 <span className={`font-black text-yellow-300 tracking-tight ${isRank1 ? 'text-4xl sm:text-6xl' : isRank2_3 ? 'text-3xl sm:text-4xl' : isRank4_6 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>{Math.max(0, Number(r.regular_rp ?? 0))}</span>
                                 <span className="text-[10px] font-black text-slate-400 tracking-wider">RP (정규)</span>
                               </div>
	                            </div>
	                          </div>
	                        );
	                      };

                     if (regularFiltered.length === 0) {
                       return <div className="col-span-12 flex items-center justify-center h-[300px] opacity-50 text-2xl font-bold text-cyan-400 tracking-widest">해당하는 랭커가 없습니다.</div>;
                     }

                     return (
                        <div className="grid grid-cols-12 gap-4 sm:gap-10 pb-20 justify-center px-0 sm:px-4 grid-glow-fix">
                         {regularFiltered.map((r: any) => {
                           const regularIdx = typeof r.regular_display_index === 'number' ? r.regular_display_index : null;
                           const isRank1 = regularIdx === 0;
                           const isRank2_3 = regularIdx === 1 || regularIdx === 2;
                           const isRank4_6 = regularIdx !== null && regularIdx >= 3 && regularIdx <= 5;

                            let spanClass = 'col-span-12 sm:col-span-6';

                           if (isRank1) {
                             spanClass = 'col-span-12 flex justify-center';
                           } else if (isRank2_3) {
                              spanClass = 'col-span-12 sm:col-span-6';
                           } else if (isRank4_6) {
                              spanClass = 'col-span-12 sm:col-span-6 lg:col-span-4';
                           } else {
                              spanClass = 'col-span-12 sm:col-span-6 xl:col-span-3';
                           }

                           return (
                             <div key={r.id} className={spanClass}>
                               {renderRegularCard(r)}
                             </div>
                           );
                         })}
                       </div>
                     );
                   })()}
                 </>
               ) : (
                 <>
                    <div className="flex justify-end mb-6 sm:mb-8 max-w-7xl mx-auto w-full px-0 sm:px-4 mt-6 sm:mt-8">
                      <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 sm:left-6 top-3.5 sm:top-4.5 text-slate-500" size={20}/>
                        <input value={mainSearchQuery} onChange={(e) => setMainSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRankSearchEnter('main'); } }} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-12 sm:pl-16 pr-5 sm:pr-8 py-3.5 sm:py-5 rounded-2xl sm:rounded-full text-base sm:text-lg font-bold outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-4 sm:gap-10 pb-20 justify-center px-0 sm:px-4 grid-glow-fix">
                      {rpRankers.length > 0 ? rpRankers.filter(r => matchesSearch(r.display_name, mainSearchQuery)).map((r, i) => {
                           const seasonIdx = typeof (r as any).season_display_index === 'number' ? (r as any).season_display_index : null;
                           const tier = getRPTierInfo(seasonIdx, (r as any).season_tier_level);
                           const move = getRankMoveValue(r.display_name, 'season');
                           const isTopSeason = seasonIdx === 0;
                           const throneDefenseStack = r.season_defense_stack || 0;
                           const throneBounty = getDefenseBonusGC(throneDefenseStack);
                           const isRank1 = seasonIdx === 0;
                           const isRank2_3 = seasonIdx === 1 || seasonIdx === 2;
                           const isRank4_6 = seasonIdx !== null && seasonIdx >= 3 && seasonIdx <= 5;
                           
                            let spanClass = "col-span-12 sm:col-span-6";
                            let cardClass = "p-5 sm:p-8 pt-8 sm:pt-12 pb-5 sm:pb-8 rounded-[1.4rem] sm:rounded-[2rem]";
                            let badgeClass = "px-7 sm:px-12 py-2.5 sm:py-4 text-[16px] sm:text-[24px] -top-6 sm:-top-9";
                            let avatarClass = "w-16 h-16 sm:w-20 sm:h-20";
                            let nameSize = i === 0 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl';
                            let statSize = "text-2xl sm:text-3xl";

                            if (isRank1) { spanClass = "col-span-12 flex justify-center"; cardClass = "w-full max-w-5xl p-5 sm:p-12 pt-14 sm:pt-16 pb-6 sm:pb-12 rounded-[1.6rem] sm:rounded-[3.5rem] shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_50px_rgba(239,68,68,0.7)] hover:scale-[1.01] sm:hover:scale-[1.03]"; badgeClass = "px-8 sm:px-14 py-2.5 sm:py-5 text-[20px] sm:text-[34px] -top-6 sm:-top-12"; avatarClass = "w-20 h-20 sm:w-32 sm:h-32"; statSize = "text-4xl sm:text-5xl"; nameSize = 'text-3xl sm:text-5xl'; }
                            else if (isRank2_3) { spanClass = "col-span-12 sm:col-span-6"; }
                            else if (isRank4_6) { spanClass = "col-span-12 sm:col-span-6 lg:col-span-4"; cardClass = "p-4 sm:p-6 pt-7 sm:pt-10 pb-4 sm:pb-6 rounded-[1.2rem] sm:rounded-[1.5rem]"; badgeClass = "px-6 sm:px-10 py-2 sm:py-3 text-[14px] sm:text-[20px] -top-5 sm:-top-7"; avatarClass = "w-14 h-14 sm:w-16 sm:h-16"; statSize = "text-xl sm:text-2xl"; nameSize = 'text-lg sm:text-xl'; }
                            else { spanClass = "col-span-12 sm:col-span-6 xl:col-span-3"; cardClass = "p-4 sm:p-5 pt-6 sm:pt-8 pb-4 sm:pb-5 rounded-xl"; badgeClass = "px-5 sm:px-8 py-1.5 sm:py-2.5 text-[13px] sm:text-[18px] -top-4 sm:-top-6"; avatarClass = "w-12 h-12 sm:w-14 sm:h-14"; statSize = "text-lg sm:text-xl"; nameSize = 'text-base sm:text-lg'; }
                            const rankTextClass = isRank1 ? 'text-[2.4rem] sm:text-[4.8rem]' : isRank2_3 ? 'text-[2.1rem] sm:text-[3.4rem]' : 'text-[1.8rem] sm:text-[2.9rem]';

                           return (
                             <div key={r.id} className={spanClass}>
                                <div ref={setRankCardRef('main', 'random', r.display_name)} onMouseEnter={() => playSFX('hover')} onClick={() => { void handleProfileClick(r.display_name); }} className={`${cardClass} transition-all cursor-pointer group relative flex flex-col justify-center items-center ${seasonCardFxByTier((r as any).season_tier_level || 0)} hover:brightness-110 mt-10`}>
                                   {seasonIdx === 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}
                                   
                                    <span className={`absolute left-4 sm:left-5 top-3 sm:top-4 ${rankTextClass} leading-[0.9] tracking-tight font-black text-cyan-200 drop-shadow-[0_0_14px_rgba(34,211,238,0.5)] z-20`}>
                                      {seasonIdx === null ? '-' : `${seasonIdx + 1}위`}
                                    </span>
                                    {move > 0 && (
                                      <span className="absolute left-20 sm:left-24 top-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm sm:text-base font-black text-emerald-200 bg-emerald-500/18 border border-emerald-400/45 shadow-[0_0_10px_rgba(16,185,129,0.35)] z-20">
                                        ▲ {move}
                                      </span>
                                    )}
                                    {move < 0 && (
                                      <span className="absolute left-20 sm:left-24 top-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm sm:text-base font-black text-rose-200 bg-rose-500/18 border border-rose-400/45 shadow-[0_0_10px_rgba(244,63,94,0.35)] z-20">
                                        ▼ {Math.abs(move)}
                                      </span>
                                    )}
                                    <div className="absolute w-full flex justify-center z-20 pointer-events-none" style={{top: 0}}>
                                       <div className={`${badgeClass} absolute flex items-center justify-center`}>
                                         <span className="inline-flex scale-[1.45] sm:scale-[1.65]">{tier.icon}</span>
                                       </div>
                                    </div>
                                    {isTopSeason && (throneDefenseStack > 0 || throneBounty > 0) && (
                                      <div className="hidden sm:flex absolute right-3 sm:right-4 top-1 sm:top-2 flex-col items-end gap-2 z-20">
                                        <span className="font-black text-base sm:text-lg px-4 py-2 rounded-full bg-red-500/20 text-red-100 border border-red-400/55 shadow-[0_0_14px_rgba(248,113,113,0.38)]">
                                          👑 왕좌 방어전 {throneDefenseStack}스택
                                        </span>
                                        <span className="font-black text-base sm:text-lg px-4 py-2 rounded-full bg-amber-400/18 text-amber-100 border border-amber-300/55 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
                                          💰 현상금 {throneBounty}GC
                                        </span>
                                      </div>
                                    )}
                                    {isTopSeason && (throneDefenseStack > 0 || throneBounty > 0) && (
                                      <div className="sm:hidden w-full flex flex-col items-end gap-1.5 mt-2 mb-1 pr-1 relative z-20">
                                        <span className="font-black text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-100 border border-red-400/55 shadow-[0_0_12px_rgba(248,113,113,0.32)]">
                                          👑 왕좌 방어전 {throneDefenseStack}스택
                                        </span>
                                        <span className="font-black text-xs px-3 py-1.5 rounded-full bg-amber-400/18 text-amber-100 border border-amber-300/55 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                                          💰 현상금 {throneBounty}GC
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between w-full mt-8 px-2 relative z-10 gap-4">
                                      <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
                                        <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${getCardAvatarBorderFxForUser(r.display_name)} shrink-0`} alt="p"/>
                        <span className={`group-hover:text-cyan-400 font-bold text-white truncate leading-tight ${nameSize}`}>{r.display_name}</span>
                                      </div>
                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                       <span className={`font-black text-fuchsia-400 tracking-tight ${statSize}`}>{r.season_sp ?? 0}</span>
                                       <span className="text-[10px] font-black text-slate-400 tracking-wider">SP (시즌)</span>
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
          <main
            className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                playSFX('click');
                setActiveMenu('home');
              }
            }}
          >
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
                <div onMouseEnter={() => playSFX('hover')} className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-6 sm:p-8 lg:p-10 cursor-default space-y-6">
                  <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                    <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className={`w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full border-4 shrink-0 ${equippedBorderFxClass}`} alt="profile"/>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`italic uppercase mb-2 font-black text-3xl sm:text-4xl lg:text-5xl whitespace-normal break-all leading-tight ${equippedNameClass}`}>{currentUserName || "GUEST PILOT"}</h3>
                        <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${currentUserRegularInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                            {currentUserRegularInfo?.icon || <Shield size={14} className="text-slate-300" />}
                            {currentUserRegularIndex !== null ? `${currentUserRegularInfo?.title || '루키'} ${currentUserRegularIndex + 1}위` : '루키 -위'}
                          </span>
                          <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${currentUserSeasonInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                            <span>{currentUserSeasonInfo?.icon || '🪐'}</span>
                            {currentUserSeasonInfo
                              ? `${currentUserSeasonInfo.name} ${typeof currentUserSeasonInfo.index === 'number' ? `${currentUserSeasonInfo.index + 1}위` : '-위'}`
                              : '보이드 -위'}
                          </span>
                        </div>
                      </div>
                      <div className="mb-5 rounded-2xl border border-cyan-400/35 bg-black/35 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onMouseEnter={() => playSFX('hover')}
                              onClick={() => setIngamePlatformDraft('steam')}
                              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black border transition-all cursor-pointer ${ingamePlatformDraft === 'steam' ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200' : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'}`}
                            >
                              {ingamePlatformDraft === 'steam' ? '✓ ' : ''}STEAM CODE
                            </button>
                            <button
                              onMouseEnter={() => playSFX('hover')}
                              onClick={() => setIngamePlatformDraft('ea')}
                              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black border transition-all cursor-pointer ${ingamePlatformDraft === 'ea' ? 'bg-fuchsia-500/20 border-fuchsia-400/60 text-fuchsia-200' : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'}`}
                            >
                              {ingamePlatformDraft === 'ea' ? '✓ ' : ''}EA
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={ingameNicknameDraft}
                            onChange={(e) => setIngameNicknameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
                                e.preventDefault();
                                void persistIngameProfile(ingameNicknameDraft, ingamePlatformDraft);
                              }
                            }}
                            placeholder="인게임 닉네임을 입력하세요"
                            className="flex-1 rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-white font-bold text-sm sm:text-base outline-none focus:border-cyan-400/70"
                          />
                          <div className="flex gap-2">
                            <button
                              onMouseEnter={() => playSFX('hover')}
                              onClick={() => void persistIngameProfile(ingameNicknameDraft, ingamePlatformDraft)}
                              disabled={savingIngameProfile || !ingameNicknameDraft.trim()}
                              className={`px-4 py-2.5 rounded-xl border font-black text-sm sm:text-base transition-all ${savingIngameProfile || !ingameNicknameDraft.trim() ? 'border-slate-700 text-slate-500 bg-slate-800/50 cursor-not-allowed' : 'border-emerald-400/55 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 cursor-pointer'}`}
                            >
                              {savingIngameProfile ? '저장중...' : '저장'}
                            </button>
                          </div>
                        </div>
                        {currentUserIngameNickname && (
                          <p className="mt-2 text-xs sm:text-sm text-slate-300 font-bold">
                            현재 연결: <span className="text-cyan-300">{getPlatformLabel(currentUserIngamePlatform)}</span> ·{' '}
                            <button
                              onMouseEnter={() => playSFX('hover')}
                              onClick={() => {
                                playSFX('click');
                                navigator.clipboard.writeText(currentUserIngameNickname);
                                showStatusPopup('success', '복사 완료', '복사가 완료되었습니다.', { autoCloseMs: 1000, hideConfirm: true });
                              }}
                              className="text-white hover:text-cyan-200 transition-colors cursor-pointer"
                            >
                              {currentUserIngameNickname}
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="sm:hidden flex flex-col gap-2 mb-5">
                        <span className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full border border-white/20 ${currentUserRegularInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                          {currentUserRegularInfo?.icon || <Shield size={14} className="text-slate-300" />}
                          {currentUserRegularIndex !== null ? `${currentUserRegularInfo?.title || '루키'} ${currentUserRegularIndex + 1}위` : '루키 -위'}
                        </span>
                        <span className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full border border-white/20 ${currentUserSeasonInfo?.color || 'text-slate-300'} bg-white/10 w-fit`}>
                          <span>{currentUserSeasonInfo?.icon || '🪐'}</span>
                          {currentUserSeasonInfo
                            ? `${currentUserSeasonInfo.name} ${typeof currentUserSeasonInfo.index === 'number' ? `${currentUserSeasonInfo.index + 1}위` : '-위'}`
                            : '보이드 -위'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">전체 경기</p><p className="text-2xl font-black text-white">{myStats.matches.length}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">승/패</p><p className="text-2xl font-black text-white">{myStats.wins} / {myStats.losses}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">승률</p><p className="text-2xl font-black text-fuchsia-400">{myStats.winRate}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">최고 연승</p><p className="text-2xl font-black text-amber-300">{myStats.longestStreak}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">정규 경기</p><p className="text-2xl font-black text-cyan-300">{myStats.freeMatches}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">시즌 경기</p><p className="text-2xl font-black text-violet-300">{myStats.randomMatches}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">GC (상점)</p><p className="text-2xl font-black text-emerald-400">{profile?.gc ?? 1000}</p></div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center shadow-inner"><p className="text-slate-300 text-sm sm:text-base lg:text-[17px] tracking-wide font-black mb-2">방어전 트래커</p><p className="text-xl font-black text-fuchsia-400">정규 {currentUserRegularDefenseStack} / 시즌 {currentUserSeasonDefenseStack}</p></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4">
                      <h4 className="text-cyan-300 font-black text-base mb-3 tracking-widest border-b border-white/10 pb-2">레전드 승률 TOP 8</h4>
                      <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                        {myStats.legendStats.slice(0, 8).map((l: any) => (
                          <div key={l.name} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-2 gap-3">
                            <span className="text-white font-bold text-sm whitespace-normal break-all">{l.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-slate-400 text-xs">{l.wins}승 {l.matches - l.wins}패</span>
                              <span className="text-cyan-300 font-black text-base">{(l.wr * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                        {myStats.legendStats.length === 0 && <p className="text-slate-500 text-sm text-center py-8">데이터가 없습니다.</p>}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4">
                      <h4 className="text-pink-300 font-black text-base mb-3 tracking-widest border-b border-white/10 pb-2">무기 승률 TOP 10</h4>
                      <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                        {myStats.weaponStats.slice(0, 10).map((w: any) => (
                          <div key={w.name} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-2 gap-3">
                            <span className="text-white font-bold text-sm whitespace-normal break-all">{w.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-slate-400 text-xs">{w.wins}승 {w.matches - w.wins}패</span>
                              <span className="text-pink-300 font-black text-base">{(w.wr * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                        {myStats.weaponStats.length === 0 && <p className="text-slate-500 text-sm text-center py-8">데이터가 없습니다.</p>}
                      </div>
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

        {activeMenu === 'master' && isMasterAccount && (
          <main className="flex-1 p-3 sm:p-4 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2
              onMouseEnter={() => playSFX('hover')}
              className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-400 mb-6 sm:mb-8 tracking-tight drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]"
            >
              마스터 콘솔 (Master)
            </h2>
            <section className="bg-black/55 border-2 border-cyan-400/70 rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <p className="text-cyan-200 font-black text-sm sm:text-base">
                마스터 계정: <span className="text-white">{currentUserEmail || '-'}</span>
              </p>
              <p className="mt-1 text-xs sm:text-sm font-black text-slate-300">
                권한 소스: <span className={hasDbMasterGrant ? 'text-emerald-300' : 'text-amber-300'}>{hasDbMasterGrant ? 'DB profiles.is_master' : '이메일 fallback'}</span>
              </p>
              <p className="mt-2 text-slate-300 font-bold text-xs sm:text-sm">
                이 메뉴는 마스터 계정에서만 보입니다. 운영 중 즉시 동기화/점검 도구를 사용할 수 있습니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-5 sm:mt-6">
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={async () => {
                    playSFX('click');
                    await fetchData();
                    await fetchRankers();
                    if (user?.id) await fetchProfile(user.id);
                    showStatusPopup('success', '동기화 완료', '데이터를 최신 상태로 강제 동기화했습니다.', { autoCloseMs: 1200, hideConfirm: true });
                  }}
                  className="rounded-xl border border-emerald-400/55 bg-emerald-500/15 text-emerald-200 font-black px-4 py-3 hover:bg-emerald-500/25 transition-all cursor-pointer"
                >
                  실시간 데이터 강제 동기화
                </button>
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => {
                    playSFX('click');
                    if (currentUserName) checkActiveChallenge(currentUserName);
                    showStatusPopup('info', '점검 완료', '현재 계정 기준 대전 상태를 재점검했습니다.', { autoCloseMs: 1200, hideConfirm: true });
                  }}
                  className="rounded-xl border border-cyan-400/55 bg-cyan-500/15 text-cyan-200 font-black px-4 py-3 hover:bg-cyan-500/25 transition-all cursor-pointer"
                >
                  현재 대전 상태 재점검
                </button>
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => {
                    playSFX('click');
                    if (lastOpponentStorageKey) localStorage.removeItem(lastOpponentStorageKey);
                    localStorage.removeItem('gt_scroll_target_v2');
                    setEntryOpponent('');
                    setMainSearchQuery('');
                    setMiniSearchQuery('');
                    showStatusPopup('success', '정리 완료', '마스터 로컬 캐시를 정리했습니다.', { autoCloseMs: 1200, hideConfirm: true });
                  }}
                  className="rounded-xl border border-pink-400/55 bg-pink-500/15 text-pink-200 font-black px-4 py-3 hover:bg-pink-500/25 transition-all cursor-pointer"
                >
                  로컬 캐시 정리
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => {
                    playSFX('click');
                    setMasterUiEditorOpen((prev) => !prev);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${masterUiEditorOpen ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]' : 'border-slate-500/60 bg-slate-700/30 text-slate-200'}`}
                >
                  <Palette size={16} />
                  UI 편집 {masterUiEditorOpen ? '닫기' : '열기'}
                </button>
              </div>
              {masterUiEditorOpen && (
                <div className="mt-3 rounded-2xl border border-cyan-400/35 bg-black/45 p-4 sm:p-5">
                  <h3 className="text-cyan-200 font-black text-base sm:text-lg mb-3">실시간 UI 편집 (마스터)</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-bold mb-4">
                    이동·변경·삭제·추가 기능을 여기서 즉시 적용할 수 있습니다. 설정은 현재 브라우저에 저장됩니다.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      헤더 타이틀
                      <input
                        value={masterUiPrefs.headerTitle}
                        onChange={(e) => updateMasterUiPrefs('headerTitle', e.target.value)}
                        className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      시즌 문구
                      <input
                        value={masterUiPrefs.seasonTitle}
                        onChange={(e) => updateMasterUiPrefs('seasonTitle', e.target.value)}
                        className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      타이틀 폰트 크기 {masterUiPrefs.titleScalePercent}%
                      <input
                        type="range"
                        min={70}
                        max={140}
                        step={1}
                        value={masterUiPrefs.titleScalePercent}
                        onChange={(e) => updateMasterUiPrefs('titleScalePercent', Math.max(70, Math.min(140, Number(e.target.value) || 100)))}
                        className="w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      홈 보드 간격 {masterUiPrefs.homeGapPx}px
                      <input
                        type="range"
                        min={8}
                        max={48}
                        step={1}
                        value={masterUiPrefs.homeGapPx}
                        onChange={(e) => updateMasterUiPrefs('homeGapPx', Math.max(8, Math.min(48, Number(e.target.value) || 24)))}
                        className="w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      디스코드 버튼 세로 {masterUiPrefs.discordButtonTopPx}px
                      <input
                        type="range"
                        min={-18}
                        max={28}
                        step={1}
                        value={masterUiPrefs.discordButtonTopPx}
                        onChange={(e) => updateMasterUiPrefs('discordButtonTopPx', Math.max(-18, Math.min(28, Number(e.target.value) || 0)))}
                        className="w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300">
                      디스코드 버튼 가로 {masterUiPrefs.discordButtonLeftPx}px
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={1}
                        value={masterUiPrefs.discordButtonLeftPx}
                        onChange={(e) => updateMasterUiPrefs('discordButtonLeftPx', Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
                        className="w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold text-slate-300 lg:col-span-2">
                      홈 보드 세로 위치 (오프셋) {masterUiPrefs.homeTopOffsetPx}px
                      <input
                        type="range"
                        min={-80}
                        max={120}
                        step={1}
                        value={masterUiPrefs.homeTopOffsetPx}
                        onChange={(e) => updateMasterUiPrefs('homeTopOffsetPx', Math.max(-80, Math.min(120, Number(e.target.value) || 0)))}
                        className="w-full"
                      />
                    </label>
                  </div>
                  <div className="mt-4 rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-3 sm:p-4">
                    <h4 className="text-indigo-200 font-black text-sm sm:text-base mb-2">디스코드 버튼 URL 수정</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 font-bold mb-3">
                      URL 입력 후 저장을 누르면 즉시 반영됩니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={masterDiscordUrlDraft}
                        onChange={(e) => setMasterDiscordUrlDraft(e.target.value)}
                        placeholder="https://discord.com/channels/..."
                        className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      />
                      <button
                        onClick={handleSaveMasterDiscordUrl}
                        className="rounded-lg border border-indigo-400/55 bg-indigo-500/20 px-4 py-2 text-xs sm:text-sm font-black text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer"
                      >
                        URL 저장
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
                    <button
                      onClick={() => updateMasterUiPrefs('showDiscordEntry', !masterUiPrefs.showDiscordEntry)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showDiscordEntry ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      디스코드 버튼 {masterUiPrefs.showDiscordEntry ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => updateMasterUiPrefs('showSeasonTitle', !masterUiPrefs.showSeasonTitle)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showSeasonTitle ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      시즌 문구 {masterUiPrefs.showSeasonTitle ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => updateMasterUiPrefs('showOnlineBoard', !masterUiPrefs.showOnlineBoard)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showOnlineBoard ? 'border-cyan-400/55 bg-cyan-500/15 text-cyan-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      접속현황 {masterUiPrefs.showOnlineBoard ? '표시' : '숨김'}
                    </button>
                    <button
                      onClick={() => updateMasterUiPrefs('showMatchBoard', !masterUiPrefs.showMatchBoard)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showMatchBoard ? 'border-cyan-400/55 bg-cyan-500/15 text-cyan-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      대전신청 {masterUiPrefs.showMatchBoard ? '표시' : '숨김'}
                    </button>
                    <button
                      onClick={() => updateMasterUiPrefs('showRecentBoard', !masterUiPrefs.showRecentBoard)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showRecentBoard ? 'border-cyan-400/55 bg-cyan-500/15 text-cyan-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      최근기록 {masterUiPrefs.showRecentBoard ? '표시' : '숨김'}
                    </button>
                    <button
                      onClick={() => updateMasterUiPrefs('showRankingBoard', !masterUiPrefs.showRankingBoard)}
                      className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${masterUiPrefs.showRankingBoard ? 'border-cyan-400/55 bg-cyan-500/15 text-cyan-200' : 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
                    >
                      랭킹보드 {masterUiPrefs.showRankingBoard ? '표시' : '숨김'}
                    </button>
                  </div>
                  <div className="mt-4 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-3 sm:p-4">
                    <h4 className="text-fuchsia-200 font-black text-sm sm:text-base mb-2">헤더 배지 편집 (추가/이동/삭제)</h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={masterNewBadgeText}
                        onChange={(e) => setMasterNewBadgeText(e.target.value)}
                        placeholder="예: 베타 테스트 진행 중"
                        className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400"
                      />
                      <button
                        onClick={addMasterHeaderBadge}
                        className="rounded-lg border border-fuchsia-400/45 bg-fuchsia-500/20 px-3 py-2 text-xs sm:text-sm font-black text-fuchsia-200 hover:bg-fuchsia-500/30 transition-all cursor-pointer"
                      >
                        배지 추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {masterUiPrefs.headerBadges.length === 0 && (
                        <p className="text-xs sm:text-sm text-slate-400 font-bold">추가된 배지가 없습니다.</p>
                      )}
                      {masterUiPrefs.headerBadges.map((badge, index) => (
                        <div key={`master-badge-${index}`} className="flex flex-wrap items-center gap-2">
                          <input
                            value={badge}
                            onChange={(e) => updateMasterHeaderBadge(index, e.target.value)}
                            className="flex-1 min-w-[180px] rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400"
                          />
                          <button
                            onClick={() => moveMasterHeaderBadge(index, -1)}
                            disabled={index === 0}
                            className="rounded-lg border border-slate-500/70 px-2.5 py-1.5 text-xs font-black text-slate-200 disabled:opacity-35 cursor-pointer"
                          >
                            위로
                          </button>
                          <button
                            onClick={() => moveMasterHeaderBadge(index, 1)}
                            disabled={index === masterUiPrefs.headerBadges.length - 1}
                            className="rounded-lg border border-slate-500/70 px-2.5 py-1.5 text-xs font-black text-slate-200 disabled:opacity-35 cursor-pointer"
                          >
                            아래로
                          </button>
                          <button
                            onClick={() => removeMasterHeaderBadge(index)}
                            className="rounded-lg border border-rose-400/55 bg-rose-500/15 px-2.5 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-500/25 transition-all cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setMasterUiPrefs(DEFAULT_MASTER_UI_PREFS);
                        showStatusPopup('info', '초기화 완료', 'UI 편집 설정을 기본값으로 되돌렸습니다.', { autoCloseMs: 1200, hideConfirm: true });
                      }}
                      className="rounded-lg border border-amber-400/55 bg-amber-500/15 text-amber-200 text-sm font-black px-4 py-2 hover:bg-amber-500/25 transition-all cursor-pointer"
                    >
                      UI 설정 초기화
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/45 p-4 sm:p-5">
                <h3 className="text-white font-black text-base sm:text-lg mb-2">마스터 계정 안내</h3>
                <ul className="text-slate-300 text-sm sm:text-base font-bold leading-7 list-disc pl-5 space-y-1">
                  <li>이 계정은 마스터 메뉴 접근 권한이 활성화됩니다.</li>
                  <li>UI 편집 섹션에서 텍스트/폰트/보드 표시 상태를 즉시 수정할 수 있습니다.</li>
                  <li>운영 중 이상 징후가 있으면 먼저 동기화 버튼으로 상태를 맞춘 뒤 점검하세요.</li>
                </ul>
              </div>
            </section>
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
                  <h3 className={`italic uppercase font-black text-4xl text-white whitespace-normal break-all leading-tight mb-2`}>{currentUserName || "GUEST PILOT"}</h3>
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
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-start sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300 overflow-y-auto cursor-pointer" onClick={() => { setSelectedPlayer(null); playSFX('click'); }}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-3xl rounded-[2rem] sm:rounded-[3rem] lg:rounded-[4rem] p-4 sm:p-8 lg:p-12 shadow-2xl relative overflow-y-auto custom-scrollbar max-h-[92vh] sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => { setSelectedPlayer(null); playSFX('click'); }} className="absolute top-4 sm:top-8 lg:top-10 right-4 sm:right-8 lg:right-10 text-slate-500 hover:text-white cursor-pointer">
               <X size={32}/>
             </button>
              
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 lg:gap-10 mb-5 sm:mb-8 mt-2">
                <img src={selectedPlayer.avatar_url} className={`w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3rem] border-4 ${getCardAvatarBorderFxForUser(selectedPlayer.display_name)} shrink-0`} alt="p" />
                 <div className="flex-1 min-w-0 flex flex-col justify-center w-full">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-3 sm:gap-4 min-w-0 w-full items-start">
                      <div className="min-w-0 overflow-hidden" ref={selectedProfileNameWrapRef}>
                        <h2
                          ref={selectedProfileNameTextRef}
                          onMouseEnter={() => playSFX('hover')}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSFX('click');
                            if (!selectedPlayerDiscordId) {
                              showStatusPopup('error', '복사 실패', '복사 가능한 디스코드 아이디가 없습니다.');
                              return;
                            }
                            navigator.clipboard.writeText(selectedPlayerDiscordId);
                            showStatusPopup('success', '복사 완료', '복사가 완료되었습니다.', { autoCloseMs: 1000, hideConfirm: true });
                          }}
                          title={selectedPlayerDiscordId ? '클릭해서 디스코드 아이디 복사' : '복사 가능한 아이디 없음'}
                          style={selectedProfileNameStyle}
                          className={`italic font-black cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap inline-block align-middle ${getNameClassForUser(selectedPlayer.display_name)}`}
                        >
                          {selectedPlayer.display_name}
                        </h2>
                        <p className="mt-1.5 text-slate-400 text-[11px] sm:text-xs font-black tracking-wider">{selectedPlayerIngameLabel}</p>
                        <button
                          onMouseEnter={() => playSFX('hover')}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSFX('click');
                            if (!selectedPlayerIngameValue) {
                              showStatusPopup('error', '복사 실패', '인게임 스팀 친구코드/EA 닉네임이 설정되지 않았습니다.');
                              return;
                            }
                            navigator.clipboard.writeText(selectedPlayerIngameValue);
                            showStatusPopup('success', '복사 완료', '복사가 완료되었습니다.', { autoCloseMs: 1000, hideConfirm: true });
                          }}
                          className="mt-1 text-cyan-300 text-sm sm:text-base font-bold whitespace-normal break-all text-left hover:text-cyan-200 transition-colors cursor-pointer"
                        >
                          {selectedPlayerIngameValue || '미설정'}
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 items-start md:items-end shrink-0 w-full md:w-[340px]">
                        <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${selectedPlayerRegularInfo?.color || 'text-slate-300'} bg-white/10 w-fit whitespace-nowrap`}>
                          {selectedPlayerRegularInfo?.icon}
                          {selectedPlayerRegularInfo
                            ? `${selectedPlayerRegularInfo.title} ${selectedPlayerRegularInfo.num ? `${selectedPlayerRegularInfo.num}위` : '-위'} · ${selectedRegularRp} RP (정규)`
                            : `루키 -위 · ${selectedRegularRp} RP (정규)`}
                        </span>
                        <span className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 ${selectedPlayerSeasonInfo?.color || 'text-slate-300'} bg-white/10 w-fit whitespace-nowrap`}>
                           <span>{selectedPlayerSeasonInfo?.icon || '🪐'}</span>
                           {selectedPlayerSeasonInfo
                             ? `${selectedPlayerSeasonInfo.name} ${typeof selectedPlayerSeasonInfo.index === 'number' ? `${selectedPlayerSeasonInfo.index + 1}위` : '-위'} · ${selectedSeasonSp} SP (시즌)`
                             : `보이드 -위 · ${selectedSeasonSp} SP (시즌)`}
                        </span>
                      </div>
                    </div>
                 </div>
             </div>

             {isMasterAccount && (
               <div className="mb-4 sm:mb-6 rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/10 p-3 sm:p-4">
                 <div className="flex items-center justify-between gap-3 mb-3">
                   <h4 className="text-fuchsia-200 text-sm sm:text-base font-black">마스터 포인트 수정</h4>
                   <p className="text-[11px] sm:text-xs text-slate-300 font-bold">선택 유저: {selectedPlayer.display_name}</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                   {(
                     [
                       { key: 'rp', label: 'RP (정규)' },
                       { key: 'sp', label: 'SP (시즌)' },
                       { key: 'gp', label: 'GP (갤럭시 코인)' },
                     ] as const
                   ).map((item) => (
                     <div key={`master-adjust-${item.key}`} className="rounded-xl border border-white/15 bg-black/35 p-2.5">
                       <p className="text-[11px] sm:text-xs text-slate-300 font-black mb-1.5">{item.label}</p>
                       <input
                         type="number"
                         min={0}
                         value={masterPointDrafts[item.key]}
                         onChange={(e) =>
                           setMasterPointDrafts((prev) => ({
                             ...prev,
                             [item.key]: e.target.value.replace(/[^\d]/g, ''),
                           }))
                         }
                         className="w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-2 text-white text-sm font-black outline-none focus:border-fuchsia-400"
                         placeholder="수치 입력"
                       />
                       <div className="mt-2 grid grid-cols-2 gap-2">
                         <button
                           onMouseEnter={() => playSFX('hover')}
                           onClick={() => {
                             playSFX('click');
                             void handleMasterAdjustPoints(item.key, 1);
                           }}
                           className="rounded-lg border border-emerald-400/55 bg-emerald-500/20 px-2 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer"
                         >
                           + 추가
                         </button>
                         <button
                           onMouseEnter={() => playSFX('hover')}
                           onClick={() => {
                             playSFX('click');
                             void handleMasterAdjustPoints(item.key, -1);
                           }}
                           className="rounded-lg border border-rose-400/55 bg-rose-500/20 px-2 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer"
                         >
                           - 차감
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

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
                          <p className="text-xs font-bold text-slate-400 mb-2">GC (상점)</p>
                          <p className="text-3xl font-black text-emerald-400">{selectedPlayer.gc ?? 1000}</p>
                        </div>
                        <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] text-center shadow-inner flex flex-col justify-center col-span-1">
                          <p className="text-xs font-bold text-slate-400 mb-2">방어전 트래커</p>
                          <p className="text-xl font-black text-cyan-300">
                            정규 {selectedPlayer?.regular_defense_stack ?? 0} / 시즌 {selectedPlayer?.season_defense_stack ?? 0}
                          </p>
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
               {copyStatus ? '복사 완료! 대결 준비!' : '대결신청 및 스팀코드orEA닉네임 복사'}
             </button>
             
             {profileTab === 'details' && (
               <p className="text-center text-xs text-slate-500 mt-4 font-bold">
                 * 전적 통계는 모든 경기(승/패)를 기준으로 집계됩니다.
               </p>
             )}
          </div>
        </div>
      )}

      {resultFx && (
        <div className="fixed inset-0 z-[420] pointer-events-none flex items-center justify-center">
          <div
            className={`absolute inset-0 ${
              resultFx.type === 'win'
                ? 'bg-[radial-gradient(circle_at_18%_20%,rgba(250,204,21,0.22),transparent_36%),radial-gradient(circle_at_78%_28%,rgba(244,114,182,0.18),transparent_38%),radial-gradient(circle_at_54%_84%,rgba(34,211,238,0.2),transparent_42%)]'
                : 'bg-[radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.18),transparent_40%),radial-gradient(circle_at_78%_26%,rgba(251,191,36,0.13),transparent_42%),radial-gradient(circle_at_50%_86%,rgba(239,68,68,0.2),transparent_44%)]'
            }`}
            style={{ animation: `${resultFx.type === 'win' ? 'fx-win-pulse' : 'fx-lose-pulse'} 10s ease-out` }}
          ></div>
          {resultFx.type === 'win' &&
            resultVictoryStars.map((s) => (
              <span
                key={s.id}
                className="victory-star-item"
                style={{
                  left: `${s.left}%`,
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                  fontSize: `${s.size}px`,
                  color: `hsl(${s.hue} 98% 72%)`,
                  ['--drift' as any]: `${s.drift}px`,
                }}
              >
                {s.glyph}
              </span>
            ))}
          {resultFx.type === 'lose' &&
            resultLoseTaunts.map((t) => (
              <span
                key={t.id}
                className="taunt-fall-item"
                style={{
                  left: `${t.left}%`,
                  animationDelay: `${t.delay}s`,
                  animationDuration: `${t.duration}s`,
                  fontSize: `${t.size}px`,
                  ['--drift' as any]: `${t.drift}px`,
                  ['--rot' as any]: `${t.rotate}deg`,
                }}
              >
                {t.label}
              </span>
            ))}
          {resultFxTexts.map((t) => (
            <span
              key={t.id}
              className="taunt-fall-item"
              style={{
                left: `${t.left}%`,
                animationDelay: `${t.delay}s`,
                animationDuration: `${t.duration}s`,
                fontSize: `${t.size}px`,
                ['--drift' as any]: `${t.drift}px`,
                ['--rot' as any]: `${t.rotate}deg`,
                color: t.tone === 'win' ? 'rgba(186, 251, 255, 0.98)' : 'rgba(255, 205, 225, 0.98)',
                textShadow:
                  t.tone === 'win'
                    ? '0 0 10px rgba(34,211,238,0.72), 0 0 24px rgba(250,204,21,0.5)'
                    : '0 0 10px rgba(244,114,182,0.68), 0 0 20px rgba(251,191,36,0.45)',
              }}
            >
              {t.label}
            </span>
          ))}
          {resultFx.type === 'win' &&
            resultBursts.map((b) => (
              <span
                key={b.id}
                className="absolute rounded-full"
                style={{
                  left: b.left,
                  top: b.top,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  background: 'radial-gradient(circle, rgba(250,204,21,0.96) 0%, rgba(34,211,238,0.9) 55%, rgba(232,121,249,0.85) 100%)',
                  boxShadow: '0 0 18px rgba(34,211,238,0.7)',
                  animation: `firework-burst 2.4s ease-out ${b.delay} forwards`,
                }}
              />
            ))}
          <div
            className={`px-7 py-4 rounded-2xl border font-black text-xl sm:text-2xl ${
              resultFx.type === 'win'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-cyan-200 to-fuchsia-300 border-cyan-300/60 bg-black/70 shadow-[0_0_24px_rgba(34,211,238,0.35)]'
                : 'text-rose-300 border-rose-400/60 bg-black/65'
            }`}
          >
            {resultFx.message}
          </div>
        </div>
      )}

      {incomingChallenge && (
        <div className="fixed inset-0 z-[275] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[2rem] border border-cyan-400/70 p-6 sm:p-7 bg-[#0a0f1d] shadow-2xl"
            style={{ animation: 'popup-in 260ms ease-out' }}
          >
            <h4 className="text-3xl sm:text-4xl font-black mb-3 text-cyan-300">대전 신청 도착</h4>
	            <div className="space-y-2 text-slate-200 text-lg sm:text-xl leading-relaxed">
	              <p>
	                <span className="font-black text-pink-300">{incomingChallenge.challengerName}</span> 님이
	                <span className="font-black text-cyan-300"> {getModeDisplayName(incomingChallenge.mode)}</span>을 신청했습니다.
	              </p>
	              <p className="text-base sm:text-lg text-slate-400">배팅 금액: <span className="font-black text-emerald-300">{incomingChallenge.betGc} GC</span></p>
	            </div>
 	            <div className="mt-6 grid grid-cols-2 gap-3">
 	              <button
 	                onMouseEnter={() => playSFX('hover')}
 	                onClick={handleAcceptIncomingChallenge}
 	                className="hvr-grow hvr-glow px-4 py-3 rounded-xl border border-cyan-400/50 text-cyan-300 text-lg sm:text-xl font-bold bg-black/50 hover:bg-cyan-500/20 cursor-pointer"
 	              >
 	                수락
 	              </button>
 	              <button
 	                onMouseEnter={() => playSFX('hover')}
 	                onClick={handleDeclineIncomingChallenge}
 	                className="hvr-grow hvr-glow px-4 py-3 rounded-xl border border-rose-400/50 text-rose-300 text-lg sm:text-xl font-bold bg-black/50 hover:bg-rose-500/20 cursor-pointer"
 	              >
 	                거절
 	              </button>
 	            </div>
 	          </div>
 	        </div>
	      )}

      {activeRewardChest && (
        <div className="fixed inset-0 z-[285] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-[2rem] border border-amber-300/65 bg-[#070b16] p-6 sm:p-8 shadow-2xl relative reward-chest-shell ${rewardChestOpening ? 'is-opening' : ''}`}
            style={{ animation: 'popup-in 260ms ease-out' }}
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_25%_20%,rgba(250,204,21,0.14),transparent_42%),radial-gradient(circle_at_78%_84%,rgba(34,211,238,0.12),transparent_48%)]" />
            <div className="relative z-10 text-center">
              <h4 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide">보상 상자 도착!</h4>
              <p className="mt-3 text-slate-200 text-sm sm:text-base font-bold">
                {getRewardChestReasonLabel(activeRewardChest.reason)}
              </p>
              <p className="mt-1 text-slate-400 text-xs sm:text-sm">상자를 눌러서 랜덤 GC 보상을 획득하세요</p>

              <button
                onMouseEnter={() => playSFX('hover')}
                onClick={handleOpenRewardChest}
                disabled={rewardChestClaiming || rewardChestRewardGc !== null}
                className="mx-auto mt-7 hvr-grow block w-[190px] sm:w-[220px] rounded-[1.4rem] border border-amber-300/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.28),rgba(15,23,42,0.9))] px-5 py-5 shadow-[0_0_26px_rgba(250,204,21,0.42)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  animation:
                    rewardChestOpening
                      ? 'chest-open-burst 680ms ease-out'
                      : 'chest-float 2.2s ease-in-out infinite',
                }}
              >
                <span className="block text-4xl sm:text-5xl leading-none">🎁</span>
                <span className="mt-2 block text-amber-200 font-black text-sm sm:text-base tracking-wide">
                  {rewardChestOpening ? '개봉 중...' : rewardChestRewardGc !== null ? '개봉 완료' : '터치하여 오픈'}
                </span>
              </button>

              {rewardChestRewardGc !== null && (
                <div className="mt-6" style={{ animation: 'reward-pop 300ms ease-out' }}>
                  <p className="text-slate-300 text-sm sm:text-base font-bold">축하합니다! 획득 보상</p>
                  <p className="mt-1 text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-[0_0_16px_rgba(52,211,153,0.7)]">
                    +{rewardChestRewardGc} GC
                  </p>
                  <button
                    onMouseEnter={() => playSFX('hover')}
                    onClick={handleRewardChestClose}
                    className="hvr-grow hvr-glow mt-6 px-6 py-3 rounded-xl border border-cyan-400/60 text-cyan-300 font-black bg-black/45 hover:bg-cyan-500/20 cursor-pointer"
                  >
                    확인
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showIngameSetupModal && (
        <div className="fixed inset-0 z-[292] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-[2rem] border border-cyan-400/70 p-6 sm:p-7 bg-[#0a0f1d] shadow-2xl"
            style={{ animation: 'popup-in 260ms ease-out' }}
          >
            <h4 className="text-3xl sm:text-4xl font-black mb-3 text-cyan-300">인게임 닉네임 설정</h4>
            <p className="text-slate-200 text-lg sm:text-xl leading-relaxed mb-5">
              첫 이용을 위해 인게임 닉네임과 플랫폼을 입력해주세요.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <button
                onMouseEnter={() => playSFX('hover')}
                onClick={() => setIngamePlatformDraft('steam')}
                className={`px-3 py-2 rounded-xl text-sm sm:text-base font-black border transition-all cursor-pointer ${ingamePlatformDraft === 'steam' ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200' : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'}`}
              >
                {ingamePlatformDraft === 'steam' ? '✓ ' : ''}STEAM CODE
              </button>
              <button
                onMouseEnter={() => playSFX('hover')}
                onClick={() => setIngamePlatformDraft('ea')}
                className={`px-3 py-2 rounded-xl text-sm sm:text-base font-black border transition-all cursor-pointer ${ingamePlatformDraft === 'ea' ? 'bg-fuchsia-500/20 border-fuchsia-400/60 text-fuchsia-200' : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'}`}
              >
                {ingamePlatformDraft === 'ea' ? '✓ ' : ''}EA
              </button>
            </div>
            <input
              value={ingameNicknameDraft}
              onChange={(e) => setIngameNicknameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
                  e.preventDefault();
                  void persistIngameProfile(ingameNicknameDraft, ingamePlatformDraft);
                }
              }}
              placeholder="인게임 닉네임 입력"
              className="w-full rounded-xl border border-white/15 bg-black/45 px-4 py-3 text-white font-bold text-lg outline-none focus:border-cyan-400/70"
            />
            <div className="mt-5 flex justify-end">
              <button
                onMouseEnter={() => playSFX('hover')}
                onClick={() => void persistIngameProfile(ingameNicknameDraft, ingamePlatformDraft)}
                disabled={savingIngameProfile || !ingameNicknameDraft.trim()}
                className={`hvr-grow hvr-glow px-6 py-3 rounded-xl border font-black text-lg sm:text-xl transition-all ${savingIngameProfile || !ingameNicknameDraft.trim() ? 'border-slate-700 text-slate-500 bg-slate-800/50 cursor-not-allowed' : 'border-cyan-400/60 text-cyan-300 bg-black/50 hover:bg-cyan-500/20 cursor-pointer'}`}
              >
                {savingIngameProfile ? '저장중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusPopup && (
        <div className="fixed inset-0 z-[360] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setStatusPopup(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-[2rem] border p-6 sm:p-7 shadow-2xl ${
              statusPopup.type === 'victory'
                ? 'border-fuchsia-300/75 bg-[linear-gradient(145deg,rgba(5,10,24,0.97),rgba(31,13,50,0.93),rgba(8,40,56,0.92))] shadow-[0_0_34px_rgba(232,121,249,0.32)]'
                : statusPopup.type === 'success'
                  ? 'border-emerald-400/70 bg-[#0a0f1d]'
                  : statusPopup.type === 'error'
                    ? 'border-rose-400/70 bg-[#0a0f1d]'
                    : 'border-cyan-400/70 bg-[#0a0f1d]'
            } ${statusPopupFading ? 'animate-[popup-fade_340ms_ease-out_forwards]' : ''}`}
            style={statusPopupFading ? undefined : { animation: 'popup-in 260ms ease-out' }}
          >
            <h4 className={`text-3xl sm:text-4xl font-black mb-3 ${
              statusPopup.type === 'victory'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-cyan-200 to-fuchsia-300 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                : statusPopup.type === 'success'
                  ? 'text-emerald-300'
                  : statusPopup.type === 'error'
                    ? 'text-rose-300'
                    : 'text-cyan-300'
            }`}>
              {statusPopup.title}
            </h4>
            <p className={`text-xl sm:text-2xl leading-relaxed whitespace-pre-line font-black ${
              statusPopup.type === 'victory' ? 'text-slate-100' : 'text-slate-200'
            }`}>{statusPopup.message}</p>
            {!statusPopup.hideConfirm && (
              <div className="mt-6 flex justify-end">
                <button
                  onMouseEnter={() => playSFX('hover')}
                  onClick={() => { playSFX('click'); setStatusPopup(null); }}
                  className="hvr-grow hvr-buzz px-5 py-2.5 rounded-xl border border-cyan-400/50 text-cyan-300 text-lg sm:text-xl font-bold bg-black/50 hover:bg-cyan-500/20 cursor-pointer"
                >
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onMouseEnter={() => playSFX('hover')}
          onClick={() => {
            playSFX('click');
            const target = activeScrollTargetRef.current || mainScrollRef.current;
            target?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed z-[240] hvr-grow hvr-glow px-4 py-3 rounded-full border border-cyan-400/60 bg-black/65 text-cyan-300 font-black shadow-[0_0_16px_rgba(34,211,238,0.35)] cursor-pointer"
          style={scrollTopButtonPos ? { left: `${scrollTopButtonPos.left}px`, top: `${scrollTopButtonPos.top}px`, transform: scrollTopButtonPos.transform } : undefined}
        >
          맨 위로
        </button>
      )}
      
    </div>
  );
}

export default App;


