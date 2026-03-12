import React, { useEffect, useState, useRef } from 'react';
import { 
  Calendar, Users, Target, Swords, Zap, Crown, Activity, LogIn, LogOut, 
  Search, ChevronDown, ChevronUp, Copy, Check, Shield, RefreshCw, Flame, 
  Lock, Unlock, BarChart3, TrendingUp, X, Trophy, PieChart, Home, User, Settings, Bell, Star
} from 'lucide-react';
import { supabase } from './supabase';

// @ts-ignore
import bgImage from './assets/bg.png'; 
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

const getLegendCategoryColorHex = (cat: string) => {
  switch (cat) {
    case "어설트": return "#ff4d4d";
    case "스커미셔": return "#ffcc00";
    case "리콘": return "#b14fff";
    case "서포트": return "#00d2ff";
    case "컨트롤러": return "#3aff00";
    default: return "#ffffff";
  }
};

const WEAPON_CATEGORIES = {
  "에너지": ["RE-45 버스트", "하복 라이플", "네메시스 버스트 AR", "볼트 SMG", "L-STAR EMG", "디보션", "트리플 테이크"],
  "경량": ["p2020 x 1", "p2020 x 2", "R-301 카빈", "R-99 SMG", "얼터네이터 SMG", "M600 스핏파이어", "G7 스카우트"],
  "중량": ["VK-47 플랫라인", "햄록 버스트 AR", "프라울러 PDW", "C.A.R. SMG", "램페이지 LMG", "30-30 리피터"],
  "샷건 쉘": ["모잠비크 x 1", "모잠비크 x 2", "EVA-8 자동", "마스티프", "피스키퍼"],
  "스나이퍼": ["윙맨", "보섹 컴파운드 보우", "롱보우 DMR", "센티넬", "차지 라이플"],
  "특수 무기": ["투척 나이프", "크레이버 .50구경 저격총"]
};

const ALL_LEGENDS = Object.values(LEGEND_CATEGORIES).flat();
const ALL_WEAPONS = Object.values(WEAPON_CATEGORIES).flat();

const getWeaponCategoryColorHex = (cat: string) => {
  switch (cat) {
    case "에너지": return "#94b11f"; 
    case "경량": return "#ff8a00";   
    case "중량": return "#1e7e6e";   
    case "샷건 쉘": return "#da2115"; 
    case "스나이퍼": return "#4e4fb1"; 
    case "특수 무기": return "#ffcc00"; 
    default: return "#ffffff";
  }
};

