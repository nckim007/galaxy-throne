import React, { useEffect, useState, useRef } from 'react';
import { 
  Calendar, Users, Target, Swords, Zap, Crown, Activity, LogIn, LogOut, 
  Search, ChevronDown, ChevronUp, Copy, Check, Shield, RefreshCw, Flame, 
  Lock, Unlock, BarChart3, TrendingUp, X, Trophy, PieChart, Home, User, 
  Settings, Bell, Star 
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
  { id: 'ranking', icon: Trophy, label: '명예의 전당' },
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
  const [copyStatus, setCopyStatus] = useState(false);
  
  const [miniRankMode, setMiniRankMode] = useState<'free' | 'random'>('free');
  const [mainRankTab, setMainRankTab] = useState<'free' | 'random'>('free');
  const [rankTab, setRankTab] = useState<number>(0);

  const [bgmEnabled, setBgmEnabled] = useState(localStorage.getItem('bgmEnabled') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('sfxEnabled') !== 'false');
  const [bgmVolume, setBgmVolume] = useState(parseFloat(localStorage.getItem('bgmVolume') || '0.10'));
  const [sfxVolume, setSfxVolume] = useState(parseFloat(localStorage.getItem('sfxVolume') || '0.60'));

  const currentUserName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const currentUserAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
  const DISCORD_GUILD_ID = (import.meta.env.VITE_DISCORD_GUILD_ID as string | undefined)?.trim();

  const activeMatchRef = useRef(activeMatch);
  const matchPhaseRef = useRef(matchPhase);
  const waitingForScoreRef = useRef(waitingForScore);
  const recentLogsBoardRef = useRef<HTMLDivElement | null>(null);
  const rankingBoardRef = useRef<HTMLDivElement | null>(null);

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
        defense_stack: r.defense_stack || 0, rp: r.rp || 1000, gc: r.gc || 0, win_streak: r.win_streak || 0
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

  const getGrandRankInfo = (idx: number) => {
    const badgeImage = (name: string, alt: string) => (
      <img
        src={`${import.meta.env.BASE_URL}ranks/${name}.png`}
        alt={alt}
        className="w-6 h-6 rounded-sm object-contain shrink-0"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (!target.src.includes('.webp')) {
            target.src = `${import.meta.env.BASE_URL}ranks/${name}.webp`;
          }
        }}
      />
    );

    if (idx === 0) return { title: "프레데터", num: 1, color: "text-[#ff5a5a]", glow: "shadow-[0_0_18px_rgba(255,90,90,0.45)]", bg: "bg-[#ff5a5a]/20", icon: badgeImage('predator', 'predator badge') };
    if (idx < 4) return { title: "마스터", num: idx + 1, color: "text-[#c67cff]", glow: "shadow-[0_0_14px_rgba(198,124,255,0.4)]", bg: "bg-[#c67cff]/20", icon: badgeImage('master', 'master badge') };
    if (idx < 9) return { title: "다이아몬드", num: idx + 1, color: "text-[#4fd8ff]", glow: "shadow-[0_0_12px_rgba(79,216,255,0.35)]", bg: "bg-[#4fd8ff]/20", icon: badgeImage('diamond', 'diamond badge') };
    if (idx < 16) return { title: "플래티넘", num: idx + 1, color: "text-[#61ff90]", glow: "shadow-[0_0_10px_rgba(97,255,144,0.3)]", bg: "bg-[#61ff90]/20", icon: badgeImage('platinum', 'platinum badge') };
    if (idx < 25) return { title: "골드", num: idx + 1, color: "text-[#ffd84d]", glow: "shadow-[0_0_8px_rgba(255,216,77,0.28)]", bg: "bg-[#ffd84d]/20", icon: badgeImage('gold', 'gold badge') };
    if (idx < 36) return { title: "실버", num: idx + 1, color: "text-[#d0d8e6]", glow: "", bg: "bg-[#d0d8e6]/18", icon: badgeImage('silver', 'silver badge') };
    return { title: "브론즈", num: idx + 1, color: "text-[#d39a6a]", glow: "", bg: "bg-[#d39a6a]/18", icon: badgeImage('bronze', 'bronze badge') };
  };

  const getRPTierInfo = (idx: number) => {
    if (idx === 0) return { name: "왕좌 1", color: "text-yellow-400", glow: "shadow-[0_0_16px_rgba(250,204,21,0.45)]", bg: "bg-yellow-400/20", icon: "👑" };
    if (idx < 6) return { name: `성좌 ${idx + 1}`, color: "text-purple-400", glow: "shadow-[0_0_12px_rgba(192,132,252,0.35)]", bg: "bg-purple-400/20", icon: "✨" };
    if (idx < 12) return { name: `항성 ${idx - 5}`, color: "text-cyan-400", glow: "shadow-[0_0_10px_rgba(34,211,238,0.32)]", bg: "bg-cyan-400/20", icon: "⚡" };
    if (idx < 20) return { name: `성운 ${idx - 11}`, color: "text-sky-300", glow: "shadow-[0_0_8px_rgba(125,211,252,0.28)]", bg: "bg-sky-300/20", icon: "🌌" };
    if (idx < 30) return { name: `혜성 ${idx - 19}`, color: "text-emerald-300", glow: "shadow-[0_0_7px_rgba(110,231,183,0.25)]", bg: "bg-emerald-300/20", icon: "☄️" };
    if (idx < 45) return { name: `유성 ${idx - 29}`, color: "text-indigo-300", glow: "", bg: "bg-indigo-300/20", icon: "🌠" };
    return { name: `은하편린 ${idx - 44}`, color: "text-slate-400", glow: "", bg: "bg-slate-400/20", icon: "🪐" };
  };

  const rpRankers = [...rankers].sort((a, b) => (b.rp || 0) - (a.rp || 0));
  const normalizeName = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const regularRankMap = new Map(rankers.map((r) => [normalizeName(r.display_name), r]));
  const seasonRankIndexMap = new Map(rpRankers.map((r, i) => [normalizeName(r.display_name), i]));

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
    const idx = seasonRankIndexMap.get(normalizeName(name));
    if (idx === undefined) return null;
    return { index: idx, ...getRPTierInfo(idx) };
  };

  const getSeasonRankLabelByName = (name?: string | null) => {
    const info = getSeasonRankInfoByName(name);
    return info ? info.name : '미집계';
  };

  const currentUserRegularInfo = getRegularRankInfoByName(currentUserName);
  const currentUserRegularLabel = getRegularRankLabelByName(currentUserName);
  const currentUserSeasonInfo = getSeasonRankInfoByName(currentUserName);

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
        className="bg-black/65 border border-white/10 rounded-2xl px-3 py-2 hover:border-cyan-500/50 transition-colors shadow-md"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          <button onClick={() => handleProfileClick(leftP)} className={`text-left min-w-0 cursor-pointer ${isLeftWinner ? 'opacity-100' : 'opacity-55'}`}>
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <img src={getAvatarFallback(leftP, rankers)} className="w-8 h-8 rounded-full border border-white/30 shrink-0" alt="left-player" />
              <span className="font-bold text-xl text-white truncate">{leftP}</span>
              <span title={`정규 ${leftRegularLabel}`} className="w-5 h-5 rounded-full bg-black/70 border border-yellow-400/35 flex items-center justify-center shrink-0">
                {leftRegularInfo?.icon || <Shield size={11} className="text-slate-300" />}
              </span>
              <span title={`시즌 ${leftSeasonInfo?.name || '미집계'}`} className={`w-5 h-5 rounded-full bg-black/70 border border-cyan-400/35 flex items-center justify-center text-[11px] font-black shrink-0 ${leftSeasonInfo?.color || 'text-slate-300'}`}>
                {leftSeasonInfo?.icon || '🪐'}
              </span>
            </div>
            <p className="text-sm font-bold text-pink-400 truncate">{log.left_legend || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.left_weapons?.[0] || '미선택'}</p>
            <p className="text-sm font-bold text-cyan-300 leading-tight">{log.left_weapons?.[1] || '미선택'}</p>
          </button>

          <div className="flex flex-col items-center">
            <span className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest ${log.match_type === 'free' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-black'}`}>
              {modeLabel}
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className={`text-sm font-black px-3 py-1 rounded-md shadow-md ${leftResult === 'WIN' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white opacity-55'}`}>{leftResult}</span>
              <span className={`text-5xl font-black leading-none ${isLeftWinner ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]' : 'text-slate-500/65'}`}>{leftScore}</span>
              <span className="text-4xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]">VS</span>
              <span className={`text-5xl font-black leading-none ${!isLeftWinner ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]' : 'text-slate-500/65'}`}>{rightScore}</span>
              <span className={`text-sm font-black px-3 py-1 rounded-md shadow-md ${rightResult === 'WIN' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white opacity-55'}`}>{rightResult}</span>
            </div>
          </div>

          <button onClick={() => handleProfileClick(rightP)} className={`text-right min-w-0 cursor-pointer ${!isLeftWinner ? 'opacity-100' : 'opacity-55'}`}>
            <div className="flex items-center justify-end gap-2 mb-0.5 min-w-0">
              <span title={`시즌 ${rightSeasonInfo?.name || '미집계'}`} className={`w-5 h-5 rounded-full bg-black/70 border border-cyan-400/35 flex items-center justify-center text-[11px] font-black shrink-0 ${rightSeasonInfo?.color || 'text-slate-300'}`}>
                {rightSeasonInfo?.icon || '🪐'}
              </span>
              <span title={`정규 ${rightRegularLabel}`} className="w-5 h-5 rounded-full bg-black/70 border border-yellow-400/35 flex items-center justify-center shrink-0">
                {rightRegularInfo?.icon || <Shield size={11} className="text-slate-300" />}
              </span>
              <span className="font-bold text-xl text-white truncate">{rightP}</span>
              <img src={getAvatarFallback(rightP, rankers)} className="w-8 h-8 rounded-full border border-white/30 shrink-0" alt="right-player" />
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
      .rank-glow-buffer { padding: 6px 0 12px; scrollbar-gutter: stable; }
      .rank-card-stable { transform: translateZ(0); backface-visibility: hidden; }
    `}</style>
  );

  return (
    <div className="flex h-screen bg-black text-slate-300 overflow-hidden relative select-none">
      {globalFontStyle}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="absolute inset-0 bg-black/10"></div>
      </div>
      
      <aside className="w-20 bg-black/20 backdrop-blur-md border-r border-cyan-500/30 shadow-2xl flex flex-col items-center py-10 gap-10 z-20 shrink-0 h-screen fixed left-0">
        <div onMouseEnter={() => playSFX('hover')} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg cursor-pointer">
          <Star className="text-cyan-400 animate-pulse" size={24}/>
        </div>
        <div className="flex flex-col gap-10 text-slate-500 w-full items-center">
          {MENU_ITEMS.map((item) => (
            <div key={item.id} title={item.label} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setActiveMenu(item.id); }} className={`cursor-pointer transition-all ${activeMenu === item.id ? 'text-cyan-400 drop-shadow-[0_0_10px_cyan] scale-110' : 'hover:text-slate-300'}`}>
              <item.icon size={24}/>
            </div>
          ))}
        </div>
        <div onMouseEnter={() => playSFX('hover')} className="mt-auto mb-6 hover:text-pink-500 cursor-pointer transition-colors" onClick={handleLogout}>
          <LogOut size={24}/>
        </div>
      </aside>

      <div className="flex-1 flex flex-col z-10 relative ml-20 h-screen overflow-y-auto custom-scrollbar">
        <header className="px-10 py-6 flex justify-between items-center shrink-0 border-b border-cyan-500/30 bg-black/20 backdrop-blur-md">
          <div onMouseEnter={() => playSFX('hover')} className="flex items-center gap-6 cursor-pointer" onClick={() => setActiveMenu('home')}>
            <h1 className="text-6xl font-bold text-white italic tracking-tighter drop-shadow-[0_0_20px_purple]">은하단</h1>
            <div className="h-12 w-[3px] bg-gradient-to-b from-cyan-400 to-purple-400 mx-3 shadow-lg"></div>
            <div className="flex flex-col justify-center">
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase tracking-widest">별의 전쟁 : 시즌 1</p>
              <p className="text-[12px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.4em] mt-1.5 uppercase italic">SEASON 01 BATTLE FOR THE STAR THRONE</p>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-start min-w-[300px] pr-2">
                    <div className="flex items-center gap-3 w-full">
                      <span className="w-10 h-10 rounded-lg bg-black/50 border border-white/15 flex items-center justify-center shrink-0">{currentUserRegularInfo?.icon || <Shield size={20} className="text-slate-300" />}</span>
                      <span className="text-2xl font-black text-yellow-300 leading-tight truncate drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">정규 {currentUserRegularLabel}</span>
                    </div>
                    <div className="flex items-center gap-3 w-full mt-1.5">
                      <span className="w-9 h-9 rounded-lg bg-black/50 border border-white/15 flex items-center justify-center text-lg shrink-0">{currentUserSeasonInfo?.icon || '🪐'}</span>
                      <span className={`text-2xl font-black leading-tight truncate drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] ${currentUserSeasonInfo?.color || 'text-slate-300'}`}>시즌 {currentUserSeasonInfo?.name || '미집계'}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end bg-black/40 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                    <span className="text-xs font-bold text-emerald-400 tracking-widest">{profile?.gc || 0} GC</span>
                    <span className="text-sm font-bold text-fuchsia-400 tracking-widest">{profile?.rp || 1000} RP</span>
                </div>
                <div onMouseEnter={() => playSFX('hover')} onClick={handleLogout} className="flex items-center gap-4 bg-black/60 p-2 rounded-full border border-white/10 pr-8 border-l-cyan-500 border-l-4 cursor-pointer hover:border-l-pink-500 transition-all">
                  <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} className="w-10 h-10 rounded-full" alt="profile"/>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{currentUserName || "GUEST"}</span>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tighter">Logout</span>
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
          <main className="flex-1 p-10 grid grid-cols-12 gap-8 items-start xl:items-stretch pb-20 animate-in fade-in duration-500 h-full">
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-8 h-auto xl:h-full relative order-1 xl:order-1">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col h-auto relative">
               <section className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 rounded-[2.5rem] p-6 flex flex-col h-full overflow-hidden shadow-lg relative z-10">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-6 border-b border-white/5 pb-4">
                    접속 현황 (Online Board)
                  </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pt-2 animate-in fade-in">
                       {onlineRankers.length > 0 ? onlineRankers.map((ou, i) => {
                          const rankInfo = getGrandRankInfo(ou.rankIndex);
                          const seasonInfo = getSeasonRankInfoByName(ou.display_name);
                          return (
                            <div key={i} onMouseEnter={() => playSFX('hover')} className="bg-black/60 border border-white/10 p-4 rounded-[1.5rem] flex items-center justify-between hover:border-cyan-400/50 transition-all group">
                               <div className="flex items-center gap-4 cursor-pointer group/profile flex-1 min-w-0 mr-2" onClick={() => handleProfileClick(ou.display_name)}>
                                  <div className="relative shrink-0">
                                     <img src={ou.avatar_url} className="w-12 h-12 rounded-full border border-white/20 group-hover/profile:border-cyan-400 transition-colors" alt="profile"/>
                                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                     <span className={`group-hover/profile:text-cyan-400 text-lg font-bold truncate`}>{ou.display_name}</span>
                                     <span className={`text-[11px] font-bold mt-1 ${rankInfo?.color || ''}`}>정규 {rankInfo?.title} {rankInfo?.num}</span>
                                     <span className={`text-[11px] font-bold mt-0.5 ${seasonInfo?.color || 'text-slate-400'}`}>시즌 {seasonInfo?.name || '미집계'}</span>
                                  </div>
                               </div>
                               {ou.display_name.trim() === currentUserName?.trim() ? (
                                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 border border-blue-500/50 text-blue-400 shrink-0">나</div>
                               ) : (
                                  <button 
                                    onMouseEnter={() => playSFX('hover')} 
                                    onClick={() => { playSFX('click'); handleTargetLock(ou.display_name); }} 
                                    disabled={matchPhase !== 'idle'} 
                                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer ${matchPhase === 'idle' ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black' : 'bg-slate-800/50 border border-slate-700 text-slate-500 cursor-not-allowed'}`}
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
               <section className="bg-black/50 backdrop-blur-3xl border-2 border-cyan-400 shadow-2xl rounded-[3rem] p-5 flex flex-col h-auto shrink-0 relative z-10 overflow-visible">
                  <div className="flex flex-col relative z-10">
                      <h3 onMouseEnter={() => playSFX('hover')} className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-4 border-b border-white/5 pb-3">
                         {(matchPhase === 'idle' || matchPhase === 'setup_mode') && '대전 신청 (Match Entry)'}
                         {(matchPhase === 'waiting_sync' || matchPhase === 'picking' || matchPhase === 'waiting_ready') && '대전 준비 (Match Prep)'}
                         {matchPhase === 'scoring' && '결과 제출 (Submit Score)'}
                      </h3>
                      
                      {matchPhase === 'idle' && (
                        <div className="flex flex-col pt-1 pb-1 animate-in fade-in gap-4">
                           <div className="flex flex-col items-center text-center mb-1">
                              <Target size={58} className="text-cyan-400 drop-shadow-[0_0_15px_cyan] mb-3" />
                              <h4 className="text-2xl font-bold text-white tracking-widest">타겟을 설정하세요</h4>
                              <p className="text-slate-400 text-sm mt-2">좌측 접속 현황에서 선택하거나 직접 입력하세요.</p>
                           </div>
                           <div className="bg-black/60 p-4 rounded-2xl border border-white/10 shadow-inner mt-1">
                              <p className="text-xs text-slate-500 font-bold mb-2 pl-2">TARGET NICKNAME</p>
                              <input value={entryOpponent} onChange={(e) => setEntryOpponent(e.target.value)} placeholder="상대방 닉네임 직접 입력" className="w-full bg-transparent outline-none text-white font-bold text-xl select-text pl-2" />
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

            <div ref={recentLogsBoardRef} className="flex flex-col h-[90vh] xl:h-[90vh] relative">
               <section className="bg-black/45 backdrop-blur-2xl border-2 border-cyan-400/80 rounded-[2.5rem] p-5 flex flex-col h-full overflow-hidden shadow-xl relative z-10">
                  <h3 onMouseEnter={() => playSFX('hover')} className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center mb-6 border-b border-white/5 pb-4">
                    최근 기록 (Battle Logs)
                  </h3>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 space-y-1">
                    {logs.length > 0 ? logs.slice(0, 20).map((log, i) => renderCombatLogItem(log, i)) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400">전투 기록이 없습니다</div>)}
                  </div>
               </section>
            </div>
            </div>

            <div
              ref={rankingBoardRef}
              className="col-span-12 xl:col-span-4 flex flex-col h-[85vh] xl:h-auto relative order-2 xl:order-2"
              style={homeRankingHeight ? { height: `${homeRankingHeight}px` } : undefined}
            >
               <section className="bg-black/40 backdrop-blur-3xl border-2 border-cyan-400 shadow-xl rounded-[3.5rem] p-6 flex flex-col h-full shrink-0 relative z-10 overflow-hidden">
                  <div className="px-2 pt-2 flex flex-col relative z-10 h-full">
                      
                      <div onMouseEnter={() => playSFX('hover')} className="flex items-center justify-center gap-5 mb-6 mt-1">
                        <Trophy className="text-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,0.65)]" size={64}/>
                        <div className="flex flex-col text-center">
                          <h3 className="text-[2.55rem] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 uppercase tracking-tighter pt-1">은하단 랭킹</h3>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                        <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMiniRankMode('free'); }} className={`flex-1 py-3 rounded-xl text-base font-bold transition-all border cursor-pointer ${miniRankMode === 'free' ? 'bg-pink-600/20 text-pink-400 border-pink-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>⚔️ 정규 랭킹</button>
                        <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setMiniRankMode('random'); }} className={`flex-1 py-3 rounded-xl text-base font-bold transition-all border cursor-pointer ${miniRankMode === 'random' ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🎲 시즌 랭킹</button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 custom-scrollbar rank-glow-buffer">
                         {miniRankMode === 'free' ? (
                             rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).map((r, idx) => {
                                  const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                                  const pyramidWidthClass =
                                    idx === 0 ? 'w-full' :
                                    idx < 3 ? 'w-[94%]' :
                                    idx < 6 ? 'w-[88%]' :
                                    idx < 10 ? 'w-[82%]' : 'w-[76%]';
                                  return (
                                    <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`rank-card-stable ${pyramidWidthClass} mx-auto p-4 pt-4 pb-5 rounded-[1.5rem] border transition-all cursor-pointer group bg-black/55 flex flex-col items-center border-cyan-400/40 hover:border-cyan-300/80 mt-4 relative`}>
                                       <div className="w-full flex justify-center mb-2.5">
                                         <div className={`px-4 py-1 rounded-full border-2 border-cyan-400/30 ${grandRank.bg} flex items-center justify-center gap-2 shadow-xl bg-black/90`}>
                                             {grandRank.icon} 
                                             <span className={`text-sm font-bold uppercase tracking-widest ${grandRank.color}`}>{grandRank.title} {grandRank.num}</span>
                                         </div>
                                       </div>

                                       <div className="flex items-center justify-between w-full px-2 relative z-10 gap-3">
                                          <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                                             <img src={r.avatar_url} className={`w-12 h-12 rounded-full border-2 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_14px_gold]' : 'border-cyan-200/40'} shrink-0`} alt="p"/>
                                             <span className={`group-hover:text-cyan-300 font-bold text-white text-lg leading-tight break-all`}>{r.display_name}</span>
                                          </div>
                                          <div className="flex flex-col items-end shrink-0">
                                            <span className="font-bold text-slate-200 text-lg tracking-tight">{r.wins}승 {r.losses}패</span>
                                            {r.rankIndex === 0 && (<span className="font-bold text-[9px] px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 mt-1">방어전: {r.defense_stack || 0}</span>)}
                                          </div>
                                       </div>
                                    </div>
                                  );
                               }) : (<div className="flex items-center justify-center h-full opacity-50 text-cyan-400 mt-10 text-lg">랭커가 없습니다</div>)
                         ) : (
                             rpRankers.length > 0 ? rpRankers.filter(r => r.display_name?.includes(searchQuery)).slice(0, 10).map((r, i) => {
                                 const tier = getRPTierInfo(i);
                                 const pyramidWidthClass =
                                   i === 0 ? 'w-full' :
                                   i < 3 ? 'w-[94%]' :
                                   i < 6 ? 'w-[88%]' :
                                   i < 10 ? 'w-[82%]' : 'w-[76%]';
                                 return (
                                     <div key={r.id} onMouseEnter={() => playSFX('hover')} onClick={() => handleProfileClick(r.display_name)} className={`rank-card-stable ${pyramidWidthClass} mx-auto p-4 pt-4 pb-4 rounded-[1.45rem] border flex flex-col items-center bg-black/55 hover:border-cyan-300/80 transition-all cursor-pointer border-cyan-500/25 group mt-4 relative`}>
                                         <div className="w-full flex justify-center mb-2.5">
                                           <div className={`px-3.5 py-1 rounded-full border border-white/20 ${tier.bg} flex items-center justify-center gap-2 shadow-xl bg-black/90`}>
                                               <span className="text-base">{tier.icon}</span> 
                                               <span className={`text-xs font-bold uppercase tracking-widest ${tier.color}`}>{tier.name}</span>
                                           </div>
                                         </div>

                                         <div className="flex items-center justify-between w-full px-1 relative z-10 gap-3">
                                             <div className="flex items-center gap-4 flex-1 min-w-0">
                                                 <span className={`text-2xl font-black ${tier.color} w-6 text-center drop-shadow-md shrink-0`}>{i + 1}</span>
                                                 <img src={r.avatar_url} className={`w-11 h-11 rounded-full border-2 ${i < 3 ? 'border-red-500 shadow-[0_0_10px_red]' : 'border-cyan-200/40'} shrink-0`} alt="p"/>
                                                 <span className={`group-hover:text-cyan-300 font-bold text-white text-base leading-tight break-all`}>{r.display_name}</span>
                                             </div>
                                             <div className="flex flex-col items-end shrink-0">
                                                 <span className="font-black text-fuchsia-400 text-lg">{r.rp || 1000} RP</span>
                                                 {(r.win_streak || 0) >= 2 && <span className="font-bold text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mt-1 shadow-[0_0_10px_emerald]">🔥 {r.win_streak} 연승</span>}
                                             </div>
                                         </div>
                                     </div>
                                 )
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

        {activeMenu === 'ranking' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
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
                   <div className="flex gap-4 mb-12 justify-center max-w-4xl mx-auto w-full">
                     <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(0); }} className={`flex-1 py-5 rounded-xl text-lg font-bold transition-all border cursor-pointer ${rankTab === 0 ? 'bg-red-500/20 text-red-300 border-red-400/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🔥 프레데터·마스터</button>
                     <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(1); }} className={`flex-1 py-5 rounded-xl text-lg font-bold transition-all border cursor-pointer ${rankTab === 1 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>💎 다이아·플래티넘</button>
                     <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setRankTab(2); }} className={`flex-1 py-5 rounded-xl text-lg font-bold transition-all border cursor-pointer ${rankTab === 2 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50 shadow-md' : 'bg-black/40 border-white/10 text-slate-500 hover:text-white hover:border-cyan-400/50'}`}>🥇 골드·실버·브론즈</button>
                   </div>
                   
                   <div className="flex justify-end mb-8 max-w-7xl mx-auto w-full px-4">
                     <div className="relative w-96">
                       <Search className="absolute left-6 top-4.5 text-slate-500" size={24}/>
                       <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="랭커 검색..." className="w-full bg-black/40 border border-white/10 pl-16 pr-8 py-5 rounded-full text-lg font-bold outline-none focus:border-cyan-400 text-white select-text shadow-inner"/>
                     </div>
                   </div>

                   <div className="grid grid-cols-12 gap-10 pb-20 justify-center px-4 grid-glow-fix">
                      {rankers.length > 0 ? rankers.filter(r => r.display_name?.includes(searchQuery)).filter(r => { if (rankTab === 0) return r.rankIndex < 4; if (rankTab === 1) return r.rankIndex >= 4 && r.rankIndex < 16; return r.rankIndex >= 16; }).map((r) => {
                           const grandRank = getGrandRankInfo(r.rankIndex); if (!grandRank) return null;
                           const isRank1 = r.rankIndex === 0;
                           const isRank2_4 = r.rankIndex >= 1 && r.rankIndex <= 3;
                           
                           let spanClass = "col-span-6";
                           let cardClass = "p-8 pt-12 pb-8 rounded-[2rem]";
                           let badgeClass = "px-10 py-3 text-[20px] -top-7";
                           let avatarClass = "w-20 h-20";
                           let nameSize = r.rankIndex === 0 ? 'text-4xl' : 'text-2xl';
                           let statSize = "text-3xl";

                           if (rankTab === 0) {
                               if (isRank1) { spanClass = "col-span-12 flex justify-center"; cardClass = "w-full max-w-5xl p-12 pt-16 pb-12 rounded-[3.5rem] shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:shadow-[0_0_50px_rgba(250,204,21,0.7)] hover:scale-[1.03]"; badgeClass = "px-12 py-4 text-[26px] -top-10"; avatarClass = "w-32 h-32"; statSize = "text-5xl"; nameSize = 'text-5xl'; }
                               else if (isRank2_4) { spanClass = "col-span-4"; cardClass = "p-6 pt-10 pb-6 rounded-[1.5rem]"; badgeClass = "px-8 py-2.5 text-[18px] -top-6"; avatarClass = "w-16 h-16"; statSize = "text-2xl"; nameSize = 'text-xl'; }
                           } else if (rankTab === 1) {
                               spanClass = "col-span-4"; cardClass = "p-6 pt-10 pb-6 rounded-[1.5rem]"; badgeClass = "px-8 py-2.5 text-[18px] -top-6"; avatarClass = "w-16 h-16"; statSize = "text-2xl"; nameSize = 'text-xl';
                           } else {
                               spanClass = "col-span-3"; cardClass = "p-5 pt-8 pb-5 rounded-xl"; badgeClass = "px-6 py-2 text-[15px] -top-5"; avatarClass = "w-14 h-14"; statSize = "text-xl"; nameSize = 'text-lg';
                           }

                           return (
                             <div key={r.id} className={spanClass}>
                                <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`${cardClass} border transition-all cursor-pointer group bg-black/60 relative flex flex-col justify-center items-center ${grandRank.glow} border-cyan-400/30 hover:border-cyan-400 mt-10`}>
                                   {r.rankIndex === 0 && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}
                                   
                                   <div className="absolute w-full flex justify-center z-20" style={{top: 0}}>
                                     <div className={`${badgeClass} absolute rounded-full border-2 border-cyan-400/30 ${grandRank.bg} flex items-center justify-center gap-3 shadow-2xl bg-black`}>
                                       {grandRank.icon} <span className={`font-bold uppercase tracking-widest ${grandRank.color} text-center`}>{grandRank.title} {grandRank.num}</span>
                                     </div>
                                   </div>
                                   
                                   <div className="flex items-center justify-between w-full mt-4 px-2 relative z-10 gap-4">
                                     <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
                                       <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${r.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_20px_gold]' : 'border-white/20'} shrink-0`} alt="p"/>
                                       <span className={`group-hover:text-cyan-400 font-bold text-white truncate ${nameSize}`}>{r.display_name}</span>
                                     </div>
                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                       <span className={`font-bold text-slate-300 tracking-tight ${statSize}`}>{r.wins}승 {r.losses}패</span>
                                       {r.rankIndex === 0 && (<span className="font-bold text-base px-4 py-1.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 mt-2 shadow-[0_0_10px_gold]">👑 방어전 스택: {r.defense_stack || 0}</span>)}
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
                                <div onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setSelectedPlayer(r); setProfileTab('overview'); }} className={`${cardClass} border transition-all cursor-pointer group bg-black/60 relative flex flex-col justify-center items-center ${tier.glow} border-white/10 hover:border-cyan-400 shadow-xl mt-10`}>
                                   {i === 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}
                                   
                                   <div className="absolute w-full flex justify-center z-20" style={{top: 0}}>
                                     <div className={`${badgeClass} absolute rounded-full border-2 border-white/20 ${tier.bg} flex items-center justify-center gap-3 shadow-2xl bg-black`}>
                                       <span className="text-2xl">{tier.icon}</span> 
                                       <span className={`font-bold uppercase tracking-widest ${tier.color} text-center`}>{tier.name}</span>
                                     </div>
                                   </div>
                                   
                                   <div className="flex items-center justify-between w-full mt-4 px-2 relative z-10 gap-4">
                                     <div className="flex items-center gap-5 flex-1 min-w-0 pr-2">
                                       <span className={`text-4xl font-black ${tier.color} drop-shadow-md shrink-0`}>{i + 1}</span>
                                       <img src={r.avatar_url} className={`${avatarClass} rounded-full border-4 ${i < 3 ? 'border-red-500 shadow-[0_0_20px_red]' : 'border-white/20'} shrink-0`} alt="p"/>
                                       <span className={`group-hover:text-cyan-400 font-bold text-white truncate ${nameSize}`}>{r.display_name}</span>
                                     </div>
                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                       <span className={`font-black text-fuchsia-400 tracking-tight ${statSize}`}>{r.rp || 1000} RP</span>
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
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
            <h2 onMouseEnter={() => playSFX('hover')} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-10 text-left drop-shadow-[0_0_10px_cyan]">내 정보 (Profile)</h2>
            <div onMouseEnter={() => playSFX('hover')} className="bg-black/50 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] rounded-[3rem] p-12 max-w-5xl flex items-center gap-12 cursor-default">
              <img src={currentUserAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest&backgroundColor=b6e3f4"} className="w-48 h-48 rounded-full border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] shrink-0" alt="profile"/>
              <div className="flex-1 min-w-0">
                <h3 className={`italic uppercase mb-2 font-black text-5xl text-white truncate`}>{currentUserName || "GUEST PILOT"}</h3>
                <p className="text-cyan-400 font-bold text-xl mb-10 tracking-widest truncate">{user?.email || "로그인이 필요합니다"}</p>
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-sm mb-3 tracking-widest font-bold">TOTAL WINS</p><p className="text-5xl font-black text-white">{profile?.wins || 0}</p></div>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-sm mb-3 tracking-widest font-bold">RANK POINTS</p><p className="text-5xl font-black text-fuchsia-400">{profile?.rp || 1000}</p></div>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center shadow-inner"><p className="text-slate-400 text-sm mb-3 tracking-widest font-bold">GALAXY CREDITS</p><p className="text-5xl font-black text-emerald-400">{profile?.gc || 0}</p></div>
                </div>
              </div>
            </div>
          </main>
        )}

        {activeMenu === 'settings' && (
          <main className="flex-1 p-10 h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
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
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300 cursor-pointer" onClick={() => { setSelectedPlayer(null); playSFX('click'); }}>
          <div className="bg-[#0A0C14] border-2 border-cyan-400 w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <button onMouseEnter={() => playSFX('hover')} onClick={() => { setSelectedPlayer(null); playSFX('click'); }} className="absolute top-10 right-10 text-slate-500 hover:text-white cursor-pointer">
               <X size={40}/>
             </button>
             
             <div className="flex items-center gap-10 mb-8 mt-2">
                <img src={selectedPlayer.avatar_url} className={`w-36 h-36 rounded-[3rem] border-4 ${selectedPlayer.rankIndex === 0 ? 'border-yellow-400 shadow-[0_0_20px_gold]' : 'border-cyan-400 shadow-[0_0_20px_cyan]'} shrink-0`} alt="p" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                   <div className="flex items-center gap-3 pb-2 min-w-0">
                     <h2 className={`italic font-black text-5xl text-white truncate`}>{selectedPlayer.display_name}</h2>
                     <span className={`inline-flex items-center gap-2 text-base font-bold px-4 py-2 rounded-full border border-white/20 ${selectedPlayerRegularInfo?.color || 'text-slate-300'} bg-white/10 shrink-0`}>
                       {selectedPlayerRegularInfo?.icon}
                       {selectedPlayerRegularLabel}
                     </span>
                     <span className={`inline-flex items-center gap-2 text-base font-bold px-4 py-2 rounded-full border border-white/20 ${selectedPlayerSeasonInfo?.color || 'text-slate-300'} bg-white/10 shrink-0`}>
                       <span>{selectedPlayerSeasonInfo?.icon || '🪐'}</span>
                       {selectedPlayerSeasonInfo?.name || '미집계'}
                     </span>
                   </div>
                </div>
             </div>

             <div className="flex gap-3 mb-8 justify-center">
                <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setProfileTab('overview'); }} className={`px-10 py-3.5 rounded-full font-bold text-lg transition-all cursor-pointer ${profileTab === 'overview' ? 'bg-cyan-500 text-black shadow-[0_0_20px_cyan]' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                  요약 정보
                </button>
                <button onMouseEnter={() => playSFX('hover')} onClick={() => { playSFX('click'); setProfileTab('details'); }} className={`px-10 py-3.5 rounded-full font-bold text-lg transition-all cursor-pointer ${profileTab === 'details' ? 'bg-pink-500 text-white shadow-[0_0_20px_pink] border border-pink-500' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                  상세 전적 (모스트)
                </button>
             </div>

             <div className="min-h-[250px]">
                 {profileTab === 'overview' ? (
                     <div className="grid grid-cols-3 gap-5 mb-6">
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
                     <div className="flex gap-5 h-[250px] overflow-hidden mb-6">
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
               className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border-2 border-cyan-400/50 text-cyan-400 py-6 rounded-[2rem] font-bold text-2xl flex items-center justify-center gap-4 active:scale-95 shadow-lg cursor-pointer transition-all mt-4"
             >
               {copyStatus ? <Check size={28}/> : <Copy size={28}/>}
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

