import React, { useEffect, useState, useRef } from 'react';
import { 
  Calendar, Users, Target, Swords, Zap, Crown, Activity, LogIn, LogOut, 
  Search, ChevronDown, ChevronUp, Copy, Check, Shield, RefreshCw, Flame, 
  Lock, Unlock, BarChart3, TrendingUp, X, Trophy, PieChart, Home, User, Settings, Bell, Star
} from 'lucide-react';
import { supabase } from './supabase';

// @ts-ignore
import bgImage from './assets/bg.png'; 

// =====================================================================
// 🔊 오디오 파일 절대 경로 Import 
// =====================================================================
// @ts-ignore
import bgmSfx from './assets/sounds/bgm.mp3';
// @ts-ignore
import hoverSfx from './assets/sounds/hover.mp3';
// @ts-ignore
import clickSfx from './assets/sounds/click.mp3';
// @ts-ignore
import matchStartSfx from './assets/sounds/match_start.mp3';
// @ts-ignore
import waitingSfx from './assets/sounds/waiting.mp3';
// @ts-ignore
import successSfx from './assets/sounds/success.mp3';
// @ts-ignore
import errorSfx from './assets/sounds/error.mp3';

const LEGEND_CATEGORIES = {
  "어설트": ["방갈로르", "레버넌트", "퓨즈", "매드 매기", "발리스틱"],
  "스커미셔": ["패스파인더", "레이스", "옥테인", "호라이즌", "애쉬", "알터"],
  "리콘": ["블러드하운드", "크립토", "발키리", "시어", "밴티지", "스패로우"],
  "서포트": ["지브롤터", "라이프 라인", "미라지", "로바", "뉴캐슬", "콘딧"],
  "컨트롤러": ["코스틱", "왓슨", "렘파트", "카탈리스트"]
};

const WEAPON_CATEGORIES = {
  "돌격소총(AR)": ["VK-47 플랫라인", "햄록 버스트 AR", "R-301 카빈", "하복 라이플", "네메시스 버스트 AR"],
  "기관단총(SMG)": ["얼터네이터 SMG", "R-99 SMG", "볼트 SMG", "프라울러 점사 PDW", "C.A.R SMG"],
  "경기관총(LMG)": ["M600 스핏파이어", "L-STAR EMG", "디보션", "램페이지 LMG"],
  "마크스맨": ["보섹 컴파운드 보우", "30-30 리피터", "G7 스카우트", "트리플 테이크"],
  "저격총": ["롱보우 DMR", "차지 라이플", "센티넬", "크레이버 .50구경 저격총"],
  "산탄총": ["EVA-8 자동", "모잠비크 x 1", "모잠비크 x 2", "마스티프", "피스키퍼"],
  "권총": ["p2020 x 1", "p2020 x 2", "RE-45 버스트", "윙맨"],
  "특수 무기": ["투척 나이프"]
};

const ALL_LEGENDS = Object.values(LEGEND_CATEGORIES).flat();
const ALL_WEAPONS = Object.values(WEAPON_CATEGORIES).flat();

const getAvatarFallback = (name: string | undefined | null, rankers: any[]) => {
  const safeName = name || 'GUEST';
  const ranker = rankers.find((r: any) => r.display_name === safeName);
  if (ranker && ranker.avatar_url) return ranker.avatar_url;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

// 글로벌 사운드 설정
let globalBgmEnabled = true;
let globalSfxEnabled = true;
let globalBgmVolume = 0.10;
let globalSfxVolume = 0.60;

const audioCache: Record<string, HTMLAudioElement> = {};
let isAudioUnlocked = false; 
let currentMatchPhase = 'idle'; 

const BASE_VOLUMES: Record<string, number> = {
  hover: 0.5,        
  click: 1.0,        
  match_start: 1.0,  
  success: 1.0,      
  error: 1.0         
};

if (typeof window !== 'undefined') {
  const files: Record<string, string> = { bgm: bgmSfx, hover: hoverSfx, click: clickSfx, match_start: matchStartSfx, waiting: waitingSfx, success: successSfx, error: errorSfx };
  Object.entries(files).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto'; 
    if (key === 'bgm' || key === 'waiting') { audio.loop = true; audio.volume = globalBgmVolume; } 
    else { audio.volume = globalSfxVolume * (BASE_VOLUMES[key] || 1.0); }
    audioCache[key] = audio;
  });

  const unlockAudio = () => {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;
    Object.keys(audioCache).forEach(key => {
      const audio = audioCache[key];
      if (key === 'bgm' && currentMatchPhase === 'idle' && globalBgmEnabled) { audio.muted = false; audio.play().catch(() => {}); } 
      else { audio.muted = false; const p = audio.play(); if (p !== undefined) { p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {}); } }
    });
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  document.addEventListener('visibilitychange', () => {
    const isHidden = document.hidden;
    Object.values(audioCache).forEach(audio => { audio.muted = isHidden; });
  });
}

const playSFX = (type: string) => {
  if (!isAudioUnlocked || !audioCache[type]) return;
  if ((type === 'bgm' || type === 'waiting') && !globalBgmEnabled) return;
  if (type !== 'bgm' && type !== 'waiting' && !globalSfxEnabled) return;
  if (type !== 'bgm' && type !== 'waiting') audioCache[type].currentTime = 0;
  audioCache[type].play().catch(() => {});
};

const stopSFX = (type: string) => {
  if (!audioCache[type]) return;
  audioCache[type].pause();
  if (type !== 'bgm' && type !== 'waiting') audioCache[type].currentTime = 0;
};

