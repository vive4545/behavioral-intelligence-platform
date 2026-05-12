import { Transport, Signal } from '../types';

export interface HttpTransportConfig {
  url: string;
  headers?: Record<string, string>;
}

export class HttpTransport implements Transport {
  private config: HttpTransportConfig;
  private sessionId: string | null = null;
  private token: string | null = null;

  constructor(config: HttpTransportConfig) {
    this.config = config;
  }

  async connect(sessionId: string, token?: string): Promise<void> {
    this.sessionId = sessionId;
    this.token = token || null;
  }

  async send(signals: Signal[]): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');

    const response = await fetch(`${this.config.url}/sessions/${this.sessionId}/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...this.config.headers,
      },
      body: JSON.stringify({ signals }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.statusText}`);
    }
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
  }
}
