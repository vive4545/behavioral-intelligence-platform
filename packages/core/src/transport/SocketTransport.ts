import { io, Socket } from 'socket.io-client';
import { Transport, Signal } from '../types';

export interface SocketTransportConfig {
  url: string;
  options?: any;
}

export class SocketTransport implements Transport {
  private socket: Socket | null = null;
  private config: SocketTransportConfig;

  constructor(config: SocketTransportConfig) {
    this.config = config;
  }

  async connect(sessionId: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        ...this.config.options,
        query: { sessionId, token },
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (err) => reject(err));
    });
  }

  async send(signals: Signal[]): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('signals', signals);
  }

  async disconnect(): Promise<void> {
    this.socket?.disconnect();
    this.socket = null;
  }
}