const MENU_ITEMS = [
  { id: 'home', icon: Home, label: '대시보드' },
  { id: 'profile', icon: User, label: '내 정보' },
  { id: 'ranking', icon: Trophy, label: '명예의 전당' },
  { id: 'activity', icon: Activity, label: '활동 로그' },
  { id: 'settings', icon: Settings, label: '환경 설정' }
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('home');

  const [entryMode, setEntryMode] = useState<'free' | 'random'>('free');
  const [entryOpponent, setEntryOpponent] = useState('');
  const [entryLegend, setEntryLegend] = useState('');
  const [entryWeapons, setEntryWeapons] = useState<string[]>(['', '']);

  const [matchPhase, setMatchPhase] = useState<'idle' | 'waiting' | 'ready'>('idle');
  const [activeMatch, setActiveMatch] = useState<{ mode: string, opponent: string, legend: string, weapons: string[] } | null>(null);
  const [myReportedScore, setMyReportedScore] = useState<number | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]); 
  const [rankers, setRankers] = useState<any[]>([]); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [showComet, setShowComet] = useState(false);
  const prevTopPlayer = useRef<string | null>(null);
  const [rankTab, setRankTab] = useState<number>(0);

  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.10);
  const [sfxVolume, setSfxVolume] = useState(0.60);
  const [vfxEnabled, setVfxEnabled] = useState(true);

  useEffect(() => {
    globalBgmEnabled = bgmEnabled; globalSfxEnabled = sfxEnabled; globalBgmVolume = bgmVolume; globalSfxVolume = sfxVolume;
    if (audioCache['bgm']) { audioCache['bgm'].muted = !bgmEnabled; audioCache['bgm'].volume = bgmVolume; }
    if (audioCache['waiting']) { audioCache['waiting'].muted = !bgmEnabled; audioCache['waiting'].volume = bgmVolume; }
    ['hover', 'click', 'match_start', 'success', 'error'].forEach(key => {
      if (audioCache[key]) { audioCache[key].muted = !sfxEnabled; audioCache[key].volume = sfxVolume * (BASE_VOLUMES[key] || 1.0); }
    });
  }, [bgmEnabled, sfxEnabled, bgmVolume, sfxVolume]);

  const currentUserAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
  const currentUserName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;

  useEffect(() => {
    currentMatchPhase = matchPhase;
    if (!isAudioUnlocked) return;
    if (matchPhase === 'idle') { stopSFX('waiting'); if (globalBgmEnabled) playSFX('bgm'); } 
    else if (matchPhase === 'waiting') { stopSFX('bgm'); if (globalBgmEnabled) playSFX('waiting'); } 
    else if (matchPhase === 'ready') { stopSFX('bgm'); stopSFX('waiting'); }
    return () => stopSFX('waiting');
  }, [matchPhase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    fetchData(); fetchRankers(); 
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (rankers.length > 0 && vfxEnabled) {
      const currentTop = rankers[0].display_name;
      if (prevTopPlayer.current && prevTopPlayer.current !== currentTop) { setShowComet(true); setTimeout(() => setShowComet(false), 3000); }
      prevTopPlayer.current = currentTop;
    }
  }, [rankers, vfxEnabled]);

  const fetchData = async () => {
    const { data: matches } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (matches && matches.length > 0) setLogs([...matches]); else setLogs([]);
  };

  const fetchRankers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (profiles && profiles.length > 0) {
      const processed = profiles.map((r, i) => ({
        ...r, rankIndex: i, display_name: r.display_name || 'GUEST', wins: r.wins || 0, losses: r.losses || 0,
        win_rate: (r.wins + r.losses) > 0 ? (((r.wins) / (r.wins + r.losses)) * 100).toFixed(1) + '%' : '0.0%',
        avatar_url: r.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        favorite_legend: r.favorite_legend, favorite_weapon: r.favorite_weapon, defense_stack: r.defense_stack || 0
      }));
      setRankers(processed);
    } else { setRankers([]); }
  };

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
  };

  const handleLogin = async () => { playSFX('click'); await supabase.auth.signInWithOAuth({ provider: 'discord' }); };
  const handleLogout = async () => { playSFX('click'); await supabase.auth.signOut(); setProfile(null); };

  const handleStartMatch = () => {
    if (!user) { playSFX('error'); return alert("로그인이 필요합니다!"); }
    if (!entryOpponent.trim()) { playSFX('error'); return alert("상대방 닉네임을 정확히 입력하세요!"); }
    if (entryMode === 'free' && (!entryLegend || !entryWeapons[0] || !entryWeapons[1])) { playSFX('error'); return alert("레전드와 무기를 모두 선택해주세요!"); }
    
    playSFX('match_start'); 
    if (entryMode === 'random') {
      const randL = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
      const randW = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
      setActiveMatch({ mode: 'random', opponent: entryOpponent.trim(), legend: randL, weapons: randW });
    } else {
      setActiveMatch({ mode: 'free', opponent: entryOpponent.trim(), legend: entryLegend, weapons: [...entryWeapons] });
    }
    setMatchPhase('waiting'); setMyReportedScore(null);
  };

  const handleCancelMatch = () => { playSFX('click'); setMatchPhase('idle'); setActiveMatch(null); };

  const handleReportScore = async () => {
    if (myReportedScore === null) { playSFX('error'); return alert("스코어를 선택하세요!"); }
    if (!user) { playSFX('error'); return alert("로그인이 필요합니다!"); }
    if (!activeMatch) return;

    playSFX('success'); 
    const playerName = profile?.display_name || user.user_metadata.full_name;
    const winnerName = myReportedScore === 3 ? playerName : activeMatch.opponent;
    const winnerRankNum = rankers.findIndex(r => r.display_name === winnerName) + 1 || 99;

    const { error } = await supabase.from('matches').insert([{
      match_type: activeMatch.mode, left_player_name: playerName, right_player_name: activeMatch.opponent,
      left_legend: activeMatch.legend, left_weapons: activeMatch.weapons,
      score_left: myReportedScore, score_right: 3 - myReportedScore, winner_name: winnerName, winner_rank_num: winnerRankNum 
    }]);
    
    if (!error) { 
      alert("전투 보고 완료!"); 
      setMatchPhase('idle'); setActiveMatch(null); setEntryOpponent(''); setEntryLegend(''); setEntryWeapons(['', '']);
      fetchData(); fetchRankers(); 
    } else { playSFX('error'); alert(`점수 저장 중 오류가 발생했습니다.\n상세내용: ${error.message}`); }
  };

  const copyDiscordId = (id: string) => {
    if (!id) return;
    playSFX('click'); navigator.clipboard.writeText(id); setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const getGrandRankInfo = (idx: number) => {
    if (idx === 0) return { title: "왕좌", num: 1, color: "text-yellow-400", glow: "shadow-[0_0_15px_gold]", bg: "bg-yellow-400/20", icon: <Crown size={14} className="text-yellow-400 animate-pulse"/> };
    if (idx < 6) return { title: "성좌", num: idx, color: "text-purple-400", glow: "shadow-[0_0_10px_rgba(192,132,252,0.6)]", bg: "bg-purple-400/20", icon: <Star size={12} className="text-purple-400"/> };
    if (idx < 12) return { title: "항성", num: idx - 5, color: "text-cyan-400", glow: "shadow-[0_0_10px_rgba(34,211,238,0.4)]", bg: "bg-cyan-400/20", icon: <Zap size={12} className="text-cyan-400"/> };
    return { title: "정예", num: idx - 11, color: "text-slate-500", glow: "", bg: "bg-slate-500/20", icon: <Shield size={12} className="text-slate-500"/> };
  };

  const renderCombatLogItem = (log: any, index: number) => {
    const isLeftWinner = log.winner_name === log.left_player_name;
    const winnerName = isLeftWinner ? log.left_player_name : log.right_player_name;
    const loserName = isLeftWinner ? log.right_player_name : log.left_player_name;
    const winnerScore = isLeftWinner ? log.score_left : log.score_right;
    const loserScore = isLeftWinner ? log.score_right : log.score_left;
    
    const winnerAvatar = getAvatarFallback(winnerName, rankers);
    const loserAvatar = getAvatarFallback(loserName, rankers);

    const weapon1 = log.left_weapons?.[0] || '미선택';
    const weapon2 = log.left_weapons?.[1] || '미선택';
    const usedLegend = log.left_legend || '미선택';

    return (
      <div key={index} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-cyan-500/30 p-5 rounded-[1.5rem] flex flex-col justify-center gap-3 hover:border-cyan-400/80 transition-all shadow-inner relative group combat-log-item cursor-default h-[140px] shrink-0">
        <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl rounded-tr-[1.5rem] ${log.match_type === 'free' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-black'}`}>
          {log.match_type} MATCH
        </div>
        <div className="flex items-center justify-between w-full mt-2">
          <div className="flex items-center gap-3 flex-1 overflow-hidden pr-2">
             <div className="relative shrink-0"><span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-black text-[8px] font-black px-1 rounded shadow-[0_0_5px_gold] z-10">WIN</span><img src={winnerAvatar} className={`w-10 h-10 rounded-full border-2 ${isLeftWinner ? 'border-yellow-400 shadow-[0_0_8px_gold]' : 'border-slate-500'} bg-black`} alt="winner"/></div>
             <span className="font-black text-white text-xl truncate drop-shadow-[0_0_5px_white] nickname">{winnerName}</span><span className="text-[11px] text-slate-500 font-black italic mx-2 shrink-0">VS</span><img src={loserAvatar} className={`w-8 h-8 rounded-full border-2 border-slate-600 opacity-60 shrink-0 bg-black`} alt="loser"/><span className="font-bold text-slate-400 text-base truncate">{loserName}</span>
          </div>
          <div className="text-3xl font-black tracking-widest text-white shrink-0 ml-2 drop-shadow-[0_0_10px_white]">
             <span className="text-yellow-400">{winnerScore}</span><span className="text-slate-600 mx-1">:</span><span className="text-slate-400">{loserScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-black bg-white/5 px-4 py-2 rounded-xl w-fit shadow-inner border border-white/10 details mt-1">
           <span className="text-pink-400">[{usedLegend}]</span><span className="text-cyan-300">{weapon1}</span><span className="text-slate-500">/</span><span className="text-cyan-300">{weapon2}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-black text-slate-300 font-sans overflow-hidden relative select-none">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }}><div className="absolute inset-0 bg-black/10"></div></div>
      {showComet && vfxEnabled && (<div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"><div className="comet-path"><div className="comet-head shadow-[0_0_50px_#fff]"></div><div className="comet-tail"></div></div></div>)}

      <aside className="w-20 bg-black/20 backdrop-blur-md border-r border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col items-center py-10 gap-10 z-20 shrink-0 h-screen fixed left-0">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer" onMouseEnter={() => playSFX('hover')} onClick={() => playSFX('click')}><Star className="text-cyan-400 fill-cyan-400 animate-pulse" size={24}/></div>
        <div className="flex flex-col gap-10 text-slate-500 w-full items-center">
          {MENU_ITEMS.map((item) => (<div key={item.id} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setActiveMenu(item.id); }} title={item.label} className={`cursor-pointer transition-all duration-300 ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300 hover:scale-105'}`}><item.icon size={24}/></div>))}
        </div>
        <div onMouseEnter={() => playSFX('hover')} className="mt-auto mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout} title="로그아웃"><LogOut size={24}/></div>
      </aside>

      <div className="flex-1 flex flex-col z-10 relative ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="px-10 py-8 flex justify-between items-center shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <div className="flex items-center gap-6 cursor-pointer" onMouseEnter={() => playSFX('hover')} onClick={() => playSFX('click')}>
            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(192,132,252,0.8)]">은하단</h1><div className="h-12 w-[3px] bg-gradient-to-b from-cyan-400 to-purple-400 mx-3 shadow-[0_0_10px_cyan]"></div>
            <div className="flex flex-col justify-center"><p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">별의 전쟁 : 시즌 1</p><p className="text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.4em] mt-1.5 uppercase italic">SEASON 01 BATTLE FOR THE STAR THRONE</p></div>
          </div>
          {user ? (
            <div onMouseEnter={() => playSFX('hover')} onClick={handleLogout} className="flex items-center gap-4 bg-black/60 p-2 rounded-full border border-white/10 pr-8 shadow-2xl border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all group">
              <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className="w-10 h-10 rounded-full border border-cyan-500/50 group-hover:border-pink-500" alt="profile"/>
              <div className="flex flex-col"><span className="text-sm font-black text-white">{currentUserName || "GUEST"}</span><span className="text-[9px] font-bold text-cyan-400 group-hover:text-pink-400 uppercase tracking-tighter">Click to Logout</span></div>
            </div>
          ) : (<button onMouseEnter={() => playSFX('hover')} onClick={handleLogin} className="flex items-center gap-3 bg-cyan-600/20 border-2 border-cyan-400 py-2.5 px-8 rounded-full shadow-[0_0_20px_cyan] hover:bg-cyan-400 hover:text-black transition-all font-black text-sm uppercase tracking-widest cursor-pointer"><LogIn size={20}/> DISCORD LOGIN</button>)}
        </header>

        {activeMenu === 'home' && (
          <main className="flex-1 p-10 grid grid-cols-12 gap-8 items-stretch pb-20 animate-in fade-in duration-500 min-h-[1400px]">
            <div className="col-span-12 xl:col-span-3 flex flex-col gap-8 h-full relative">
               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[2.5rem] p-3 shrink-0 h-fit flex flex-col overflow-hidden relative">
                  <div className="flex flex-col relative z-10">
                      <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-tight text-center w-full block mb-2 border-b border-white/5 pb-2 shrink-0 drop-shadow-[0_0_8px_cyan]">매치 엔트리</h3>
                      <div className="space-y-3 flex flex-col relative pb-1">
                          <div className="flex gap-2 p-0.5 bg-black/50 rounded-2xl border border-white/5 shadow-inner shrink-0 relative z-20 mt-1">
                             <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setEntryMode('free'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${entryMode === 'free' ? 'bg-pink-600 text-white shadow-[0_0_15px_pink]' : 'text-slate-500 hover:text-white'}`}>자유대전</button>
                             <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setEntryMode('random'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${entryMode === 'random' ? 'bg-cyan-600 text-black shadow-[0_0_15px_cyan]' : 'text-slate-500 hover:text-white'}`}>랜덤대전</button>
                          </div>
                          <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5 shadow-inner shrink-0 relative z-20">
                             <p className="text-[9px] text-slate-500 font-black uppercase text-left mb-1 tracking-widest">Target Name</p>
                             <input value={entryOpponent} onChange={(e) => setEntryOpponent(e.target.value)} placeholder="상대방 닉네임" className="w-full bg-transparent outline-none text-white font-black text-lg px-1 select-text cursor-text" />
                          </div>
                          {entryMode === 'free' && (
                            <div className="space-y-2 flex flex-col relative z-10 overflow-hidden">
                               <select onMouseEnter={() => playSFX('hover')} value={entryLegend} onChange={(e) => { playSFX('click'); setEntryLegend(e.target.value); }} className={`w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none cursor-pointer shrink-0 select-text ${entryLegend === '' ? 'text-slate-500' : 'text-white'}`}>
                                 <option value="" disabled hidden>👉 사용하실 레전드를 선택하세요</option>
                                 {Object.entries(LEGEND_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={cat} className="bg-black text-cyan-400 font-black">{list.map(l => <option key={l} value={l} className="text-white">{l}</option>)}</optgroup>))}
                               </select>
                               <div className="flex flex-col gap-2 overflow-hidden relative">
                                  {[0, 1].map(i => (
                                    <select key={i} onMouseEnter={() => playSFX('hover')} value={entryWeapons[i]} onChange={(e) => {const w = [...entryWeapons]; w[i] = e.target.value; setEntryWeapons(w); playSFX('click');}} className={`w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none cursor-pointer shrink-0 select-text ${entryWeapons[i] === '' ? 'text-slate-500' : 'text-pink-400'}`}>
                                       <option value="" disabled hidden>👉 {i+1}번 무기를 선택하세요</option>
                                       {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={cat} className="bg-black text-pink-400 font-black">{list.map(w => <option key={w} value={w} className="text-white">{w}</option>)}</optgroup>))}
                                    </select>
                                  ))}
                               </div>
                            </div>
                          )}
                          <button onMouseEnter={() => playSFX('hover')} onClick={handleStartMatch} className="w-full py-4 rounded-[1.5rem] font-black text-lg text-white bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all border border-white/10 shrink-0 relative z-20 mt-1 cursor-pointer">대전 생성 (Entry)</button>
                      </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10 rounded-b-[2.5rem] pointer-events-none"></div>
               </section>

               <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[2.5rem] p-4 flex flex-col overflow-hidden h-[880px] shrink-0">
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 uppercase tracking-tight text-center w-full block mb-2 border-b border-white/5 pb-2 shrink-0 flex items-center justify-center gap-2 drop-shadow-[0_0_8px_cyan] cursor-default" onMouseEnter={() => playSFX('hover')}>
                     <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></span> 접속 현황
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-1">
                     {rankers.length > 0 ? rankers.map((ou, i) => {
                        const rankInfo = getGrandRankInfo(ou.rankIndex);
                        const currentUserRankNum = currentUserName ? rankers.findIndex(r => r.display_name === currentUserName) + 1 : 999;
                        
                        // 🌟 남철님 요청: 완벽한 도전 규칙 알고리즘
                        const myIdx = currentUserRankNum - 1; 
                        const targetIdx = ou.rankIndex; 
                        let isChallengeableByRank = false;

                        if (myIdx > targetIdx) { // 본인보다 랭크가 높아야(인덱스가 작아야) 도전 가능 검토
                           if (targetIdx >= 12) {
                               // 1. 타겟이 정예(13위 이하): 하위 랭크는 누구나 도전 가능
                               isChallengeableByRank = true;
                           } else if (targetIdx >= 6) {
                               // 2. 타겟이 항성(7~12위): 정예 1까지만 진입 가능 & 최대 2단계 위로만 도전 가능
                               if (myIdx <= 12 && (myIdx - targetIdx) <= 2) isChallengeableByRank = true;
                           } else {
                               // 3. 타겟이 성좌/왕좌(1~6위): 항성 1까지만 진입 가능 & 딱 1단계 위로만 도전 가능
                               if ((myIdx - targetIdx) === 1) isChallengeableByRank = true;
                           }
                        }

                        return (
                          <div key={i} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-white/10 p-3 rounded-xl flex items-center justify-between hover:border-cyan-400/50 transition-all group cursor-default">
                             <div className="flex items-center gap-3">
                                <div className="relative"><img src={ou.avatar_url} className="w-9 h-9 rounded-full border border-white/20" alt="profile"/><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div></div>
                                <div className="flex flex-col"><span className="text-sm font-black text-white truncate max-w-[90px]">{ou.display_name}</span><span className={`text-[9px] font-black uppercase tracking-widest ${rankInfo.color}`}>{rankInfo.title} {rankInfo.num}</span></div>
                             </div>
                             {ou.is_challengeable !== false ? (
                                <button onClick={() => { playSFX('click'); setEntryOpponent(ou.display_name); }} disabled={!isChallengeableByRank} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)] cursor-pointer ${isChallengeableByRank ? 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-slate-800/50 border border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                  {isChallengeableByRank ? '도전!' : '하위 랭크'}
                                </button>
                             ) : (
                                <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 text-slate-500 text-[9px] font-black rounded-xl uppercase tracking-widest cursor-default">매치 중</span>
                             )}
                          </div>
                        )
                     }) : (
                        <div className="flex items-center justify-center h-full opacity-50 text-sm font-bold tracking-widest text-cyan-400">최초의 왕좌에 도전하세요!</div>
                     )}
                  </div>
               </section>
            </div>

            <div className="col-span-12 xl:col-span-5 flex flex-col gap-8 h-full relative">
               <section className="bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-4 overflow-hidden flex flex-col justify-between h-fit shrink-0 relative">
                  <div className="flex flex-col relative z-10">
                      <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-tight text-center w-full block mb-2 border-b border-white/5 pb-2 shrink-0 mt-1 drop-shadow-[0_0_8px_cyan]">현재 매치 상황</h3>
                      {matchPhase === 'waiting' ? (
                        <div className="flex flex-col items-center justify-center opacity-90 relative z-10 py-16 animate-in fade-in">
                           <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_15px_cyan]"></div>
                           <h4 className="text-3xl font-black text-cyan-400 tracking-widest drop-shadow-[0_0_10px_cyan]">대기 중입니다</h4>
                           <p className="text-sm font-bold text-slate-300 mt-4 tracking-widest text-center">상대방(<span className="text-pink-400">{entryOpponent}</span>)이 매칭을<br/>수락할 때까지 기다립니다.</p>
                           <button onMouseEnter={() => playSFX('hover')} onClick={handleCancelMatch} className="mt-10 px-10 py-3 rounded-full border-2 border-pink-500/50 text-pink-400 font-black hover:bg-pink-500 hover:text-white transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] cursor-pointer">매칭 취소 (Cancel)</button>
                        </div>
                      ) : matchPhase === 'idle' || !activeMatch ? (
                        <div className="flex flex-col items-center justify-center opacity-10 relative z-10 py-20 cursor-default" onMouseEnter={() => playSFX('hover')}><Shield size={100}/><p className="text-xl font-black uppercase tracking-[0.4em] mt-8 drop-shadow-[0_0_10px_white]">Ready for Combat</p></div>
                      ) : (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in overflow-hidden relative z-10 gap-3 mt-1">
                           <div className={`p-6 rounded-[2.5rem] border-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${activeMatch.mode === 'random' ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-pink-400/50 bg-pink-400/5'} text-center relative overflow-hidden flex flex-col justify-center shrink-0 cursor-default`} onMouseEnter={() => playSFX('hover')}>
                              <h4 className="text-6xl font-black text-white tracking-tighter mb-6 drop-shadow-[0_0_20px_white] leading-tight shrink-0">{activeMatch.legend}</h4>
                              <div className="flex flex-col gap-3 items-center shrink-0">
                                 {activeMatch.weapons.map((w:any, idx:number) => (
                                   <span key={idx} className={`px-6 py-2 rounded-2xl text-base font-black border-2 w-full max-w-[350px] shadow-inner ${activeMatch.mode === 'random' ? 'border-cyan-400/50 text-cyan-400' : 'border-pink-400/50 text-pink-400'}`}>{w}</span>
                                 ))}
                              </div>
                           </div>
                           <div className="text-center bg-black/40 p-4 rounded-[1.5rem] border border-white/10 shadow-inner shrink-0 relative z-20 cursor-default" onMouseEnter={() => playSFX('hover')}>
                              <p className="text-[10px] text-slate-500 font-black uppercase text-center mb-1 tracking-widest">Target Opponent</p>
                              <h4 className="text-5xl font-black text-white italic truncate px-2 pb-2 pt-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{activeMatch.opponent}</h4>
                           </div>
                           <div className="flex flex-col gap-3 pt-3 border-t border-white/5 shrink-0 relative z-20">
                              <div className="flex justify-center gap-4 shrink-0">
                                {[0, 1, 2, 3].map(num => (
                                  <button key={num} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMyReportedScore(num); }} className={`w-14 h-14 rounded-3xl font-black text-2xl transition-all border-2 cursor-pointer ${myReportedScore === num ? 'bg-cyan-500 border-white text-black scale-110 shadow-[0_0_20px_cyan]' : 'bg-black/60 border-white/10 text-white hover:bg-white/5'}`}>{num}</button>
                                ))}
                              </div>
                              <button onMouseEnter={() => playSFX('hover')} onClick={handleReportScore} disabled={myReportedScore === null} className={`w-full py-4 rounded-[1.5rem] font-black text-xl transition-all uppercase tracking-widest shrink-0 relative z-20 cursor-pointer ${myReportedScore !== null ? 'text-cyan-400 border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-400 hover:text-black' : 'text-slate-500 border-2 border-slate-700 bg-slate-800/50 cursor-not-allowed'}`}>
                                {myReportedScore !== null ? '전투 결과 입력' : '스코어를 선택하세요'}
                              </button>
                           </div>
                        </div>
                      )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10 rounded-b-[3rem] pointer-events-none"></div>
               </section>

               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[2.5rem] p-6 flex flex-col overflow-hidden h-[940px] shrink-0">
                  <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-tight text-center w-full block mb-4 border-b border-white/5 pb-2 shrink-0 drop-shadow-[0_0_8px_cyan] cursor-default" onMouseEnter={() => playSFX('hover')}>최근 전투 기록</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-4">
                     {logs.length > 0 ? logs.slice(0, 5).map((log, i) => renderCombatLogItem(log, i)) : (
                        <div className="flex items-center justify-center h-full opacity-50 text-sm font-bold tracking-widest text-cyan-400">아직 진행된 전투가 없습니다</div>
                     )}
                  </div>
               </section>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col h-full relative">
               <section className="bg-black/40 backdrop-blur-3xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3.5rem] p-5 flex flex-col overflow-hidden h-fit shrink-0 relative">
                  <div className="px-2 pt-2 flex flex-col relative z-10">
                      <div className="flex flex-col items-start shrink-0 mb-4 mt-1">
                          <div className="flex items-center gap-6 mb-1 cursor-default" onMouseEnter={() => playSFX('hover')}>
                              <Trophy className="text-yellow-400 shrink-0 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" size={80}/>
                              <div className="flex flex-col">
                                  <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter drop-shadow-[0_0_10px_orange] mt-1 pt-1">은하단 랭킹</h3>
                                  <p className="text-sm font-black text-cyan-400 italic uppercase leading-tight pt-1 drop-shadow-[0_0_8px_cyan]">명예의 전당<br/><span className="text-xs text-slate-400">(HALL OF FAME)</span></p>
                              </div>
                          </div>
                      </div>
                      
                      <div className="overflow-y-auto space-y-4 custom-scrollbar pr-3 relative z-10 pb-2 mb-2 p-1 min-h-[200px]">
                         {rankers.length > 0 ? rankers
                           .filter(r => r.display_name?.includes(searchQuery))
                           .filter(r => {
                              if (rankTab === 0) return r.rankIndex < 6; 
                              if (rankTab === 1) return r.rankIndex >= 6 && r.rankIndex < 12;
                              return r.rankIndex >= 12; 
                           })
                           .map((r) => {
                              const grandRank = getGrandRankInfo(r.rankIndex);
                              if (!grandRank) return null;

                              return (
                                <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer({...r, rankIndex: r.rankIndex}); }} className={`mx-1 p-3 pt-8 rounded-[1.2rem] border transition-all cursor-pointer group hover:scale-[1.02] ${grandRank.glow} border-cyan-400/30 hover:border-cyan-400 bg-black/60 relative flex flex-col justify-center shrink-0 z-20 rank-item`}>
                                   {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[1.2rem] pointer-events-none"></div>}
                                   <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-lg border-x border-b border-cyan-400/30 ${grandRank.bg} flex items-center gap-1 shadow-md`}>
                                       {grandRank.icon} <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${grandRank.color}`}>{grandRank.title} {grandRank.num}</span>
                                   </div>
                                   <div className="flex items-center justify-between w-full mt-3 relative z-10 px-2">
                                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                         <img src={r.avatar_url} className={`w-10 h-10 rounded-full border-2 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_10px_gold]' : 'border-white/20'} shrink-0`} alt="profile"/>
                                         <span className={`text-white font-black truncate group-hover:text-cyan-400 transition-colors tracking-tight whitespace-nowrap nickname ${r.rankIndex === 0 ? 'text-2xl' : 'text-xl'}`}>{r.display_name}</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                         <span className="font-black text-slate-300 text-lg tracking-widest">{r.wins}승 {r.losses}패</span>
                                         {r.rankIndex === 0 && (
                                           <span className={`font-black text-[10px] px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 shadow-[0_0_5px_gold]`}>👑 왕좌방어 스택: {r.defense_stack || 0}</span>
                                         )}
                                      </div>
                                   </div>
                                </div>
                              );
                           }) : (
                             <div className="flex flex-col items-center justify-center h-[500px] opacity-50 text-sm font-bold tracking-widest mt-10 text-cyan-400 gap-4">
                               <Crown size={48} className="text-cyan-400 mb-2 opacity-50"/>
                               아직 등록된 랭커가 없습니다<br/>디스코드로 로그인하여 최초의 왕좌를 차지하세요!
                             </div>
                           )}
                      </div>
                      <div className="flex gap-2 shrink-0 relative z-20 px-1 mt-1 mb-1">
                         <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(0); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>왕좌·성좌</button>
                         <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(1); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 1 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>항성 (1~6)</button>
                         <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(2); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 2 ? 'bg-slate-500/20 text-slate-300 border-slate-500/50 shadow-[0_0_10px_rgba(148,163,184,0.3)]' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>정예</button>
                      </div>
                      <div className="relative shrink-0 px-1 relative z-20 mt-3 mb-1">
                         <Search className="absolute left-6 top-4.5 text-slate-500" size={18}/>
                         <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색..." className="w-full bg-white/5 border border-white/10 pl-16 pr-8 py-4 rounded-full text-sm outline-none focus:border-cyan-400 text-white transition-all shadow-inner relative z-20 select-text cursor-text"/>
                      </div>
                  </div>
               </section>
            </div>
          </main>
        )}

        {activeMenu === 'profile' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-8 text-left drop-shadow-[0_0_10px_cyan]">내 정보 (Profile)</h2>
            <div className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-12 max-w-4xl flex items-center gap-12 cursor-default" onMouseEnter={() => playSFX('hover')}>
              <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-48 h-48 rounded-full border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]" alt="profile"/>
              <div className="flex-1">
                 <h3 className="text-6xl font-black text-white mb-2 italic tracking-tighter uppercase">{currentUserName || "GUEST PILOT"}</h3>
                 <p className="text-cyan-400 font-bold mb-8 tracking-widest">{user?.email || "로그인이 필요합니다"}</p>
                 <div className="grid grid-cols-3 gap-6">
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner">
                     <p className="text-slate-400 text-xs mb-2 tracking-widest font-black">TOTAL MATCHES</p>
                     <p className="text-4xl font-black text-white">0</p>
                   </div>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner">
                     <p className="text-slate-400 text-xs mb-2 tracking-widest font-black">TOTAL WINS</p>
                     <p className="text-4xl font-black text-cyan-400">0</p>
                   </div>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner">
                     <p className="text-slate-400 text-xs mb-2 tracking-widest font-black">WIN RATE</p>
                     <p className="text-4xl font-black text-pink-400">0%</p>
                   </div>
                 </div>
              </div>
            </div>
          </main>
        )}

        {activeMenu === 'activity' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-8 text-left flex items-center gap-4 drop-shadow-[0_0_10px_cyan]">
              <Activity size={36} className="text-cyan-400"/> 활동 로그 (Activity Log)
            </h2>
            <div className="space-y-4 max-w-5xl">
              {logs.length > 0 ? logs.map((log, i) => renderCombatLogItem(log, i)) : (
                 <div className="flex items-center justify-center p-20 opacity-50 text-lg font-bold tracking-widest border border-white/10 rounded-[2rem] text-cyan-400">아직 진행된 전투가 없습니다.</div>
              )}
            </div>
          </main>
        )}

        {activeMenu === 'settings' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 uppercase tracking-widest mb-8 text-left flex items-center gap-4 drop-shadow-[0_0_10px_white]">
              <Settings size={36} className="text-slate-400"/> 환경 설정 (Settings)
            </h2>
            <div className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-12 max-w-3xl space-y-10">
               <div className="flex items-center gap-8 border-b border-white/10 pb-10 cursor-default" onMouseEnter={() => playSFX('hover')}>
                  <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-24 h-24 rounded-full border-4 border-cyan-400 shadow-[0_0_20px_cyan]" alt="profile"/>
                  <div><h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{currentUserName || "GUEST PILOT"}</h3><p className="text-cyan-400 font-bold tracking-widest mt-1">{user?.email || "디스코드 로그인이 필요합니다"}</p></div>
               </div>
               <div className="flex items-center justify-between border-b border-white/10 pb-8">
                 <div className="flex-1">
                   <div className="flex justify-between items-center mb-2"><h4 className="text-xl font-black text-white tracking-widest cursor-default" onMouseEnter={() => playSFX('hover')}>배경음악 (BGM)</h4><div onClick={() => { playSFX('click'); setBgmEnabled(!bgmEnabled); }} className={`w-14 h-7 rounded-full relative cursor-pointer transition-all ${bgmEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${bgmEnabled ? 'right-1' : 'left-1'}`}></div></div></div>
                   <p className="text-sm text-slate-400 font-bold mb-4 cursor-default">로비 및 대기 화면의 배경음악을 재생합니다.</p>
                   <div className="flex items-center gap-4"><span className="text-xs font-black text-slate-500">0</span><input type="range" min="0" max="1" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-2 rounded-lg cursor-pointer volume-slider" disabled={!bgmEnabled} onMouseEnter={() => playSFX('hover')}/><span className="text-xs font-black text-cyan-400 w-8 text-right">{Math.round(bgmVolume * 100)}</span></div>
                 </div>
               </div>
               <div className="flex items-center justify-between border-b border-white/10 pb-8">
                 <div className="flex-1">
                   <div className="flex justify-between items-center mb-2"><h4 className="text-xl font-black text-white tracking-widest cursor-default" onMouseEnter={() => playSFX('hover')}>효과음 (SFX)</h4><div onClick={() => { playSFX('click'); setSfxEnabled(!sfxEnabled); }} className={`w-14 h-7 rounded-full relative cursor-pointer transition-all ${sfxEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${sfxEnabled ? 'right-1' : 'left-1'}`}></div></div></div>
                   <p className="text-sm text-slate-400 font-bold mb-4 cursor-default">버튼 클릭 및 매칭 시 효과음을 재생합니다.</p>
                   <div className="flex items-center gap-4"><span className="text-xs font-black text-slate-500">0</span><input type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-2 rounded-lg cursor-pointer volume-slider" disabled={!sfxEnabled} onMouseEnter={() => playSFX('hover')}/><span className="text-xs font-black text-cyan-400 w-8 text-right">{Math.round(sfxVolume * 100)}</span></div>
                 </div>
               </div>
               <div className="flex items-center justify-between border-b border-white/10 pb-8">
                 <div className="flex-1">
                   <div className="flex justify-between items-center mb-2"><h4 className="text-xl font-black text-white tracking-widest cursor-default" onMouseEnter={() => playSFX('hover')}>배경 애니메이션 (VFX)</h4><div onClick={() => { playSFX('click'); setVfxEnabled(!vfxEnabled); }} className={`w-14 h-7 rounded-full relative cursor-pointer transition-all ${vfxEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${vfxEnabled ? 'right-1' : 'left-1'}`}></div></div></div>
                   <p className="text-sm text-slate-400 font-bold mt-2 cursor-default">1위 유저 변경 시 나타나는 우주 혜성 이펙트를 표시합니다.</p>
                 </div>
               </div>
               <div className="flex items-center justify-between">
                 <div className="cursor-default" onMouseEnter={() => playSFX('hover')}><h4 className="text-xl font-black text-pink-400 tracking-widest">디스코드 연동 동기화</h4><p className="text-sm text-slate-400 font-bold mt-2">디스코드 닉네임과 프로필 사진을 강제로 다시 불러옵니다.</p></div>
                 <button onMouseEnter={() => playSFX('hover')} onClick={() => playSFX('click')} className="px-8 py-3 bg-white/10 border-2 border-pink-500/50 hover:bg-pink-500 text-pink-400 hover:text-white rounded-full font-black tracking-widest transition-all cursor-pointer">SYNC NOW</button>
               </div>
               <div className="mt-12 pt-8 flex flex-col items-center justify-center opacity-80 cursor-default pointer-events-none">
                 <p className="text-[10px] text-slate-500 font-black tracking-[0.5em] mb-2 uppercase">System Architect & Designed By</p><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] italic">CONYMON</h1><p className="text-[8px] text-slate-600 tracking-widest mt-2">© 2026 GALAXY THRONE. ALL RIGHTS RESERVED.</p>
               </div>
            </div>
          </main>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300 cursor-pointer" onClick={() => { playSFX('click'); setSelectedPlayer(null); }}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-2xl rounded-[4rem] p-12 shadow-[0_0_50px_rgba(34,211,238,0.3)] relative overflow-hidden cursor-default" onClick={(e) => e.stopPropagation()} onMouseEnter={() => playSFX('hover')}>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(null); }} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors cursor-pointer z-50"><X size={36}/></button>
             <div className="flex items-center gap-10 mb-10 relative z-10 cursor-default">
                <img src={selectedPlayer.avatar_url} className={`w-32 h-32 rounded-[2.5rem] border-4 ${selectedPlayer.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_30px_gold]' : 'border-cyan-400 shadow-[0_0_20px_cyan]'} shrink-0`} alt="profile" />
                <div className="flex-1 overflow-hidden">
                   <h2 className="text-5xl font-black text-white italic uppercase truncate w-full tracking-tighter text-left mb-2">{selectedPlayer.display_name}</h2>
                   <div className="flex gap-3">
                     <span className={`text-sm font-black px-6 py-1.5 rounded-full border border-white/20 inline-block text-left ${getGrandRankInfo(selectedPlayer.rankIndex)?.color || 'text-slate-300'} bg-white/10 uppercase tracking-widest`}>RANK: {getGrandRankInfo(selectedPlayer.rankIndex)?.title} {getGrandRankInfo(selectedPlayer.rankIndex)?.num}</span>
                     <span className="text-sm font-black px-6 py-1.5 rounded-full border border-white/10 inline-block text-slate-400 bg-white/5 tracking-widest select-text cursor-text">@{selectedPlayer.discord_id || selectedPlayer.id.substring(0,8)}</span>
                   </div>
                </div>
             </div>
             <div className="mb-6 relative z-10 flex justify-center cursor-default" onMouseEnter={() => playSFX('hover')}>
                 <div className={`px-8 py-3 rounded-full border-2 font-black tracking-widest text-lg shadow-lg ${selectedPlayer.rankIndex === 0 ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400 shadow-[0_0_15px_gold]' : 'bg-slate-800/50 border-slate-600 text-slate-300'}`}>{selectedPlayer.rankIndex === 0 ? '👑 왕좌 방어전 스택 : ' : '🛡️ 방어전 스택 : '} {selectedPlayer.defense_stack || 0}</div>
             </div>
             <div className="grid grid-cols-2 gap-6 mb-10 relative z-10 cursor-default">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center hover:border-cyan-400/50 transition-all" onMouseEnter={() => playSFX('hover')}><p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Match Record (W/L)</p><p className="text-4xl font-black text-white">{selectedPlayer.wins}승 {selectedPlayer.losses}패</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center hover:border-cyan-400/50 transition-all" onMouseEnter={() => playSFX('hover')}><p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Win Rate</p><p className="text-4xl font-black text-pink-400">{selectedPlayer.win_rate || "0.0%"}</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center hover:border-cyan-400/50 transition-all" onMouseEnter={() => playSFX('hover')}><p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Favorite Legend</p><p className="text-2xl font-black text-cyan-400 truncate px-2">{selectedPlayer.favorite_legend || "미선택"}</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner flex flex-col justify-center hover:border-cyan-400/50 transition-all" onMouseEnter={() => playSFX('hover')}><p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Favorite Weapon</p><p className="text-xl font-black text-cyan-400 truncate px-2">{selectedPlayer.favorite_weapon || "미선택"}</p></div>
             </div>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => copyDiscordId(selectedPlayer.id)} className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border-2 border-cyan-400/50 text-cyan-400 py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.2)] relative z-10 cursor-pointer">{copyStatus ? <Check size={24}/> : <Copy size={24}/>}{copyStatus ? 'ID COPIED!' : `COPY DISCORD ID`}</button>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.6); } .comet-path { position: absolute; width: 250%; height: 100%; top: -30%; left: -120%; transform: rotate(12deg); animation: comet-move 2.8s ease-in-out forwards; } .comet-head { position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%; top: 50%; right: 0; box-shadow: 0 0 30px 5px #fff; } .comet-tail { position: absolute; width: 800px; height: 4px; background: linear-gradient(to left, rgba(255,255,255,0.9), transparent); top: 52%; right: 4px; filter: blur(1px); } @keyframes comet-move { 0% { left: -120%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 120%; opacity: 0; } } optgroup { font-style: normal; font-weight: 900; background: #000; color: #fff; } option { background-color: #000; color: #fff; padding: 10px; } .combat-log-item { padding: 0.5rem 0.75rem; } .combat-log-item .nickname { font-size: 1.15rem; } .combat-log-item .details { font-size: 0.95rem; } .rank-item { padding: 0.5rem 0.75rem; } .rank-item .nickname { font-size: 1.25rem; } .volume-slider { -webkit-appearance: none; appearance: none; } .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #22d3ee; cursor: pointer; box-shadow: 0 0 10px #22d3ee; } .volume-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #22d3ee; cursor: pointer; box-shadow: 0 0 10px #22d3ee; border: none; }`}</style>
    </div>
  );
}

export default App;