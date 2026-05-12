import { z } from 'zod';

export enum SessionStatus {
  IDLE = 'IDLE',
  CONSENT_PENDING = 'CONSENT_PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export const SignalSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  sessionId: z.string(),
  payload: z.record(z.any()),
});

export type Signal = z.infer<typeof SignalSchema>;

export interface Transport {
  connect(sessionId: string, token?: string): Promise<void>;
  send(signals: Signal[]): Promise<void>;
  disconnect(): Promise<void>;
}

export interface SDKConfig {
  apiKey: string;
  transport?: Transport;
  debug?: boolean;
  batchInterval?: number;
  hooks?: {
    onSessionStart?: (sessionId: string) => void;
    onSessionEnd?: (sessionId: string) => void;
    onSignal?: (signal: Signal) => void;
  };
}

export interface Plugin {
  name: string;
  onInit?: (sdk: any) => void;
  onStart?: (sessionId: string) => void;
  onStop?: (sessionId: string) => void;
  getSignalSchema?: () => z.ZodObject<any>;
}
