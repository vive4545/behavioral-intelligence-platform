import { SessionStatus } from '../types';

export class SessionManager {
  private sessionId: string | null = null;
  private status: SessionStatus = SessionStatus.IDLE;
  private startTime: number | null = null;

  start(): string {
    if (this.status !== SessionStatus.IDLE) return this.sessionId!;
    
    this.sessionId = crypto.randomUUID();
    this.status = SessionStatus.CONSENT_PENDING;
    this.startTime = Date.now();
    return this.sessionId;
  }

  grantConsent() {
    if (this.status === SessionStatus.CONSENT_PENDING) {
      this.status = SessionStatus.ACTIVE;
    }
  }

  pause() {
    if (this.status === SessionStatus.ACTIVE) {
      this.status = SessionStatus.PAUSED;
    }
  }

  resume() {
    if (this.status === SessionStatus.PAUSED) {
      this.status = SessionStatus.ACTIVE;
    }
  }

  end() {
    this.status = SessionStatus.ENDED;
    const finalId = this.sessionId;
    this.sessionId = null;
    return finalId;
  }

  getSessionId() {
    return this.sessionId;
  }

  getStatus() {
    return this.status;
  }
}
