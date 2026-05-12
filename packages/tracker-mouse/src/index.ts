import { Plugin } from '@interviewiq/core';

export interface MouseTrackerConfig {
  throttleMs?: number;
  idleThresholdMs?: number;
  rageClickWindow?: number;
  rageClickCount?: number;
  hesitationThresholdMs?: number;
}

export const mouseTracker = (config: MouseTrackerConfig = {}): Plugin => {
  const {
    throttleMs = 50,
    idleThresholdMs = 5000,
    rageClickWindow = 1000,
    rageClickCount = 3,
    hesitationThresholdMs = 1000,
  } = config;

  let sdk: any;
  let lastMove = 0;
  let idleTimer: any;
  let clicks: number[] = [];
  let mouseDownTime = 0;

  const onMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    if (now - lastMove < throttleMs) return;
    lastMove = now;

    sdk?.emit('mouse:move', { x: e.clientX, y: e.clientY });
    resetIdleTimer();
  };

  const onMouseDown = () => {
    mouseDownTime = Date.now();
  };

  const onMouseUp = () => {
    const now = Date.now();
    const duration = now - mouseDownTime;
    if (duration > hesitationThresholdMs) {
      sdk?.emit('mouse:hesitation', { duration });
    }

    clicks.push(now);
    clicks = clicks.filter(t => now - t < rageClickWindow);
    if (clicks.length >= rageClickCount) {
      sdk?.emit('mouse:rage_click', { count: clicks.length });
      clicks = [];
    }
  };

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      sdk?.emit('mouse:idle', { duration: idleThresholdMs });
    }, idleThresholdMs);
  };

  return {
    name: 'tracker-mouse',
    onInit: (s: any) => {
      sdk = s;
    },
    onStart: () => {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);
      resetIdleTimer();
    },
    onStop: () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      clearTimeout(idleTimer);
    },
  };
};
