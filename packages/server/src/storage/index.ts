import { Signal } from '@interviewiq/core';

export interface ConfidenceSnapshot {
  sessionId: string;
  timestamp: number;
  confidence: number;
  engagement: number;
  suspicionLevel: 'low' | 'medium' | 'high';
  focusStability: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  metadata?: any;
}

export interface StorageAdapter {
  saveSignals(sessionId: string, signals: Signal[]): Promise<void>;
  saveSnapshot(snapshot: ConfidenceSnapshot): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  createSession(session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getSignals(sessionId: string, options?: { limit?: number; offset?: number }): Promise<Signal[]>;
}
