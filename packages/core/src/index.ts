export * from './types';
export * from './transport/SocketTransport';
export * from './transport/HttpTransport';
import { SDKConfig, Plugin, Signal, SessionStatus } from './types';
import { SessionManager } from './session/Manager';
import { EventBus } from './events/Bus';

export class ConsentError extends Error {
  constructor() {
    super('Tracking consent has not been granted for this session.');
    this.name = 'ConsentError';
  }
}

export class InterviewSDK {
  private config: SDKConfig;
  private session: SessionManager;
  private bus: EventBus;
  private plugins: Map<string, Plugin> = new Map();
  private signalQueue: Signal[] = [];
  private batchTimer: any;
  private MAX_QUEUE_SIZE = 500;

  constructor(config: SDKConfig) {
    this.config = config;
    this.session = new SessionManager();
    this.bus = new EventBus();

    if (config.hooks?.onSignal) {
      this.bus.subscribe(config.hooks.onSignal);
    }

    this.bus.subscribe((signal) => {
      this.enqueueSignal(signal);
    });
  }

  private enqueueSignal(signal: Signal) {
    if (this.signalQueue.length >= this.MAX_QUEUE_SIZE) {
      this.signalQueue.shift(); // Drop oldest
    }
    this.signalQueue.push(signal);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushQueue(), this.config.batchInterval || 500);
    }
  }

  private async flushQueue() {
    this.batchTimer = null;
    if (this.signalQueue.length === 0) return;

    const signals = [...this.signalQueue];
    this.signalQueue = [];

    if (this.config.transport) {
      try {
        await this.config.transport.send(signals);
      } catch (err) {
        if (this.config.debug) {
          console.error('[InterviewIQ] Transport send failed, re-queuing:', err);
        }
        // Put back at start of queue if failed
        this.signalQueue = [...signals, ...this.signalQueue].slice(0, this.MAX_QUEUE_SIZE);
      }
    }
  }

  use(plugin: Plugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[InterviewIQ] Plugin ${plugin.name} is already registered.`);
      return this;
    }

    this.plugins.set(plugin.name, plugin);
    plugin.onInit?.(this);
    return this;
  }

  grantConsent(trackers?: string[]) {
    this.session.grantConsent();
    const sessionId = this.session.getSessionId();
    if (sessionId) {
      this.emit('core:consent_granted', { trackers });
      this.plugins.forEach((p) => p.onStart?.(sessionId));
    }
  }

  async startSession() {
    const sessionId = this.session.start();
    
    if (this.config.transport) {
      await this.config.transport.connect(sessionId, this.config.apiKey);
    }

    this.emit('core:session_started', { sessionId });
    this.config.hooks?.onSessionStart?.(sessionId);
    return sessionId;
  }

  pauseSession() {
    this.session.pause();
    const sessionId = this.session.getSessionId();
    if (sessionId) {
      this.plugins.forEach((p) => p.onStop?.(sessionId));
    }
  }

  async endSession() {
    const sessionId = this.session.end();
    if (sessionId) {
      this.plugins.forEach((p) => p.onStop?.(sessionId));
      
      if (this.config.transport) {
        await this.flushQueue();
        await this.config.transport.disconnect();
      }

      this.emit('core:session_ended', { sessionId });
      this.config.hooks?.onSessionEnd?.(sessionId);
    }
    return sessionId;
  }

  emit(type: string, payload: any) {
    const sessionId = this.session.getSessionId();
    if (!sessionId) {
      if (this.config.debug) {
        console.warn('[InterviewIQ] Cannot emit signal without an active session.');
      }
      return;
    }

    if (this.session.getStatus() !== 'ACTIVE' && type !== 'core:consent_granted') {
      throw new ConsentError();
    }

    this.bus.emit({
      type,
      timestamp: Date.now(),
      sessionId,
      payload,
    });
  }

  getBus() {
    return this.bus;
  }

  getSessionId() {
    return this.session.getSessionId();
  }

  getSessionStatus() {
    return this.session.getStatus();
  }

  getApiKey() {
    return this.config.apiKey;
  }
}

export { SessionStatus };
