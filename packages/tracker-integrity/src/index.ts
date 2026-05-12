import { Plugin } from '@interviewiq/core';

export interface IntegrityTrackerConfig {
  pasteCountWindow?: number;
  pasteCountThreshold?: number;
  inactiveThresholdMs?: number;
}

export const integrityTracker = (config: IntegrityTrackerConfig = {}): Plugin => {
  const {
    pasteCountWindow = 60000,
    pasteCountThreshold = 3,
    inactiveThresholdMs = 30000,
  } = config;

  let sdk: any;
  let pastes: number[] = [];
  let inactiveTimer: any;

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      sdk?.emit('integrity:tab_switch', { severity: 'medium' });
    }
  };

  const onBlur = () => {
    sdk?.emit('integrity:window_blur', { severity: 'high' });
    startInactiveTimer();
  };

  const onFocus = () => {
    clearTimeout(inactiveTimer);
  };

  const onPaste = () => {
    const now = Date.now();
    pastes.push(now);
    pastes = pastes.filter(t => now - t < pasteCountWindow);
    
    if (pastes.length >= pasteCountThreshold) {
      sdk?.emit('integrity:paste_burst', { 
        count: pastes.length,
        severity: 'high'
      });
    }
  };

  const startInactiveTimer = () => {
    clearTimeout(inactiveTimer);
    inactiveTimer = setTimeout(() => {
      sdk?.emit('integrity:inactive_period', { 
        duration: inactiveThresholdMs,
        severity: 'medium'
      });
    }, inactiveThresholdMs);
  };

  return {
    name: 'tracker-integrity',
    onInit: (s: any) => {
      sdk = s;
    },
    onStart: () => {
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      document.addEventListener('paste', onPaste);
    },
    onStop: () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('paste', onPaste);
      clearTimeout(inactiveTimer);
    },
  };
};
