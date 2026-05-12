import { Signal } from '@interviewiq/core';
import { ConfidenceSnapshot } from '../storage';

export interface ScoringWeights {
  mouse: number;
  keyboard: number;
  face: number;
  voice: number;
  integrity: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  mouse: 0.2,
  keyboard: 0.25,
  face: 0.3,
  voice: 0.15,
  integrity: 0.1,
};

export class ScoringEngine {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  calculate(sessionId: string, signals: Signal[]): ConfidenceSnapshot {
    let engagement = 0.8;
    let suspicion: 'low' | 'medium' | 'high' = 'low';
    
    // Analyze Integrity Signals
    const integritySignals = signals.filter(s => s.type.startsWith('integrity:'));
    if (integritySignals.some(s => s.payload.severity === 'high' || s.type === 'integrity:tab_switch')) {
      suspicion = 'high';
      engagement -= 0.5;
    } else if (integritySignals.length > 0) {
      suspicion = 'medium';
      engagement -= 0.2;
    }

    const mouseSignals = signals.filter(s => s.type.startsWith('mouse:'));
    const keyboardSignals = signals.filter(s => s.type.startsWith('keyboard:'));

    // Apply weights to signals
    const confidence = (engagement * 0.7) + (mouseSignals.length > 0 ? 0.1 : 0) + (keyboardSignals.length > 0 ? 0.2 : 0);

    return {
      sessionId,
      timestamp: Date.now(),
      confidence: Math.min(1, Math.max(0, confidence)),
      engagement: Math.min(1, Math.max(0, engagement)),
      suspicionLevel: suspicion,
      focusStability: 0.95, 
    };
  }
}
