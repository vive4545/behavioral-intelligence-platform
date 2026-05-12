import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { InterviewSDK, Signal } from '@interviewiq/core';
import { io, Socket } from 'socket.io-client';

export interface ConfidenceScore {
  confidence: number;
  engagement: number;
  suspicionLevel: string;
  focusStability: number;
}

interface SessionContextValue {
  sdk: InterviewSDK;
  sessionId: string | null;
  status: string;
  score: ConfidenceScore | null;
  signals: Signal[];
  socket: Socket | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ sdk: InterviewSDK; children: React.ReactNode; serverUrl?: string }> = ({ 
  sdk, 
  children,
  serverUrl = 'http://localhost:3000'
}) => {
  const [sessionId, setSessionId] = useState<string | null>(sdk.getSessionId());
  const [status, setStatus] = useState<string>('IDLE');
  const [score, setScore] = useState<ConfidenceScore | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Sync with SDK session state
    const updateState = () => {
      setSessionId(sdk.getSessionId());
      setStatus(sdk.getSessionStatus());
    };

    updateState();

    // Subscribe to SDK signals
    const unsubscribe = sdk.getBus().subscribe((signal) => {
      setSignals(prev => [signal, ...prev].slice(0, 50));
      updateState(); // Status might have changed on signal emission
    });

    return () => {
      unsubscribe();
    };
  }, [sdk]);

  useEffect(() => {
    if (sessionId && serverUrl) {
      const token = sdk.getApiKey?.() || (sdk as any).config.apiKey;
      const newSocket = io(serverUrl, { 
        query: { sessionId, token } 
      });
      newSocket.on('connect', () => setSocket({...newSocket} as any));
      newSocket.on('disconnect', () => setSocket({...newSocket} as any));
      newSocket.on('snapshot', (data: ConfidenceScore) => {
        setScore(data);
      });
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    }
  }, [sessionId, serverUrl, sdk]);

  const value = useMemo(() => ({
    sdk,
    sessionId,
    status,
    score,
    signals,
    socket,
  }), [sdk, sessionId, status, score, signals, socket]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return {
    sdk: ctx.sdk,
    sessionId: ctx.sessionId,
    status: ctx.status,
    start: () => ctx.sdk.startSession(),
    end: () => ctx.sdk.endSession(),
    pause: () => ctx.sdk.pauseSession(),
    grantConsent: (trackers?: string[]) => ctx.sdk.grantConsent(trackers),
  };
};

export const useConfidenceScore = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useConfidenceScore must be used within SessionProvider');
  return ctx.score || { confidence: 1, engagement: 1, suspicionLevel: 'low', focusStability: 1 };
};

export const useSignals = (type?: string) => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSignals must be used within SessionProvider');
  return type ? ctx.signals.filter(s => s.type === type) : ctx.signals;
};

export const useTrackerStatus = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useTrackerStatus must be used within SessionProvider');
  return { attached: ctx.socket?.connected || false }; 
};
