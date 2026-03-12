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
// 🔊 오디오 파일 Import 
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

// 글로벌 사운드 매니저
let globalBgmEnabled = true;
let globalSfxEnabled = true;
let globalBgmVolume = 0.10;
let globalSfxVolume = 0.60;

const audioCache: Record<string, HTMLAudioElement> = {};
let isAudioUnlocked = false; 
let currentMatchPhase = 'idle'; 

const BASE_VOLUMES: Record<string, number> = { hover: 0.5, click: 1.0, match_start: 1.0, success: 1.0, error: 1.0 };

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
      audio.muted = false;
      if (key === 'bgm' && currentMatchPhase === 'idle' && globalBgmEnabled) { audio.play().catch(() => {}); } 
      else { const p = audio.play(); if (p !== undefined) { p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {}); } }
    });
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('focus', () => { Object.values(audioCache).forEach(audio => { audio.muted = false; }); });
  window.addEventListener('blur', () => { Object.values(audioCache).forEach(audio => { audio.muted = true; }); });
}

const playSFX = (type: string) => {
  if (!isAudioUnlocked || !audioCache[type]) return;
  if ((type === 'bgm' || type === 'waiting') && !globalBgmEnabled) return;
  if (type !== 'bgm' && type !== 'waiting' && !globalSfxEnabled) return;
  if (type !== 'bgm' && type !== 'waiting') audioCache[type].currentTime = 0;
  audioCache[type].play().catch(() => {});
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
  const [activeMatch, setActiveMatch] = useState<{ id: string, mode: string, opponent: string, legend: string, weapons: string[] } | null>(null);
  const [myReportedScore, setMyReportedScore] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]); 
  const [rankers, setRankers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [rankTab, setRankTab] = useState<number>(0);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.10);
  const [sfxVolume, setSfxVolume] = useState(0.60);

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
    if (matchPhase === 'idle') { if (globalBgmEnabled) playSFX('bgm'); } 
    else if (matchPhase === 'waiting') { if (globalBgmEnabled) playSFX('waiting'); } 
    return () => { audioCache['bgm']?.pause(); audioCache['waiting']?.pause(); };
  }, [matchPhase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) fetchProfile(session.user.id); });
    fetchData(); fetchRankers(); 
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserName || matchPhase !== 'waiting') return;
    const channel = supabase.channel('challenges_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, payload => {
        const newChallenge = payload.new;
        if (newChallenge.challenger_name.trim() === entryOpponent.trim() && newChallenge.target_name.trim() === currentUserName.trim()) {
          playSFX('match_start');
          setActiveMatch({ id: newChallenge.id, mode: newChallenge.mode, opponent: entryOpponent.trim(), legend: entryMode === 'random' ? newChallenge.legend : entryLegend, weapons: entryMode === 'random' ? newChallenge.weapons : entryWeapons });
          setMatchPhase('ready');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchPhase, entryOpponent, currentUserName, entryMode, entryLegend, entryWeapons]);

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
        defense_stack: r.defense_stack || 0
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

  const handleStartMatch = async () => {
    if (!user || !currentUserName) { playSFX('error'); return alert("로그인이 필요합니다!"); }
    if (!entryOpponent.trim()) { playSFX('error'); return alert("상대방 닉네임을 정확히 입력하세요!"); }
    if (entryMode === 'free' && (!entryLegend || !entryWeapons[0] || !entryWeapons[1])) { playSFX('error'); return alert("레전드와 무기를 모두 선택해주세요!"); }
    if (entryOpponent.trim() === currentUserName.trim()) { playSFX('error'); return alert("자기 자신에게는 도전할 수 없습니다!"); }
    playSFX('click');
    const { data: existing } = await supabase.from('challenges').select('*').eq('challenger_name', entryOpponent.trim()).eq('target_name', currentUserName.trim()).limit(1).maybeSingle();
    if (existing) {
      playSFX('match_start');
      setActiveMatch({ id: existing.id, mode: entryMode, opponent: entryOpponent.trim(), legend: entryMode === 'random' ? existing.legend : entryLegend, weapons: entryMode === 'random' ? existing.weapons : entryWeapons });
      setMatchPhase('ready');
    }
    const randL = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
    const randW = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
    await supabase.from('challenges').insert([{ challenger_name: currentUserName.trim(), target_name: entryOpponent.trim(), mode: entryMode, legend: entryMode === 'random' ? randL : entryLegend, weapons: entryMode === 'random' ? randW : entryWeapons }]);
    if (!existing) setMatchPhase('waiting');
    setMyReportedScore(null);
  };

  const handleCancelMatch = async () => {
    playSFX('click');
    await supabase.from('challenges').delete().eq('challenger_name', currentUserName.trim());
    setMatchPhase('idle'); setActiveMatch(null);
  };

  const handleReportScore = async () => {
    if (myReportedScore === null || !activeMatch) return;
    playSFX('success'); 
    const winnerName = myReportedScore === 3 ? currentUserName : activeMatch.opponent;
    const winnerRankNum = rankers.findIndex(r => r.display_name === winnerName) + 1 || 99;
    const { error } = await supabase.from('matches').insert([{ match_type: activeMatch.mode, left_player_name: currentUserName, right_player_name: activeMatch.opponent, left_legend: activeMatch.legend, left_weapons: activeMatch.weapons, score_left: myReportedScore, score_right: 3 - myReportedScore, winner_name: winnerName, winner_rank_num: winnerRankNum }]);
    if (!error) { 
      await supabase.from('challenges').delete().filter('challenger_name', 'in', `("${currentUserName.trim()}","${activeMatch.opponent.trim()}")`);
      alert("전투 보고 완료!"); setMatchPhase('idle'); setActiveMatch(null); setEntryOpponent(''); setEntryLegend(''); setEntryWeapons(['', '']); fetchData(); fetchRankers(); 
    } else { playSFX('error'); alert(`에러 발생: ${error.message}`); }
  };

  const copyPlayerName = (name: string) => {
    if (!name) return;
    playSFX('click'); navigator.clipboard.writeText(name); setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const getGrandRankInfo = (idx: number) => {
    if (idx === 0) return { title: "왕좌", num: 1, color: "text-yellow-400", glow: "shadow-[0_0_20px_rgba(250,204,21,0.6)]", bg: "bg-yellow-400/20", icon: <Crown size={18} className="text-yellow-400 animate-pulse"/> };
    if (idx < 6) return { title: "성좌", num: idx + 1, color: "text-purple-400", glow: "shadow-[0_0_15px_rgba(192,132,252,0.5)]", bg: "bg-purple-400/20", icon: <Star size={14} className="text-purple-400"/> };
    if (idx < 12) return { title: "항성", num: idx - 5, color: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(34,211,238,0.3)]", bg: "bg-cyan-400/20", icon: <Zap size={14} className="text-cyan-400"/> };
    return { title: "정예", num: idx - 11, color: "text-slate-500", glow: "", bg: "bg-slate-500/20", icon: <Shield size={14} className="text-slate-500"/> };
  };

  const renderCombatLogItem = (log: any, index: number) => {
    const isLeftWinner = log.winner_name === log.left_player_name;
    const winnerName = isLeftWinner ? log.left_player_name : log.right_player_name;
    const loserName = isLeftWinner ? log.right_player_name : log.left_player_name;
    const winnerAvatar = getAvatarFallback(winnerName, rankers);
    const loserAvatar = getAvatarFallback(loserName, rankers);
    return (
      <div key={index} className="bg-black/60 border border-cyan-500/30 p-5 rounded-[1.5rem] flex flex-col justify-center gap-3 relative h-[140px] shrink-0">
        <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl rounded-tr-[1.5rem] ${log.match_type === 'free' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-black'}`}>{log.match_type} MATCH</div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1 overflow-hidden pr-2">
             <div className="relative shrink-0"><span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-black text-[8px] font-black px-1 rounded z-10">WIN</span><img src={winnerAvatar} className="w-10 h-10 rounded-full border-2 border-yellow-400 bg-black" alt="winner"/></div>
             <span className="font-black text-white text-xl truncate">{winnerName}</span><span className="text-[11px] text-slate-500 font-black mx-2">VS</span><img src={loserAvatar} className="w-8 h-8 rounded-full border-2 border-slate-600 opacity-60 bg-black" alt="loser"/><span className="font-bold text-slate-400 text-base truncate">{loserName}</span>
          </div>
          <div className="text-3xl font-black text-white shrink-0"><span className="text-yellow-400">{isLeftWinner ? log.score_left : log.score_right}</span><span className="text-slate-600 mx-1">:</span><span className="text-slate-400">{isLeftWinner ? log.score_right : log.score_left}</span></div>
        </div>
        <div className="flex items-center gap-2 text-xs font-black bg-white/5 px-4 py-2 rounded-xl w-fit border border-white/10"><span className="text-pink-400">[{log.left_legend || '미선택'}]</span><span className="text-cyan-300">{log.left_weapons?.[0] || '미선택'}</span><span className="text-slate-500">/</span><span className="text-cyan-300">{log.left_weapons?.[1] || '미선택'}</span></div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-black text-slate-300 font-sans overflow-hidden relative select-none">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }}><div className="absolute inset-0 bg-black/10"></div></div>
      <aside className="w-20 bg-black/20 backdrop-blur-md border-r border-cyan-500/30 shadow-2xl flex flex-col items-center py-10 gap-10 z-20 shrink-0 h-screen fixed left-0">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg cursor-pointer"><Star className="text-cyan-400 animate-pulse" size={24}/></div>
        <div className="flex flex-col gap-10 text-slate-500 w-full items-center">
          {MENU_ITEMS.map((item) => (<div key={item.id} onClick={() => { playSFX('click'); setActiveMenu(item.id); }} className={`cursor-pointer transition-all ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300'}`}><item.icon size={24}/></div>))}
        </div>
        <div className="mt-auto mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout}><LogOut size={24}/></div>
      </aside>
      <div className="flex-1 flex flex-col z-10 relative ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="px-10 py-8 flex justify-between items-center shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-6"><h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_purple]">은하단</h1><div className="h-12 w-[3px] bg-gradient-to-b from-cyan-400 to-purple-400 mx-3 shadow-lg"></div><div className="flex flex-col justify-center"><p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase tracking-widest">별의 전쟁 : 시즌 1</p><p className="text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.4em] mt-1.5 uppercase italic">SEASON 01 BATTLE FOR THE STAR THRONE</p></div></div>
          {user ? (
            <div onClick={handleLogout} className="flex items-center gap-4 bg-black/60 p-2 rounded-full border border-white/10 pr-8 border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all"><img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className="w-10 h-10 rounded-full" alt="profile"/><div className="flex flex-col"><span className="text-sm font-black text-white">{currentUserName || "GUEST"}</span><span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tighter">Logout</span></div></div>
          ) : (<button onClick={handleLogin} className="flex items-center gap-3 bg-cyan-600/20 border-2 border-cyan-400 py-2.5 px-8 rounded-full shadow-[0_0_20px_cyan] hover:bg-cyan-400 hover:text-black font-black text-sm cursor-pointer"><LogIn size={20}/> LOGIN</button>)}
        </header>

        {activeMenu === 'home' && (
          <main className="flex-1 p-10 grid grid-cols-12 gap-8 items-stretch pb-20 animate-in fade-in duration-500 min-h-[1400px]">
            <div className="col-span-12 xl:col-span-3 flex flex-col gap-8 h-full relative">
               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-xl rounded-[2.5rem] p-3 shrink-0 h-fit flex flex-col overflow-hidden relative">
                  <div className="flex flex-col relative z-10"><h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-2 border-b border-white/5 pb-2">매치 엔트리</h3>
                      <div className="space-y-3 flex flex-col pb-1">
                          <div className="flex gap-2 p-0.5 bg-black/50 rounded-2xl border border-white/5"><button onClick={() => { playSFX('click'); setEntryMode('free'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${entryMode === 'free' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500'}`}>자유대전</button><button onClick={() => { playSFX('click'); setEntryMode('random'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${entryMode === 'random' ? 'bg-cyan-600 text-black shadow-lg' : 'text-slate-500'}`}>랜덤대전</button></div>
                          <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black mb-1">Target Name</p><input value={entryOpponent} onChange={(e) => setEntryOpponent(e.target.value)} placeholder="상대방 닉네임" className="w-full bg-transparent outline-none text-white font-black text-lg select-text" /></div>
                          {entryMode === 'free' && (
                            <div className="space-y-2 flex flex-col">
                               <select value={entryLegend} onChange={(e) => setEntryLegend(e.target.value)} className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none text-white"><option value="" disabled hidden>👉 레전드 선택</option>{Object.entries(LEGEND_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={cat} className="bg-black text-cyan-400">{list.map(l => <option key={l} value={l} className="text-white">{l}</option>)}</optgroup>))}</select>
                               <div className="flex flex-col gap-2">{[0, 1].map(i => (<select key={i} value={entryWeapons[i]} onChange={(e) => {const w = [...entryWeapons]; w[i] = e.target.value; setEntryWeapons(w);}} className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none text-white"><option value="" disabled hidden>👉 {i+1}번 무기 선택</option>{Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={cat} className="bg-black text-pink-400">{list.map(w => <option key={w} value={w} className="text-white">{w}</option>)}</optgroup>))}</select>))}</div>
                            </div>
                          )}
                          <button onClick={handleStartMatch} className="w-full py-4 rounded-[1.5rem] font-black text-lg text-white bg-blue-600 shadow-lg hover:bg-blue-500 transition-all border border-white/10 cursor-pointer">대전 생성 (Entry)</button>
                      </div>
                  </div></section>

               <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 rounded-[2.5rem] p-4 flex flex-col overflow-hidden h-[880px] shrink-0 shadow-lg">
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 text-center mb-2 border-b border-white/5 pb-2 flex items-center justify-center gap-2"><span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-md"></span> 접속 현황</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                     {rankers.length > 0 ? rankers.map((ou, i) => {
                        const rankInfo = getGrandRankInfo(ou.rankIndex);
                        const currentUserRankNum = currentUserName ? rankers.findIndex(r => r.display_name === currentUserName) + 1 : 999;
                        const myIdx = currentUserRankNum - 1; const targetIdx = ou.rankIndex; let isChallengeableByRank = false;
                        if (myIdx > targetIdx) { if (targetIdx >= 12) isChallengeableByRank = true; else if (targetIdx >= 6) { if (myIdx <= 12 && (myIdx - targetIdx) <= 2) isChallengeableByRank = true; } else { if ((myIdx - targetIdx) === 1) isChallengeableByRank = true; } }
                        return (
                          <div key={i} className="bg-black/60 border border-white/10 p-3 rounded-xl flex items-center justify-between hover:border-cyan-400/50 transition-all group">
                             <div className="flex items-center gap-3"><div className="relative"><img src={ou.avatar_url} className="w-9 h-9 rounded-full border border-white/20" alt="profile"/><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div></div><div className="flex flex-col"><span className="text-sm font-black text-white truncate max-w-[90px]">{ou.display_name}</span><span className={`text-[9px] font-black uppercase ${rankInfo.color}`}>{rankInfo.title} {rankInfo.num}</span></div></div>
                             
                             {/* 🌟 [남철님 요청] 버튼 복구 및 닉네임 자동 입력 적용 */}
                             {ou.display_name.trim() === currentUserName?.trim() ? (
                                <div className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-600/20 border border-blue-500/50 text-blue-400">나</div>
                             ) : (
                                <button 
                                  onClick={() => { playSFX('click'); setEntryOpponent(ou.display_name); }}
                                  disabled={!isChallengeableByRank} 
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-md transition-all ${isChallengeableByRank ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black' : 'bg-slate-800/50 border border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                >
                                  {isChallengeableByRank ? '도전 가능' : '도전 불가'}
                                </button>
                             )}
                          </div>
                        )
                     }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">로그인 후 도전하세요!</div>)}
                  </div>
               </section>
            </div>

            <div className="col-span-12 xl:col-span-5 flex flex-col gap-8 h-full relative">
               <section className="bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-2xl rounded-[3rem] p-4 flex flex-col h-fit shrink-0 relative">
                  <div className="flex flex-col relative z-10"><h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-2 border-b border-white/5 pb-2">현재 매치 상황</h3>
                      {matchPhase === 'waiting' ? (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in"><div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8 shadow-lg"></div><h4 className="text-3xl font-black text-cyan-400 tracking-widest">교차 검증 중</h4><p className="text-sm text-slate-300 mt-4 text-center">상대방(<span className="text-pink-400">{entryOpponent}</span>)이 당신을 지목하여<br/>대전 생성을 누르는 순간 시작됩니다.</p><button onClick={handleCancelMatch} className="mt-10 px-10 py-3 rounded-full border-2 border-pink-500/50 text-pink-400 font-black hover:bg-pink-500 hover:text-white transition-all shadow-md cursor-pointer">매칭 취소 (Cancel)</button></div>
                      ) : matchPhase === 'idle' || !activeMatch ? (<div className="flex flex-col items-center justify-center opacity-10 py-20"><Shield size={100}/><p className="text-xl font-black uppercase tracking-[0.4em] mt-8">Ready for Combat</p></div>
                      ) : (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-3"><div className={`p-6 rounded-[2.5rem] border-2 shadow-2xl ${activeMatch.mode === 'random' ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-pink-400/50 bg-pink-400/5'} text-center flex flex-col justify-center`}><h4 className="text-6xl font-black text-white mb-6 drop-shadow-xl">{activeMatch.legend}</h4><div className="flex flex-col gap-3 items-center">{activeMatch.weapons.map((w:any, idx:number) => (<span key={idx} className={`px-6 py-2 rounded-2xl text-base font-black border-2 w-full max-w-[350px] ${activeMatch.mode === 'random' ? 'border-cyan-400/50 text-cyan-400' : 'border-pink-400/50 text-pink-400'}`}>{w}</span>))}</div></div><div className="text-center bg-black/40 p-4 rounded-[1.5rem] border border-white/10 shadow-inner"><p className="text-[10px] text-slate-500 font-black mb-1">Target Opponent</p><h4 className="text-5xl font-black text-white italic truncate">{activeMatch.opponent}</h4></div><div className="flex flex-col gap-3 pt-3 border-t border-white/5"><div className="flex justify-center gap-4">{[0, 1, 2, 3].map(num => (<button key={num} onClick={() => setMyReportedScore(num)} className={`w-14 h-14 rounded-3xl font-black text-2xl transition-all border-2 ${myReportedScore === num ? 'bg-cyan-500 border-white text-black scale-110 shadow-lg' : 'bg-black/60 border-white/10 text-white'}`}>{num}</button>))}</div><button onClick={handleReportScore} disabled={myReportedScore === null} className={`w-full py-4 rounded-[1.5rem] font-black text-xl transition-all uppercase ${myReportedScore !== null ? 'text-cyan-400 border-2 border-cyan-400/50 shadow-md' : 'text-slate-500 border-2 border-slate-700 bg-slate-800/50 cursor-not-allowed'}`}>{myReportedScore !== null ? '전투 결과 입력' : '스코어 선택'}</button></div></div>
                      )}
                  </div></section>
               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-xl rounded-[2.5rem] p-6 flex flex-col h-[940px] shrink-0 overflow-hidden"><h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 border-b border-white/5 pb-2">최근 전투 기록</h3><div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">{logs.length > 0 ? logs.slice(0, 5).map((log, i) => renderCombatLogItem(log, i)) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">전투 기록이 없습니다</div>)}</div></section>
            </div>
            <div className="col-span-12 lg:col-span-4 flex flex-col h-full relative">
               <section className="bg-black/40 backdrop-blur-3xl border-2 border-cyan-400 shadow-xl rounded-[3.5rem] p-5 flex flex-col h-fit shrink-0 relative">
                  <div className="px-2 pt-2 flex flex-col relative z-10">
                      <div className="flex flex-col items-start mb-4 mt-1">
                          <div className="flex items-center gap-6 mb-1"><Trophy className="text-yellow-400 drop-shadow-lg" size={80}/><div className="flex flex-col"><h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter pt-1">은하단 랭킹</h3><p className="text-sm font-black text-cyan-400 italic pt-1 uppercase">명예의 전당 (HALL OF FAME)</p></div></div>
                      </div>
                      {/* 🌟 [남철님 요청] 상단 여백 추가로 테두리 잘림 해결 */}
                      <div className="overflow-y-auto space-y-5 custom-scrollbar pr-3 pb-2 pt-6 min-h-[200px]">
                         {rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).filter(r => { if (rankTab === 0) return r.rankIndex < 6; if (rankTab === 1) return r.rankIndex >= 6 && r.rankIndex < 12; return r.rankIndex >= 12; }).map((r) => {
                              const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                              return (
                                <div key={r.id} onClick={() => { playSFX('click'); setSelectedPlayer(r); }} className={`mx-2 p-4 pt-10 rounded-[1.5rem] border transition-all cursor-pointer group bg-black/60 relative flex flex-col justify-center hover:scale-[1.02] ${grandRank.glow} border-cyan-400/30 hover:border-cyan-400`}>
                                   {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[1.5rem]"></div>}
                                   
                                   {/* 🌟 [남철님 요청] 계급 표시 크기 확대 및 디자인 개선 */}
                                   <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-5 py-1 rounded-b-xl border-x border-b border-cyan-400/30 ${grandRank.bg} flex items-center gap-2 shadow-lg z-20`}>
                                       {grandRank.icon} <span className={`text-[12px] font-black uppercase tracking-widest ${grandRank.color}`}>{grandRank.title} {grandRank.num}</span>
                                   </div>
                                   
                                   <div className="flex items-center justify-between w-full mt-3 px-2">
                                      <div className="flex items-center gap-5 flex-1 overflow-hidden">
                                         <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-md' : 'border-white/20'}`} alt="p"/>
                                         <span className={`text-white font-black truncate group-hover:text-cyan-400 transition-colors ${r.rankIndex === 0 ? 'text-3xl' : 'text-2xl'}`}>{r.display_name}</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                         <span className="font-black text-slate-300 text-xl">{r.wins}승 {r.losses}패</span>
                                         {r.rankIndex === 0 && (<span className="font-black text-[11px] px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/50">👑 방어전: {r.defense_stack || 0}</span>)}
                                      </div>
                                   </div>
                                </div>
                              );
                           }) : (<div className="flex items-center justify-center h-[500px] opacity-50 text-cyan-400">랭커가 없습니다</div>)}
                      </div>
                      <div className="flex gap-2 px-1 mt-6 mb-1"><button onClick={() => setRankTab(0)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${rankTab === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500'}`}>왕좌·성좌</button><button onClick={() => setRankTab(1)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${rankTab === 1 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500'}`}>항성 (1~6)</button><button onClick={() => setRankTab(2)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${rankTab === 2 ? 'bg-slate-500/20 text-slate-300 border-slate-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500'}`}>정예</button></div>
                      <div className="relative px-1 mt-3 mb-1"><Search className="absolute left-6 top-4.5 text-slate-500" size={18}/><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색..." className="w-full bg-white/5 border border-white/10 pl-16 pr-8 py-4 rounded-full text-sm outline-none focus:border-cyan-400 text-white select-text"/></div>
                  </div></section>
            </div>
          </main>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300 cursor-pointer" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <button onClick={() => setSelectedPlayer(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={36}/></button>
             <div className="flex items-center gap-10 mb-10">
                <img src={selectedPlayer.avatar_url} className={`w-32 h-32 rounded-[2.5rem] border-4 ${selectedPlayer.rankIndex === 0 ? 'border-yellow-400 shadow-lg' : 'border-cyan-400 shadow-md'}`} alt="p" />
                <div className="flex-1 overflow-hidden">
                   <h2 className="text-5xl font-black text-white italic truncate tracking-tighter">{selectedPlayer.display_name}</h2>
                   <div className="flex gap-3">
                     <span className={`text-sm font-black px-6 py-1.5 rounded-full border border-white/20 ${getGrandRankInfo(selectedPlayer.rankIndex)?.color || 'text-slate-300'} bg-white/10 uppercase`}>RANK: {getGrandRankInfo(selectedPlayer.rankIndex)?.title} {getGrandRankInfo(selectedPlayer.rankIndex)?.num}</span>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">RECORD (W/L)</p><p className="text-4xl font-black text-white">{selectedPlayer.wins}승 {selectedPlayer.losses}패</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">WIN RATE</p><p className="text-4xl font-black text-pink-400">{selectedPlayer.win_rate || "0.0%"}</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">FAVORITE LEGEND</p><p className="text-2xl font-black text-cyan-400 truncate">{selectedPlayer.favorite_legend || "미선택"}</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">FAVORITE WEAPON</p><p className="text-xl font-black text-cyan-400 truncate">{selectedPlayer.favorite_weapon || "미선택"}</p></div>
             </div>
             <button onClick={() => copyPlayerName(selectedPlayer.display_name)} className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border-2 border-cyan-400/50 text-cyan-400 py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 active:scale-95 shadow-lg">{copyStatus ? <Check size={24}/> : <Copy size={24}/>}{copyStatus ? 'NICKNAME COPIED!' : `COPY NICKNAME`}</button>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; } optgroup { font-style: normal; font-weight: 900; background: #000; color: #fff; } option { background-color: #000; color: #fff; padding: 10px; }`}</style>
    </div>
  );
}

export default App;