const getAvatarFallback = (name: string | undefined | null, rankers: any[]) => {
  const safeName = name || 'GUEST';
  const ranker = rankers.find((r: any) => r.display_name === safeName);
  return ranker?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

const getNicknameFontSize = (name: string, isTopRank: boolean) => {
  const len = name.length;
  if (isTopRank) {
    if (len > 12) return 'text-2xl';
    if (len > 8) return 'text-3xl';
    return 'text-5xl';
  }
  if (len > 12) return 'text-base';
  if (len > 8) return 'text-lg';
  return 'text-2xl';
};

let globalBgmEnabled = true;
let globalSfxEnabled = true;
let globalBgmVolume = 0.10;
let globalSfxVolume = 0.60;

const audioCache: Record<string, HTMLAudioElement> = {};
let isAudioUnlocked = false; 
let currentMatchPhase = 'idle'; 

if (typeof window !== 'undefined') {
  globalBgmVolume = parseFloat(localStorage.getItem('bgmVolume') || '0.10');
  globalSfxVolume = parseFloat(localStorage.getItem('sfxVolume') || '0.60');
  globalBgmEnabled = localStorage.getItem('bgmEnabled') !== 'false';

  const files: Record<string, string> = { bgm: bgmSfx, hover: hoverSfx, click: clickSfx, match_start: matchStartSfx, waiting: waitingSfx, success: successSfx, error: errorSfx };
  Object.entries(files).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto'; 
    if (key === 'bgm' || key === 'waiting') { audio.loop = true; audio.volume = globalBgmVolume; } 
    else { audio.volume = globalSfxVolume; }
    audioCache[key] = audio;
  });

  const unlockAudio = () => {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;
    Object.values(audioCache).forEach(audio => { audio.muted = false; });
    
    if (currentMatchPhase === 'idle' && globalBgmEnabled) {
      audioCache['bgm']?.play().catch(() => {});
    } else if (currentMatchPhase === 'waiting' && globalBgmEnabled) {
      audioCache['waiting']?.play().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('focus', () => { Object.values(audioCache).forEach(a => { a.muted = false; }); });
  window.addEventListener('blur', () => { Object.values(audioCache).forEach(a => { a.muted = true; }); });
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
  const [activeMatch, setActiveMatch] = useState<{ id: string, mode: string, opponent: string, legend: string, weapons: string[], isChallenger: boolean } | null>(null);
  
  const [myWins, setMyWins] = useState<number | null>(null);
  const [myLosses, setMyLosses] = useState<number | null>(null);
  const [waitingForScore, setWaitingForScore] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]); 
  const [rankers, setRankers] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [rankTab, setRankTab] = useState<number>(0);

  const [bgmEnabled, setBgmEnabled] = useState(localStorage.getItem('bgmEnabled') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('sfxEnabled') !== 'false');
  const [bgmVolume, setBgmVolume] = useState(parseFloat(localStorage.getItem('bgmVolume') || '0.10'));
  const [sfxVolume, setSfxVolume] = useState(parseFloat(localStorage.getItem('sfxVolume') || '0.60'));

  const currentUserName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const currentUserAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;

  useEffect(() => {
    globalBgmEnabled = bgmEnabled; globalSfxEnabled = sfxEnabled; globalBgmVolume = bgmVolume; globalSfxVolume = sfxVolume;
    localStorage.setItem('bgmEnabled', bgmEnabled.toString());
    localStorage.setItem('sfxEnabled', sfxEnabled.toString());
    localStorage.setItem('bgmVolume', bgmVolume.toString());
    localStorage.setItem('sfxVolume', sfxVolume.toString());
    if (audioCache['bgm']) { audioCache['bgm'].muted = !bgmEnabled; audioCache['bgm'].volume = bgmVolume; }
    if (audioCache['waiting']) { audioCache['waiting'].muted = !bgmEnabled; audioCache['waiting'].volume = bgmVolume; }
    ['hover', 'click', 'match_start', 'success', 'error'].forEach(k => {
      if (audioCache[k]) { audioCache[k].muted = !sfxEnabled; audioCache[k].volume = sfxVolume; }
    });
  }, [bgmEnabled, sfxEnabled, bgmVolume, sfxVolume]);

  useEffect(() => {
    currentMatchPhase = matchPhase;
    if (!isAudioUnlocked) return;
    if (matchPhase === 'idle') {
      audioCache['waiting']?.pause();
      if (globalBgmEnabled) audioCache['bgm']?.play().catch(()=>{});
    } else if (matchPhase === 'waiting') {
      audioCache['bgm']?.pause();
      if (globalBgmEnabled) {
        if(audioCache['waiting']) audioCache['waiting'].currentTime = 0;
        audioCache['waiting']?.play().catch(()=>{});
      }
    } else if (matchPhase === 'ready') {
      audioCache['bgm']?.pause();
      audioCache['waiting']?.pause();
    }
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
          setActiveMatch({ id: newChallenge.id, mode: newChallenge.mode, opponent: entryOpponent.trim(), legend: entryMode === 'random' ? newChallenge.legend : entryLegend, weapons: entryMode === 'random' ? newChallenge.weapons : entryWeapons, isChallenger: false });
          setMatchPhase('ready');
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchPhase, entryOpponent, currentUserName, entryMode, entryLegend, entryWeapons]);

  useEffect(() => {
    if (matchPhase !== 'ready' || !activeMatch) return;
    const channel = supabase.channel('score_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `id=eq.${activeMatch.id}` }, payload => {
         const updated = payload.new;
         if (updated.c_win === null && updated.t_win === null && waitingForScore) {
             playSFX('error'); alert("상대방과 입력한 스코어가 일치하지 않아 초기화되었습니다.\n다시 합의 후 정확히 입력해주세요!");
             setWaitingForScore(false); setMyWins(null); setMyLosses(null);
         }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'challenges', filter: `id=eq.${activeMatch.id}` }, payload => {
         playSFX('success'); alert("쌍방 스코어 일치! 전투 결과가 성공적으로 저장되었습니다.");
         setMatchPhase('idle'); setActiveMatch(null); setWaitingForScore(false); setMyWins(null); setMyLosses(null);
         setEntryOpponent(''); setEntryLegend(''); setEntryWeapons(['', '']); fetchData(); fetchRankers();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchPhase, activeMatch, waitingForScore]);

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
        defense_stack: r.defense_stack || 0
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

  const handleStartMatch = async () => {
    if (!user || !currentUserName) { playSFX('error'); return alert("로그인이 필요합니다!"); }
    if (!entryOpponent.trim()) { playSFX('error'); return alert("상대방 닉네임을 정확히 입력하세요!"); }
    if (entryMode === 'free' && (!entryLegend || !entryWeapons[0] || !entryWeapons[1])) { playSFX('error'); return alert("레전드와 무기를 모두 선택해주세요!"); }
    if (entryOpponent.trim() === currentUserName.trim()) { playSFX('error'); return alert("자기 자신에게는 도전할 수 없습니다!"); }
    playSFX('click');
    const { data: existing } = await supabase.from('challenges').select('*').eq('challenger_name', entryOpponent.trim()).eq('target_name', currentUserName.trim()).limit(1).maybeSingle();
    if (existing) {
      playSFX('match_start');
      setActiveMatch({ id: existing.id, mode: entryMode, opponent: entryOpponent.trim(), legend: entryMode === 'random' ? existing.legend : entryLegend, weapons: entryMode === 'random' ? existing.weapons : entryWeapons, isChallenger: false });
      setMatchPhase('ready');
    } else {
      const randL = ALL_LEGENDS[Math.floor(Math.random() * ALL_LEGENDS.length)];
      const randW = [...ALL_WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 2);
      const { data: newChall } = await supabase.from('challenges').insert([{ challenger_name: currentUserName.trim(), target_name: entryOpponent.trim(), mode: entryMode, legend: entryMode === 'random' ? randL : entryLegend, weapons: entryMode === 'random' ? randW : entryWeapons }]).select().single();
      if (newChall) setActiveMatch({ id: newChall.id, mode: entryMode, opponent: entryOpponent.trim(), legend: entryMode === 'random' ? randL : entryLegend, weapons: entryMode === 'random' ? randW : entryWeapons, isChallenger: true });
      setMatchPhase('waiting');
    }
  };

  const handleCancelMatch = async () => {
    playSFX('click');
    await supabase.from('challenges').delete().eq('challenger_name', currentUserName.trim());
    setMatchPhase('idle'); setActiveMatch(null);
  };

  const handleReportScore = async () => {
    if (myWins === null || myLosses === null || !activeMatch) { playSFX('error'); return alert("승리 및 패배 횟수를 모두 선택하세요!"); }
    playSFX('click'); 
    const isC = activeMatch.isChallenger;
    const updatePayload = isC ? { c_win: myWins, c_lose: myLosses } : { t_win: myWins, t_lose: myLosses };
    await supabase.from('challenges').update(updatePayload).eq('id', activeMatch.id);
    const { data: checkData } = await supabase.from('challenges').select('*').eq('id', activeMatch.id).single();
    if (!checkData) return;
    const oppW = isC ? checkData.t_win : checkData.c_win;
    const oppL = isC ? checkData.t_lose : checkData.c_lose;

    if (oppW !== null && oppL !== null) {
       if (myWins === oppL && myLosses === oppW) {
          const winnerName = myWins > myLosses ? currentUserName : activeMatch.opponent;
          const winnerRankNum = rankers.findIndex(r => r.display_name === winnerName) + 1 || 99;
          await supabase.from('matches').insert([{ match_type: activeMatch.mode, left_player_name: isC ? currentUserName : activeMatch.opponent, right_player_name: isC ? activeMatch.opponent : currentUserName, left_legend: activeMatch.legend, left_weapons: activeMatch.weapons, score_left: isC ? myWins : oppW, score_right: isC ? myLosses : oppL, winner_name: winnerName, winner_rank_num: winnerRankNum }]);
          await supabase.from('challenges').delete().eq('id', activeMatch.id);
       } else {
          await supabase.from('challenges').update({ c_win: null, c_lose: null, t_win: null, t_lose: null }).eq('id', activeMatch.id);
          playSFX('error'); alert(`스코어가 일치하지 않습니다!\n(상대방 입력 -> 승:${oppW} 패:${oppL})\n상대방과 확인 후 다시 입력해주세요.`);
          setWaitingForScore(false); setMyWins(null); setMyLosses(null);
       }
    } else { setWaitingForScore(true); }
  };

  const copyPlayerName = (name: string) => {
    if (!name) return; playSFX('click'); navigator.clipboard.writeText(name); setCopyStatus(true); setTimeout(() => setCopyStatus(false), 2000);
  };

  const getGrandRankInfo = (idx: number) => {
    if (idx === 0) return { title: "왕좌", num: 1, color: "text-yellow-400", glow: "shadow-[0_0_20px_rgba(250,204,21,0.6)]", bg: "bg-yellow-400/20", icon: <Crown size={22} className="text-yellow-400 animate-pulse"/> };
    if (idx < 6) return { title: "성좌", num: idx + 1, color: "text-purple-400", glow: "shadow-[0_0_15px_rgba(192,132,252,0.5)]", bg: "bg-purple-400/20", icon: <Star size={18} className="text-purple-400"/> };
    if (idx < 12) return { title: "항성", num: idx - 5, color: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(34,211,238,0.3)]", bg: "bg-cyan-400/20", icon: <Zap size={18} className="text-cyan-400"/> };
    return { title: "정예", num: idx - 11, color: "text-slate-500", glow: "", bg: "bg-slate-500/20", icon: <Shield size={18} className="text-slate-500"/> };
  };

  const renderCombatLogItem = (log: any, index: number) => {
    const isLeftWinner = log.winner_name === log.left_player_name;
    const winnerName = isLeftWinner ? log.left_player_name : log.right_player_name;
    const loserName = isLeftWinner ? log.right_player_name : log.left_player_name;
    const winnerAvatar = getAvatarFallback(winnerName, rankers);
    const loserAvatar = getAvatarFallback(loserName, rankers);
    return (
      <div key={index} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-cyan-500/30 p-5 rounded-[1.5rem] flex flex-col justify-center gap-3 relative h-[140px] shrink-0">
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
        <div onMouseEnter={() => playSFX('hover')} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg cursor-pointer"><Star className="text-cyan-400 animate-pulse" size={24}/></div>
        <div className="flex flex-col gap-10 text-slate-500 w-full items-center">
          {MENU_ITEMS.map((item) => (
            <div key={item.id} title={item.label} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setActiveMenu(item.id); }} className={`cursor-pointer transition-all ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300'}`}><item.icon size={24}/></div>
          ))}
        </div>
        <div onMouseEnter={() => playSFX('hover')} className="mt-auto mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout}><LogOut size={24}/></div>
      </aside>

      <div className="flex-1 flex flex-col z-10 relative ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="px-10 py-8 flex justify-between items-center shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md">
          <div onMouseEnter={() => playSFX('hover')} className="flex items-center gap-6"><h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_purple]">은하단</h1><div className="h-12 w-[3px] bg-gradient-to-b from-cyan-400 to-purple-400 mx-3 shadow-lg"></div><div className="flex flex-col justify-center"><p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase tracking-widest">별의 전쟁 : 시즌 1</p><p className="text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.4em] mt-1.5 uppercase italic">SEASON 01 BATTLE FOR THE STAR THRONE</p></div></div>
          {user ? (
            <div onMouseEnter={() => playSFX('hover')} onClick={handleLogout} className="flex items-center gap-4 bg-black/60 p-2 rounded-full border border-white/10 pr-8 border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all"><img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className="w-10 h-10 rounded-full" alt="profile"/><div className="flex flex-col"><span className="text-sm font-black text-white">{currentUserName || "GUEST"}</span><span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tighter">Logout</span></div></div>
          ) : (<button onMouseEnter={() => playSFX('hover')} onClick={handleLogin} className="flex items-center gap-3 bg-cyan-600/20 border-2 border-cyan-400 py-2.5 px-8 rounded-full shadow-[0_0_20px_cyan] hover:bg-cyan-400 hover:text-black font-black text-sm cursor-pointer"><LogIn size={20}/> LOGIN</button>)}
        </header>

        {activeMenu === 'home' && (
          <main className="flex-1 p-10 grid grid-cols-12 gap-8 items-stretch pb-20 animate-in fade-in duration-500 min-h-[1400px]">
            <div className="col-span-12 xl:col-span-3 flex flex-col gap-8 h-full relative">
               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-xl rounded-[2.5rem] p-3 shrink-0 h-fit flex flex-col overflow-hidden relative">
                  <div className="flex flex-col relative z-10"><h3 onMouseEnter={() => playSFX('hover')} className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-2 border-b border-white/5 pb-2">매치 엔트리</h3>
                      <div className="space-y-3 flex flex-col pb-1">
                          <div className="flex gap-2 p-0.5 bg-black/50 rounded-2xl border border-white/5"><button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setEntryMode('free'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${entryMode === 'free' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500'}`}>자유대전</button><button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setEntryMode('random'); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${entryMode === 'random' ? 'bg-cyan-600 text-black shadow-lg' : 'text-slate-500'}`}>랜덤대전</button></div>
                          <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black mb-1">Target Name</p><input value={entryOpponent} onChange={(e) => setEntryOpponent(e.target.value)} placeholder="상대방 닉네임" className="w-full bg-transparent outline-none text-white font-black text-lg select-text" /></div>
                          {entryMode === 'free' && (
                            <div className="space-y-2 flex flex-col">
                               <select onMouseEnter={() => playSFX('hover')} value={entryLegend} onChange={(e) => { setEntryLegend(e.target.value); playSFX('click'); }} className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none text-white">
                                  <option value="" disabled hidden>👉 레전드 선택</option>
                                  {Object.entries(LEGEND_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={`■ ${cat}`} style={{color: getLegendCategoryColorHex(cat), backgroundColor: '#000'}}>{list.map(l => <option key={l} value={l} style={{color: '#fff'}}>{l}</option>)}</optgroup>))}
                               </select>
                               <div className="flex flex-col gap-2">{[0, 1].map(i => (
                                 <select key={i} onMouseEnter={() => playSFX('hover')} value={entryWeapons[i]} onChange={(e) => {const w = [...entryWeapons]; w[i] = e.target.value; setEntryWeapons(w); playSFX('click');}} className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-sm font-black outline-none text-white">
                                    <option value="" disabled hidden>👉 {i+1}번 무기 선택</option>
                                    {Object.entries(WEAPON_CATEGORIES).map(([cat, list]) => (<optgroup key={cat} label={`■ ${cat}`} style={{color: getWeaponCategoryColorHex(cat), backgroundColor: '#000'}}>{list.map(w => <option key={w} value={w} style={{color: '#fff'}}>{w}</option>)}</optgroup>))}
                                 </select>
                               ))}</div>
                            </div>
                          )}
                          <button onMouseEnter={() => playSFX('hover')} onClick={handleStartMatch} className="w-full py-4 rounded-[1.5rem] font-black text-lg text-white bg-blue-600 shadow-lg hover:bg-blue-500 transition-all border border-white/10 cursor-pointer">대전 생성 (Entry)</button>
                      </div>
                  </div></section>
               <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 rounded-[2.5rem] p-4 flex flex-col overflow-hidden h-[880px] shrink-0 shadow-lg">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 text-center mb-2 border-b border-white/5 pb-2 flex items-center justify-center gap-2"><span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-md"></span> 접속 현황</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                     {rankers.length > 0 ? rankers.map((ou, i) => {
                        const rankInfo = getGrandRankInfo(ou.rankIndex);
                        const currentUserRankNum = currentUserName ? rankers.findIndex(r => r.display_name === currentUserName) + 1 : 999;
                        const myIdx = currentUserRankNum - 1; const targetIdx = ou.rankIndex; let isChallengeableByRank = false;
                        if (myIdx > targetIdx) { if (targetIdx >= 12) isChallengeableByRank = true; else if (targetIdx >= 6) { if (myIdx <= 12 && (myIdx - targetIdx) <= 2) isChallengeableByRank = true; } else { if ((myIdx - targetIdx) === 1) isChallengeableByRank = true; } }
                        return (
                          <div key={i} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-white/10 p-3 rounded-xl flex items-center justify-between hover:border-cyan-400/50 transition-all group">
                             <div className="flex items-center gap-3"><div className="relative"><img src={ou.avatar_url} className="w-9 h-9 rounded-full border border-white/20" alt="profile"/><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div></div><div className="flex flex-col"><span className="text-sm font-black text-white truncate max-w-[90px]">{ou.display_name}</span><span className={`text-[9px] font-black uppercase ${rankInfo.color}`}>{rankInfo.title} {rankInfo.num}</span></div></div>
                             {ou.display_name.trim() === currentUserName?.trim() ? (
                                <div className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-600/20 border border-blue-500/50 text-blue-400">나</div>
                             ) : (
                                <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setEntryOpponent(ou.display_name); }} disabled={!isChallengeableByRank} className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-md transition-all cursor-pointer ${isChallengeableByRank ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black' : 'bg-slate-800/50 border border-slate-700 text-slate-500 cursor-not-allowed'}`}>{isChallengeableByRank ? '도전 가능' : '도전 불가'}</button>
                             )}
                          </div>
                        )
                     }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">로그인 후 도전하세요!</div>)}
                  </div>
               </section>
            </div>

            <div className="col-span-12 xl:col-span-5 flex flex-col gap-8 h-full relative">
               <section className="bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-2xl rounded-[3rem] p-4 flex flex-col h-fit shrink-0 relative">
                  <div className="flex flex-col relative z-10"><h3 onMouseEnter={() => playSFX('hover')} className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-2 border-b border-white/5 pb-2">현재 매치 상황</h3>
                      {matchPhase === 'waiting' ? (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in"><div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8 shadow-lg"></div><h4 className="text-3xl font-black text-cyan-400 tracking-widest">교차 검증 중</h4><p className="text-sm text-slate-300 mt-4 text-center">상대방(<span className="text-pink-400">{entryOpponent}</span>)이 당신을 지목하여<br/>대전 생성을 누르는 순간 시작됩니다.</p><button onMouseEnter={() => playSFX('hover')} onClick={handleCancelMatch} className="mt-10 px-10 py-3 rounded-full border-2 border-pink-500/50 text-pink-400 font-black hover:bg-pink-500 hover:text-white transition-all shadow-md cursor-pointer">매칭 취소 (Cancel)</button></div>
                      ) : matchPhase === 'idle' || !activeMatch ? (<div onMouseEnter={() => playSFX('hover')} className="flex flex-col items-center justify-center opacity-10 py-20"><Shield size={100}/><p className="text-xl font-black uppercase tracking-[0.4em] mt-8">Ready for Combat</p></div>
                      ) : (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-3"><div onMouseEnter={() => playSFX('hover')} className={`p-6 rounded-[2.5rem] border-2 shadow-2xl ${activeMatch.mode === 'random' ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-pink-400/50 bg-pink-400/5'} text-center flex flex-col justify-center`}><h4 className="text-6xl font-black text-white mb-6 drop-shadow-xl">{activeMatch.legend}</h4><div className="flex flex-col gap-3 items-center">{activeMatch.weapons.map((w:any, idx:number) => (<span key={idx} className={`px-6 py-2 rounded-2xl text-base font-black border-2 w-full max-w-[350px] ${activeMatch.mode === 'random' ? 'border-cyan-400/50 text-cyan-400' : 'border-pink-400/50 text-pink-400'}`}>{w}</span>))}</div></div><div onMouseEnter={() => playSFX('hover')} className="text-center bg-black/40 p-4 rounded-[1.5rem] border border-white/10 shadow-inner"><p className="text-[10px] text-slate-500 font-black mb-1">Target Opponent</p><h4 className="text-5xl font-black text-white italic truncate">{activeMatch.opponent}</h4></div>
                        <div className="flex flex-col gap-4 pt-3 border-t border-white/5">
                           <div className="flex items-center justify-between px-2"><span className="text-cyan-400 font-black text-lg tracking-widest">나의 승리</span><div className="flex gap-2">{[0, 1, 2, 3].map(num => (<button key={`w${num}`} onMouseEnter={() => playSFX('hover')} onClick={() => { setMyWins(num); playSFX('click'); }} className={`w-12 h-12 rounded-2xl font-black text-xl transition-all border-2 cursor-pointer ${myWins === num ? 'bg-cyan-500 border-white text-black shadow-[0_0_15px_cyan]' : 'bg-black/60 border-white/10 text-white'}`}>{num}</button>))}</div></div>
                           <div className="flex items-center justify-between px-2 mb-2"><span className="text-pink-400 font-black text-lg tracking-widest">나의 패배</span><div className="flex gap-2">{[0, 1, 2, 3].map(num => (<button key={`l${num}`} onMouseEnter={() => playSFX('hover')} onClick={() => { setMyLosses(num); playSFX('click'); }} className={`w-12 h-12 rounded-2xl font-black text-xl transition-all border-2 cursor-pointer ${myLosses === num ? 'bg-pink-500 border-white text-black shadow-[0_0_15px_pink]' : 'bg-black/60 border-white/10 text-white'}`}>{num}</button>))}</div></div>
                           <button onMouseEnter={() => playSFX('hover')} onClick={handleReportScore} disabled={myWins === null || myLosses === null || waitingForScore} className={`w-full py-4 rounded-[1.5rem] font-black text-xl transition-all uppercase ${waitingForScore ? 'text-yellow-400 border-2 border-yellow-400/50 cursor-wait animate-pulse' : (myWins !== null && myLosses !== null) ? 'text-cyan-400 border-2 border-cyan-400/50 shadow-md cursor-pointer hover:bg-cyan-500 hover:text-black' : 'text-slate-500 border-2 border-slate-700 bg-slate-800/50 cursor-not-allowed'}`}>{waitingForScore ? '상대방의 결과 입력을 대기중입니다...' : '결과 검증 및 제출'}</button>
                        </div></div>
                      )}
                  </div></section>
               <section className="bg-black/40 backdrop-blur-2xl border-2 border-cyan-400 shadow-xl rounded-[2.5rem] p-6 flex flex-col h-[940px] shrink-0 overflow-hidden"><h3 onMouseEnter={() => playSFX('hover')} className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 border-b border-white/5 pb-2">최근 전투 기록</h3><div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">{logs.length > 0 ? logs.slice(0, 10).map((log, i) => renderCombatLogItem(log, i)) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">전투 기록이 없습니다</div>)}</div></section>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col h-full relative">
               <section className="bg-black/40 backdrop-blur-3xl border-2 border-cyan-400 shadow-xl rounded-[3.5rem] p-5 flex flex-col h-fit shrink-0 relative">
                  <div className="px-2 pt-2 flex flex-col relative z-10">
                      <div onMouseEnter={() => playSFX('hover')} className="flex flex-col items-start mb-4 mt-1"><div className="flex items-center gap-6 mb-1"><Trophy className="text-yellow-400 drop-shadow-lg" size={80}/><div className="flex flex-col"><h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter pt-1">은하단 랭킹</h3><p className="text-sm font-black text-cyan-400 italic pt-1 uppercase">명예의 전당 (HALL OF FAME)</p></div></div></div>
                      <div className="overflow-y-auto space-y-2.5 custom-scrollbar pr-3 pb-2 pt-2 min-h-[200px]">
                         {rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).filter(r => { if (rankTab === 0) return r.rankIndex < 6; if (rankTab === 1) return r.rankIndex >= 6 && r.rankIndex < 12; return r.rankIndex >= 12; }).map((r) => {
                              const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                              return (
                                <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); }} className={`mx-2 p-3 pt-10 pb-4 rounded-[1.5rem] border transition-all cursor-pointer group bg-black/60 relative flex flex-col justify-center hover:scale-[1.01] ${grandRank.glow} border-cyan-400/30 hover:border-cyan-400`}>
                                   {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[1.5rem]"></div>}
                                   <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full border border-cyan-400/30 ${grandRank.bg} flex items-center gap-2 shadow-lg z-20`}>{grandRank.icon} <span className={`text-[15px] font-black uppercase tracking-widest ${grandRank.color}`}>{grandRank.title} {grandRank.num}</span></div>
                                   <div className="flex items-center justify-between w-full mt-2 px-1 relative z-10"><div className="flex items-center gap-4 flex-1 overflow-hidden"><img src={r.avatar_url} className={`w-11 h-11 rounded-full border-2 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-md' : 'border-white/20'}`} alt="p"/><span className={`text-white font-black truncate group-hover:text-cyan-400 transition-colors ${getNicknameFontSize(r.display_name, r.rankIndex === 0)}`}>{r.display_name}</span></div><div className="flex flex-col items-end"><span className="font-black text-slate-300 text-lg tracking-tight">{r.wins}승 {r.losses}패</span>{r.rankIndex === 0 && (<span className="font-black text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 mt-0.5">👑 방어전: {r.defense_stack || 0}</span>)}</div></div>
                                </div>
                              );
                           }) : (<div className="flex items-center justify-center h-[500px] opacity-50 text-cyan-400">랭커가 없습니다</div>)}
                      </div>
                      <div className="flex gap-2 px-1 mt-4 mb-1"><button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(0); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>왕좌·성좌</button><button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(1); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 1 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>항성 (1~6)</button><button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(2); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border cursor-pointer ${rankTab === 2 ? 'bg-slate-500/20 text-slate-300 border-slate-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>정예</button></div>
                      <div className="relative px-1 mt-3 mb-1"><Search className="absolute left-6 top-4.5 text-slate-500" size={18}/><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색..." className="w-full bg-white/5 border border-white/10 pl-16 pr-8 py-4 rounded-full text-sm outline-none focus:border-cyan-400 text-white select-text"/></div>
                  </div></section>
            </div>
          </main>
        )}

        {/* 🌟 명예의 전당 전용 웅장한 피라미드 페이지 (독립 탭) */}
        {activeMenu === 'ranking' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto flex flex-col h-full relative">
               <div onMouseEnter={() => playSFX('hover')} className="flex items-center gap-6 mb-10 cursor-default">
                  <Trophy className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" size={100}/>
                  <div className="flex flex-col">
                      <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter pt-1">은하단 랭킹</h3>
                      <p className="text-xl font-black text-cyan-400 italic pt-2 uppercase">명예의 전당 (HALL OF FAME)</p>
                  </div>
               </div>
               
               <div className="flex gap-4 mb-8">
                 <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(0); }} className={`px-8 py-4 rounded-xl text-sm font-black transition-all border cursor-pointer ${rankTab === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>👑 왕좌·성좌</button>
                 <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(1); }} className={`px-8 py-4 rounded-xl text-sm font-black transition-all border cursor-pointer ${rankTab === 1 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>⚡ 항성 (1~6)</button>
                 <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(2); }} className={`px-8 py-4 rounded-xl text-sm font-black transition-all border cursor-pointer ${rankTab === 2 ? 'bg-slate-500/20 text-slate-300 border-slate-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🛡️ 정예</button>
                 <div className="relative ml-auto w-80">
                   <Search className="absolute left-6 top-4.5 text-slate-500" size={18}/>
                   <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-16 pr-8 py-4 rounded-full text-sm outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                 </div>
               </div>

               {/* 🌟 완벽한 피라미드 및 계급별 레이아웃 (12 Grid) */}
               <div className="grid grid-cols-12 gap-6 pb-20 justify-center">
                  {rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).filter(r => { if (rankTab === 0) return r.rankIndex < 6; if (rankTab === 1) return r.rankIndex >= 6 && r.rankIndex < 12; return r.rankIndex >= 12; }).map((r, i) => {
                       const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                       
                       const isRank1 = r.rankIndex === 0;
                       const isRank2_3 = r.rankIndex === 1 || r.rankIndex === 2;
                       const isRank4_6 = r.rankIndex >= 3 && r.rankIndex <= 5;
                       
                       let spanClass = "col-span-6";
                       let cardClass = "p-6 pt-12 pb-6 rounded-[2rem]";
                       let badgeClass = "top-4 px-8 py-2 text-[16px]";
                       let avatarClass = "w-16 h-16";
                       let nameSize = getNicknameFontSize(r.display_name, false);
                       let statSize = "text-2xl";

                       if (rankTab === 0) {
                           if (isRank1) {
                               spanClass = "col-span-12 flex justify-center";
                               cardClass = "w-full max-w-4xl p-8 pt-14 pb-8 rounded-[3rem] shadow-[0_0_40px_rgba(250,204,21,0.3)] hover:scale-[1.03]";
                               badgeClass = "top-5 px-10 py-3 text-[22px]";
                               avatarClass = "w-24 h-24";
                               nameSize = getNicknameFontSize(r.display_name, true);
                               statSize = "text-4xl";
                           } else if (isRank2_3) {
                               spanClass = "col-span-6";
                           } else if (isRank4_6) {
                               spanClass = "col-span-4";
                               cardClass = "p-5 pt-10 pb-5 rounded-[1.5rem]";
                               badgeClass = "top-3 px-6 py-1.5 text-[14px]";
                               avatarClass = "w-12 h-12";
                               statSize = "text-xl";
                           }
                       } else if (rankTab === 1) {
                           spanClass = "col-span-4";
                           cardClass = "p-5 pt-10 pb-5 rounded-[1.5rem]";
                           badgeClass = "top-3 px-6 py-1.5 text-[14px]";
                           avatarClass = "w-12 h-12";
                           statSize = "text-xl";
                       } else {
                           spanClass = "col-span-3";
                           cardClass = "p-4 pt-10 pb-4 rounded-xl";
                           badgeClass = "top-2.5 px-4 py-1 text-[12px]";
                           avatarClass = "w-10 h-10";
                           statSize = "text-lg";
                       }

                       return (
                         <div key={r.id} className={spanClass}>
                            <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); }} className={`${cardClass} border transition-all cursor-pointer group bg-black/60 relative flex flex-col justify-center ${grandRank.glow} border-cyan-400/30 hover:border-cyan-400 shadow-xl`}>
                               {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}
                               
                               <div className={`absolute ${badgeClass} left-1/2 -translate-x-1/2 rounded-full border border-cyan-400/30 ${grandRank.bg} flex items-center gap-2 shadow-lg z-20`}>
                                   {grandRank.icon} <span className={`font-black uppercase tracking-widest ${grandRank.color}`}>{grandRank.title} {grandRank.num}</span>
                               </div>
                               
                               <div className="flex items-center justify-between w-full mt-2 px-2 relative z-10">
                                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                     <img src={r.avatar_url} className={`${avatarClass} rounded-full border-2 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_20px_gold]' : 'border-white/20'} shrink-0`} alt="p"/>
                                     <span className={`text-white font-black truncate group-hover:text-cyan-400 transition-colors ${nameSize}`}>{r.display_name}</span>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0 ml-2">
                                     <span className={`font-black text-slate-300 tracking-tight ${statSize}`}>{r.wins}승 {r.losses}패</span>
                                     {r.rankIndex === 0 && (<span className="font-black text-[12px] px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 mt-1 shadow-[0_0_10px_gold]">👑 방어전 스택: {r.defense_stack || 0}</span>)}
                                  </div>
                               </div>
                            </div>
                         </div>
                       );
                    }) : (<div className="col-span-12 flex items-center justify-center h-[300px] opacity-50 text-xl font-bold text-cyan-400 tracking-widest">해당하는 랭커가 없습니다.</div>)}
               </div>
            </div>
          </main>
        )}

        {/* 내 정보, 활동 로그, 환경 설정 */}
        {activeMenu === 'profile' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500"><h2 onMouseEnter={() => playSFX('hover')} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-8 text-left drop-shadow-[0_0_10px_cyan]">내 정보 (Profile)</h2><div onMouseEnter={() => playSFX('hover')} className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-12 max-w-4xl flex items-center gap-12 cursor-default"><img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-48 h-48 rounded-full border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]" alt="profile"/><div className="flex-1"><h3 className="text-6xl font-black text-white mb-2 italic tracking-tighter uppercase">{currentUserName || "GUEST PILOT"}</h3><p className="text-cyan-400 font-bold mb-8 tracking-widest">{user?.email || "로그인이 필요합니다"}</p><div className="grid grid-cols-3 gap-6"><div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs mb-2 tracking-widest font-black">TOTAL MATCHES</p><p className="text-4xl font-black text-white">0</p></div><div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs mb-2 tracking-widest font-black">TOTAL WINS</p><p className="text-4xl font-black text-cyan-400">0</p></div><div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-xs mb-2 tracking-widest font-black">WIN RATE</p><p className="text-4xl font-black text-pink-400">0%</p></div></div></div></div></main>
        )}

        {activeMenu === 'activity' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500"><h2 onMouseEnter={() => playSFX('hover')} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-8 text-left flex items-center gap-4 drop-shadow-[0_0_10px_cyan]"><Activity size={36} className="text-cyan-400"/> 활동 로그 (Activity Log)</h2><div className="space-y-4 max-w-5xl">{logs.length > 0 ? logs.map((log, i) => renderCombatLogItem(log, i)) : (<div className="flex items-center justify-center p-20 opacity-50 text-lg font-bold tracking-widest border border-white/10 rounded-[2rem] text-cyan-400">아직 진행된 전투가 없습니다.</div>)}</div></main>
        )}

        {activeMenu === 'settings' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500"><h2 onMouseEnter={() => playSFX('hover')} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 uppercase tracking-widest mb-8 text-left flex items-center gap-4 drop-shadow-[0_0_10px_white]"><Settings size={36} className="text-slate-400"/> 환경 설정 (Settings)</h2><div className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-12 max-w-3xl space-y-10"><div className="flex items-center gap-8 border-b border-white/10 pb-10 cursor-default"><img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-24 h-24 rounded-full border-4 border-cyan-400 shadow-[0_0_20px_cyan]" alt="profile"/><div onMouseEnter={() => playSFX('hover')}><h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{currentUserName || "GUEST PILOT"}</h3><p className="text-cyan-400 font-bold tracking-widest mt-1">{user?.email || "디스코드 로그인이 필요합니다"}</p></div></div><div className="flex items-center justify-between border-b border-white/10 pb-8"><div className="flex-1"><div className="flex justify-between items-center mb-2"><h4 onMouseEnter={() => playSFX('hover')} className="text-xl font-black text-white tracking-widest cursor-default">배경음악 (BGM)</h4><div onMouseEnter={() => playSFX('hover')} onClick={() => { setBgmEnabled(!bgmEnabled); playSFX('click'); }} className={`w-14 h-7 rounded-full relative cursor-pointer transition-all ${bgmEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${bgmEnabled ? 'right-1' : 'left-1'}`}></div></div></div><p className="text-sm text-slate-400 font-bold mb-4">로비 및 대기 화면의 배경음악을 재생합니다.</p><div className="flex items-center gap-4"><span className="text-xs font-black text-slate-500">0</span><input onMouseEnter={() => playSFX('hover')} type="range" min="0" max="1" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-2 rounded-lg cursor-pointer volume-slider" disabled={!bgmEnabled}/><span className="text-xs font-black text-cyan-400 w-8 text-right">{Math.round(bgmVolume * 100)}</span></div></div></div><div className="flex items-center justify-between border-b border-white/10 pb-8"><div className="flex-1"><div className="flex justify-between items-center mb-2"><h4 onMouseEnter={() => playSFX('hover')} className="text-xl font-black text-white tracking-widest cursor-default">효과음 (SFX)</h4><div onMouseEnter={() => playSFX('hover')} onClick={() => { setSfxEnabled(!sfxEnabled); playSFX('click'); }} className={`w-14 h-7 rounded-full relative cursor-pointer transition-all ${sfxEnabled ? 'bg-cyan-500 shadow-[0_0_15px_cyan]' : 'bg-white/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${sfxEnabled ? 'right-1' : 'left-1'}`}></div></div></div><p className="text-sm text-slate-400 font-bold mb-4">버튼 클릭 및 매칭 시 효과음을 재생합니다.</p><div className="flex items-center gap-4"><span className="text-xs font-black text-slate-500">0</span><input onMouseEnter={() => playSFX('hover')} type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} className="w-full bg-white/10 h-2 rounded-lg cursor-pointer volume-slider" disabled={!sfxEnabled}/><span className="text-xs font-black text-cyan-400 w-8 text-right">{Math.round(sfxVolume * 100)}</span></div></div></div></div></main>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300 cursor-pointer" onClick={() => { setSelectedPlayer(null); playSFX('click'); }}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => { setSelectedPlayer(null); playSFX('click'); }} className="absolute top-10 right-10 text-slate-500 hover:text-white cursor-pointer"><X size={36}/></button>
             <div className="flex items-center gap-10 mb-10">
                <img src={selectedPlayer.avatar_url} className={`w-32 h-32 rounded-[2.5rem] border-4 ${selectedPlayer.rankIndex === 0 ? 'border-yellow-400 shadow-lg' : 'border-cyan-400 shadow-md'}`} alt="p" />
                <div className="flex-1 overflow-hidden">
                   <h2 className={`font-black text-white italic truncate tracking-tighter ${getNicknameFontSize(selectedPlayer.display_name, true)}`}>{selectedPlayer.display_name}</h2>
                   <div className="flex gap-3 mt-2">
                     <span className={`text-sm font-black px-6 py-1.5 rounded-full border border-white/20 ${getGrandRankInfo(selectedPlayer.rankIndex)?.color || 'text-slate-300'} bg-white/10 uppercase`}>RANK: {getGrandRankInfo(selectedPlayer.rankIndex)?.title} {getGrandRankInfo(selectedPlayer.rankIndex)?.num}</span>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6 mb-10">
                <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">RECORD (W/L)</p><p className="text-4xl font-black text-white">{selectedPlayer.wins}승 {selectedPlayer.losses}패</p></div>
                <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">WIN RATE</p><p className="text-4xl font-black text-pink-400">{selectedPlayer.win_rate || "0.0%"}</p></div>
                <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">FAVORITE LEGEND</p><p className="text-2xl font-black text-cyan-400 truncate">{selectedPlayer.favorite_legend || "미선택"}</p></div>
                <div onMouseEnter={() => playSFX('hover')} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-inner"><p className="text-xs font-black text-slate-400 mb-2">FAVORITE WEAPON</p><p className="text-xl font-black text-cyan-400 truncate">{selectedPlayer.favorite_weapon || "미선택"}</p></div>
             </div>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => copyPlayerName(selectedPlayer.display_name)} className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border-2 border-cyan-400/50 text-cyan-400 py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 active:scale-95 shadow-lg cursor-pointer">{copyStatus ? <Check size={24}/> : <Copy size={24}/>}{copyStatus ? 'NICKNAME COPIED!' : `COPY NICKNAME`}</button>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; } optgroup { font-style: normal; font-weight: 900; background: #000; color: #fff; } option { background-color: #000; color: #fff; padding: 10px; }`}</style>
    </div>
  );
}

export default App;