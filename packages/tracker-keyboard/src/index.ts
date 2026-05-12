import { Plugin } from '@interviewiq/core';

export interface KeyboardTrackerConfig {
  target?: HTMLElement | Document;
  wpmWindowMs?: number;
  pauseThresholdMs?: number;
  backspaceWindowSize?: number;
}

export const keyboardTracker = (config: KeyboardTrackerConfig = {}): Plugin => {
  const {
    target = document,
    wpmWindowMs = 60000,
    pauseThresholdMs = 2000,
    backspaceWindowSize = 10,
  } = config;

  let sdk: any;
  let keyTimes: number[] = [];
  let lastKeyTime = 0;
  let backspaceHistory: boolean[] = [];

  const onKeyDown = (e: KeyboardEvent) => {
    const now = Date.now();
    
    // Pause burst detection
    if (lastKeyTime > 0 && now - lastKeyTime > pauseThresholdMs) {
      sdk?.emit('keyboard:pause_burst', { duration: now - lastKeyTime });
    }
    lastKeyTime = now;

    // WPM calculation
    keyTimes.push(now);
    keyTimes = keyTimes.filter(t => now - t < wpmWindowMs);
    const wpm = (keyTimes.length / 5) / (wpmWindowMs / 60000);
    sdk?.emit('keyboard:wpm_update', { wpm });

    // Backspace ratio
    backspaceHistory.push(e.key === 'Backspace');
    if (backspaceHistory.length > backspaceWindowSize) backspaceHistory.shift();
    const backspaceCount = backspaceHistory.filter(b => b).length;
    if (backspaceCount / backspaceWindowSize > 0.5) {
      sdk?.emit('keyboard:backspace_spike', { ratio: backspaceCount / backspaceWindowSize });
    }
  };

  const onPaste = () => {
    sdk?.emit('keyboard:paste_detected', { timestamp: Date.now() });
  };

  return {
    name: 'tracker-keyboard',
    onInit: (s: any) => {
      sdk = s;
    },
    onStart: () => {
      target.addEventListener('keydown', onKeyDown as EventListener);
      target.addEventListener('paste', onPaste as EventListener);
    },
    onStop: () => {
      target.removeEventListener('keydown', onKeyDown as EventListener);
      target.removeEventListener('paste', onPaste as EventListener);
    },
  };
};
