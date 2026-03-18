// @ts-ignore
import bgmSfx from '../assets/sounds/bgm.mp3';
// @ts-ignore
import hoverSfx from '../assets/sounds/hover.mp3';
// @ts-ignore
import clickSfx from '../assets/sounds/click.mp3';
// @ts-ignore
import matchStartSfx from '../assets/sounds/match_start.mp3';
// @ts-ignore
import waitingSfx from '../assets/sounds/waiting.mp3';
// @ts-ignore
import successSfx from '../assets/sounds/success.mp3';
// @ts-ignore
import errorSfx from '../assets/sounds/error.mp3';

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

  const files: Record<string, string> = {
    bgm: bgmSfx,
    hover: hoverSfx,
    click: clickSfx,
    matchStart: matchStartSfx,
    waiting: waitingSfx,
    success: successSfx,
    error: errorSfx,
  };

  Object.entries(files).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    if (key === 'bgm' || key === 'waiting') {
      audio.loop = true;
      audio.volume = globalBgmVolume;
    } else {
      audio.volume = globalSfxVolume;
    }
    audioCache[key] = audio;
  });

  const unlockAudio = () => {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;
    Object.values(audioCache).forEach((audio) => {
      audio.muted = false;
    });

    if (currentMatchPhase === 'idle' && globalBgmEnabled) {
      audioCache['bgm']?.play().catch(() => {});
    } else if (currentMatchPhase === 'waiting' && globalBgmEnabled) {
      audioCache['waiting']?.play().catch(() => {});
    }

    window.removeEventListener('click', unlockAudio);
  };

  const resumeAmbientAudio = () => {
    if (!isAudioUnlocked || !globalBgmEnabled) return;
    if (currentMatchPhase === 'idle' || currentMatchPhase === 'setup_mode') {
      audioCache['waiting']?.pause();
      audioCache['bgm']?.play().catch(() => {});
      return;
    }
    if (currentMatchPhase === 'waiting_sync' || currentMatchPhase === 'waiting_ready') {
      audioCache['bgm']?.pause();
      audioCache['waiting']?.play().catch(() => {});
      return;
    }
    audioCache['bgm']?.pause();
    audioCache['waiting']?.pause();
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('focus', () => {
    Object.values(audioCache).forEach((a) => {
      a.muted = false;
    });
    resumeAmbientAudio();
  });
  window.addEventListener('blur', () => {
    Object.values(audioCache).forEach((a) => {
      a.muted = true;
    });
    audioCache['bgm']?.pause();
    audioCache['waiting']?.pause();
  });
}

export const applyAudioSettings = (params: {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
}) => {
  const { bgmEnabled, sfxEnabled, bgmVolume, sfxVolume } = params;

  globalBgmEnabled = bgmEnabled;
  globalSfxEnabled = sfxEnabled;
  globalBgmVolume = bgmVolume;
  globalSfxVolume = sfxVolume;

  if (audioCache['bgm']) {
    audioCache['bgm'].muted = !bgmEnabled;
    audioCache['bgm'].volume = bgmVolume;
  }
  if (audioCache['waiting']) {
    audioCache['waiting'].muted = !bgmEnabled;
    audioCache['waiting'].volume = bgmVolume;
  }

  ['hover', 'click', 'matchStart', 'success', 'error'].forEach((k) => {
    if (audioCache[k]) {
      audioCache[k].muted = !sfxEnabled;
      audioCache[k].volume = sfxVolume;
    }
  });
};

export const setMatchPhaseAudio = (matchPhase: string) => {
  currentMatchPhase = matchPhase;
  if (!isAudioUnlocked) return;

  if (matchPhase === 'idle' || matchPhase === 'setup_mode') {
    audioCache['waiting']?.pause();
    if (globalBgmEnabled) {
      audioCache['bgm']?.play().catch(() => {});
    }
  } else if (matchPhase === 'waiting_sync' || matchPhase === 'waiting_ready') {
    audioCache['bgm']?.pause();
    if (globalBgmEnabled) {
      audioCache['waiting'].currentTime = 0;
      audioCache['waiting']?.play().catch(() => {});
    }
  } else if (matchPhase === 'picking' || matchPhase === 'scoring') {
    audioCache['bgm']?.pause();
    audioCache['waiting']?.pause();
  }
};

export const playSFX = (type: string) => {
  if (!isAudioUnlocked || !audioCache[type]) return;
  if ((type === 'bgm' || type === 'waiting') && !globalBgmEnabled) return;
  if (type !== 'bgm' && type !== 'waiting' && !globalSfxEnabled) return;
  if (type !== 'bgm' && type !== 'waiting') {
    audioCache[type].currentTime = 0;
  }
  audioCache[type].play().catch(() => {});
};
